-- Scoped promotions discount only matching order lines. The locked re-quote
-- emits the same allocation that is persisted below.
CREATE OR REPLACE FUNCTION retail_promotion_line_allocation(
  p_promotion retail_promotions, p_shipping BIGINT, p_items JSONB
) RETURNS JSONB LANGUAGE sql STABLE AS $$
  WITH lines AS (
    SELECT x->>'variantSku' AS sku,((x->>'quantity')::BIGINT*(x->>'unitAmountMinor')::BIGINT) AS line_subtotal
    FROM jsonb_array_elements(p_items) x
  ), scoped AS (
    SELECT l.*,COALESCE((p_promotion.scope->>'all')::BOOLEAN,false) OR NOT (p_promotion.scope ? 'variantSkus')
      OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(COALESCE(p_promotion.scope->'variantSkus','[]'::jsonb)) s WHERE s=l.sku) AS eligible FROM lines l
  ), totals AS (
    SELECT COALESCE(sum(line_subtotal),0)::BIGINT AS cart_subtotal,
      COALESCE(sum(line_subtotal) FILTER(WHERE eligible),0)::BIGINT AS eligible_subtotal
    FROM scoped
  ),
  discount AS (
    SELECT cart_subtotal,eligible_subtotal,
      CASE WHEN p_promotion IS NULL OR NOT p_promotion.active OR eligible_subtotal=0 OR cart_subtotal<p_promotion.minimum_subtotal_minor OR (p_promotion.starts_at IS NOT NULL AND p_promotion.starts_at>now()) OR (p_promotion.ends_at IS NOT NULL AND p_promotion.ends_at<=now()) THEN 0
        WHEN p_promotion.kind='percent' THEN LEAST(eligible_subtotal,(eligible_subtotal*p_promotion.amount+5000)/10000)
        WHEN p_promotion.kind='fixed' THEN LEAST(eligible_subtotal,p_promotion.amount)
        WHEN p_promotion.kind='free_shipping' THEN GREATEST(p_shipping,0) ELSE 0 END AS total_discount,
      CASE WHEN p_promotion IS NULL OR p_promotion.kind='free_shipping' OR NOT p_promotion.active OR eligible_subtotal=0 OR cart_subtotal<p_promotion.minimum_subtotal_minor OR (p_promotion.starts_at IS NOT NULL AND p_promotion.starts_at>now()) OR (p_promotion.ends_at IS NOT NULL AND p_promotion.ends_at<=now()) THEN 0
        WHEN p_promotion.kind='percent' THEN LEAST(eligible_subtotal,(eligible_subtotal*p_promotion.amount+5000)/10000)
        WHEN p_promotion.kind='fixed' THEN LEAST(eligible_subtotal,p_promotion.amount) ELSE 0 END AS product_discount FROM totals
  ), bases AS (
    SELECT s.sku,s.eligible,d.eligible_subtotal,d.total_discount,d.product_discount,
      CASE WHEN s.eligible AND d.eligible_subtotal>0 THEN floor((d.product_discount::numeric*s.line_subtotal)/d.eligible_subtotal)::BIGINT ELSE 0 END AS base_discount,
      CASE WHEN s.eligible AND d.eligible_subtotal>0 THEN ((d.product_discount::numeric*s.line_subtotal)/d.eligible_subtotal)-floor((d.product_discount::numeric*s.line_subtotal)/d.eligible_subtotal) ELSE 0 END AS remainder
    FROM scoped s CROSS JOIN discount d
  ), allocated AS (
    SELECT *,base_discount+CASE WHEN row_number() OVER(ORDER BY remainder DESC,sku ASC)<=product_discount-sum(base_discount) OVER() THEN 1 ELSE 0 END AS line_discount FROM bases
  ) SELECT jsonb_build_object('eligibleSubtotalMinor',COALESCE(max(eligible_subtotal),0),'productDiscountMinor',COALESCE(max(product_discount),0),'shippingDiscountMinor',COALESCE(max(total_discount-product_discount),0),'discountMinor',COALESCE(max(total_discount),0),'lineDiscounts',COALESCE(jsonb_object_agg(sku,line_discount),'{}'::jsonb)) FROM allocated;
$$;

DO $$
DECLARE definition TEXT;
BEGIN
  SELECT pg_get_functiondef('retail_quote_checkout_v3(jsonb,jsonb,text)'::regprocedure) INTO definition;
  IF definition IS NULL OR position('discount:=retail_promotion_discount(promo,subtotal,shipping,sku_set);' IN definition)=0 THEN RAISE EXCEPTION 'retail_quote_checkout_v3 source did not match allocation patch'; END IF;
  definition:=replace(definition,'sku_set JSONB;','sku_set JSONB; allocation JSONB:=''{}''::jsonb;');
  definition:=replace(definition,'discount:=retail_promotion_discount(promo,subtotal,shipping,sku_set);','allocation:=retail_promotion_line_allocation(promo,shipping,item); discount:=COALESCE((allocation->>''discountMinor'')::bigint,0);');
  definition:=replace(definition,'  tax:=((subtotal+shipping-discount)*z.tax_rate_bps+5000)/10000;',E'  item:=(SELECT jsonb_agg(x || jsonb_build_object(''discountMinor'',COALESCE((allocation->''lineDiscounts''->>(x->>''variantSku''))::bigint,0)) ORDER BY x->>''variantSku'') FROM jsonb_array_elements(item) x);\n  tax:=((subtotal+shipping-discount)*z.tax_rate_bps+5000)/10000;');
  IF position('retail_promotion_line_allocation' IN definition)=0 OR position('discountMinor' IN definition)=0 THEN RAISE EXCEPTION 'retail_quote_checkout_v3 allocation patch did not apply'; END IF;
  EXECUTE definition;
END $$;

DO $$
DECLARE definition TEXT;
BEGIN
  SELECT pg_get_functiondef('retail_create_checkout_v3(uuid,jsonb,jsonb,bigint,text)'::regprocedure) INTO definition;
  IF definition IS NULL OR position('checkout_locale:=lower' IN definition)=0 THEN RAISE EXCEPTION 'retail_create_checkout_v3 locale contract missing'; END IF;
  definition:=replace(definition,'option_values,quantity,unit_amount_minor)','option_values,quantity,unit_amount_minor,discount_minor)');
  definition:=replace(definition,'(x->>''quantity'')::bigint,(x->>''unitAmountMinor'')::bigint FROM jsonb_array_elements(q.items_snapshot) x JOIN retail_product_variants v ON v.sku=x->>''variantSku'';','(x->>''quantity'')::bigint,(x->>''unitAmountMinor'')::bigint,COALESCE((x->>''discountMinor'')::bigint,0) FROM jsonb_array_elements(q.items_snapshot) x JOIN retail_product_variants v ON v.sku=x->>''variantSku'';');
  IF position('unit_amount_minor,discount_minor)' IN definition)=0 OR position('discountMinor' IN definition)=0 THEN RAISE EXCEPTION 'retail_create_checkout_v3 allocation patch did not apply'; END IF;
  EXECUTE definition;
END $$;
