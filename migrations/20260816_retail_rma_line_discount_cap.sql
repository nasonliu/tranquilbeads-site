-- Order-line discounts became authoritative with the scoped-promotion
-- allocation migration.  Use them for new RMAs, while retaining the legacy
-- order-level allocation for orders created before that persistence existed.
CREATE OR REPLACE FUNCTION retail_return_refund_cap(p_return UUID)
RETURNS TABLE(cap_minor BIGINT, calculation JSONB) LANGUAGE plpgsql STABLE AS $$
DECLARE
  order_row retail_orders%ROWTYPE;
  returned_subtotal NUMERIC := 0;
  returned_line_discount NUMERIC := 0;
  order_line_discount_total NUMERIC := 0;
  product_discount NUMERIC := 0;
  allocated_discount NUMERIC := 0;
  net_returned NUMERIC := 0;
  allocated_tax NUMERIC := 0;
  taxable_merchandise NUMERIC := 0;
  free_shipping BOOLEAN := false;
  line_allocation BOOLEAN := false;
BEGIN
  SELECT ro.* INTO order_row
    FROM retail_returns rr JOIN retail_orders ro ON ro.id=rr.order_id
    WHERE rr.id=p_return;
  IF NOT FOUND THEN RAISE EXCEPTION 'return not found'; END IF;

  SELECT COALESCE(sum(rl.quantity::numeric * ol.unit_amount_minor::numeric),0),
         COALESCE(sum(ceil(rl.quantity::numeric * ol.discount_minor::numeric / NULLIF(ol.quantity,0))),0)
    INTO returned_subtotal,returned_line_discount
    FROM retail_return_lines rl JOIN retail_order_lines ol ON ol.id=rl.order_line_id
    WHERE rl.return_id=p_return;
  SELECT COALESCE(sum(ol.discount_minor),0),
         COALESCE(sum(ol.quantity::numeric * ol.unit_amount_minor::numeric - ol.discount_minor::numeric),0)
    INTO order_line_discount_total,taxable_merchandise
    FROM retail_order_lines ol WHERE ol.order_id=order_row.id;

  SELECT EXISTS(
    SELECT 1 FROM retail_promotion_redemptions pr JOIN retail_promotions p ON p.id=pr.promotion_id
    WHERE pr.order_id=order_row.id AND p.kind='free_shipping'
  ) INTO free_shipping;
  product_discount := CASE WHEN free_shipping THEN 0 ELSE LEAST(GREATEST(order_row.discount_minor,0),GREATEST(order_row.subtotal_minor,0)) END;
  -- All-zero line discounts identify pre-allocation orders.  New scoped orders
  -- may legitimately have zero-discount lines, so only the order total decides.
  line_allocation := NOT free_shipping AND product_discount > 0
    AND order_line_discount_total = product_discount;
  IF line_allocation THEN
    -- Ceiling prevents a sequence of partial RMAs from refunding more than the
    -- immutable net amount of a discounted line when its discount is indivisible.
    allocated_discount := LEAST(returned_subtotal,returned_line_discount);
    net_returned := GREATEST(returned_subtotal-allocated_discount,0);
    IF taxable_merchandise > 0 THEN
      allocated_tax := floor((net_returned * GREATEST(order_row.tax_minor,0)) / taxable_merchandise);
    END IF;
  ELSE
    IF order_row.subtotal_minor > 0 THEN
      allocated_discount := LEAST(returned_subtotal,(returned_subtotal * product_discount) / order_row.subtotal_minor);
    END IF;
    net_returned := GREATEST(returned_subtotal-allocated_discount,0);
    taxable_merchandise := GREATEST(order_row.subtotal_minor-product_discount,0);
    IF taxable_merchandise > 0 THEN
      allocated_tax := (net_returned * GREATEST(order_row.tax_minor,0)) / taxable_merchandise;
    END IF;
  END IF;
  IF net_returned + allocated_tax > 9223372036854775807 THEN RAISE EXCEPTION 'return refund cap overflow'; END IF;
  cap_minor := (net_returned + allocated_tax)::BIGINT;
  calculation := jsonb_build_object(
    'returnedSubtotalMinor',returned_subtotal,'orderSubtotalMinor',order_row.subtotal_minor,
    'orderDiscountMinor',order_row.discount_minor,'productDiscountMinor',product_discount,
    'allocatedDiscountMinor',allocated_discount,'orderTaxMinor',order_row.tax_minor,
    'allocatedTaxMinor',allocated_tax,'taxableMerchandiseMinor',taxable_merchandise,
    'allocationSource',CASE WHEN line_allocation THEN 'order_lines' ELSE 'order_proportional_legacy' END,
    'shippingRefunded',false,'freeShippingPromotion',free_shipping
  );
  RETURN NEXT;
END $$;
