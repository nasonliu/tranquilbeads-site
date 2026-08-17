-- Keep the created order id in a local variable.  The prior function wrote
-- through the RETURNS TABLE output variable named `order_id`; in production
-- that could insert the reservation successfully yet return no row to the
-- application.  A failed response would then strand a valid stock hold.
CREATE OR REPLACE FUNCTION retail_create_checkout_v2(p_request UUID,p_items JSONB,p_checkout JSONB,p_expected_total BIGINT)
RETURNS TABLE(order_id BIGINT,paypal_order_id TEXT,currency CHAR(3),subtotal_minor BIGINT,shipping_minor BIGINT,tax_minor BIGINT,discount_minor BIGINT,amount_minor BIGINT,shipping_method TEXT,items_snapshot JSONB,checkout_shipping JSONB,status TEXT)
LANGUAGE plpgsql AS $$
DECLARE existing retail_orders%ROWTYPE; q RECORD; r RECORD; locked_zone retail_shipping_zones%ROWTYPE; requested JSONB; prior_requested JSONB; actual_count INT := 0; locked_shipping BIGINT; locked_tax BIGINT; created_order_id BIGINT;
BEGIN
  PERFORM retail_release_expired_reservations();
  SELECT * INTO q FROM retail_quote_checkout(p_items,p_checkout);
  IF p_expected_total IS NULL OR p_expected_total<>q.total_minor THEN RAISE EXCEPTION 'quote changed'; END IF;
  SELECT jsonb_agg(jsonb_build_object('sku',x->>'sku','quantity',(x->>'quantity')::BIGINT) ORDER BY x->>'sku') INTO requested FROM jsonb_array_elements(p_items) x;
  SELECT * INTO existing FROM retail_orders WHERE client_request_id=p_request FOR UPDATE;
  IF FOUND THEN
    SELECT jsonb_agg(jsonb_build_object('sku',x->>'sku','quantity',(x->>'quantity')::BIGINT) ORDER BY x->>'sku') INTO prior_requested FROM jsonb_array_elements(existing.items_snapshot) x;
    IF prior_requested<>requested OR existing.checkout_shipping<>q.shipping_snapshot OR existing.checkout_email<>lower(trim(p_checkout->>'email')) OR existing.amount_minor<>q.total_minor THEN RAISE EXCEPTION 'idempotency conflict'; END IF;
    IF existing.status='expired' THEN RAISE EXCEPTION 'checkout_expired'; END IF;
    RETURN QUERY SELECT existing.id,existing.paypal_order_id,existing.currency,existing.subtotal_minor,existing.shipping_minor,existing.tax_minor,existing.discount_minor,existing.amount_minor,existing.shipping_method,existing.items_snapshot,existing.checkout_shipping,existing.status;
    RETURN;
  END IF;
  FOR r IN SELECT p.id,p.sku,b.on_hand,b.reserved,(x->>'quantity')::BIGINT quantity FROM jsonb_array_elements(p_items) x JOIN retail_products p ON p.sku=x->>'sku' JOIN retail_inventory_balances b ON b.product_id=p.id ORDER BY p.sku FOR UPDATE OF p,b LOOP
    actual_count:=actual_count+1;
    IF r.on_hand-r.reserved<r.quantity THEN RAISE EXCEPTION 'unavailable sku'; END IF;
  END LOOP;
  IF actual_count<>jsonb_array_length(p_items) THEN RAISE EXCEPTION 'unknown sku'; END IF;
  actual_count:=0;
  FOR r IN SELECT p.sku,h.amount_minor
    FROM jsonb_array_elements(p_items) x
    JOIN retail_products p ON p.sku=x->>'sku' AND p.status='published'
    JOIN LATERAL(SELECT ph.amount_minor FROM retail_price_history ph WHERE ph.product_id=p.id AND ph.active ORDER BY ph.created_at DESC LIMIT 1) h ON true
    ORDER BY p.sku
  LOOP
    actual_count:=actual_count+1;
    IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(q.items_snapshot) quoted WHERE quoted->>'sku'=r.sku AND (quoted->>'unitAmountMinor')::BIGINT=r.amount_minor) THEN RAISE EXCEPTION 'quote changed'; END IF;
  END LOOP;
  IF actual_count<>jsonb_array_length(p_items) THEN RAISE EXCEPTION 'quote changed'; END IF;
  SELECT * INTO locked_zone FROM retail_shipping_zones z WHERE z.country=q.shipping_snapshot->>'country' FOR UPDATE;
  IF NOT FOUND OR NOT locked_zone.active THEN RAISE EXCEPTION 'quote changed'; END IF;
  locked_shipping:=CASE WHEN locked_zone.free_shipping_threshold_minor IS NOT NULL AND q.subtotal_minor>=locked_zone.free_shipping_threshold_minor THEN 0 ELSE locked_zone.shipping_minor END;
  locked_tax:=((q.subtotal_minor+locked_shipping)*locked_zone.tax_rate_bps+5000)/10000;
  IF locked_shipping<>q.shipping_minor OR locked_tax<>q.tax_minor OR q.total_minor<>q.subtotal_minor+locked_shipping+locked_tax-q.discount_minor THEN RAISE EXCEPTION 'quote changed'; END IF;
  INSERT INTO retail_orders(client_request_id,currency,subtotal_minor,shipping_minor,tax_minor,discount_minor,amount_minor,shipping_method,items_snapshot,checkout_email,checkout_shipping,terms_version,terms_accepted_at,quote_hash,status)
    VALUES(p_request,'USD',q.subtotal_minor,q.shipping_minor,q.tax_minor,q.discount_minor,q.total_minor,q.shipping_method,q.items_snapshot,lower(trim(p_checkout->>'email')),q.shipping_snapshot,p_checkout->>'termsVersion',now(),q.quote_hash,'pending') RETURNING id INTO created_order_id;
  FOR r IN SELECT p.id,p.sku,(x->>'quantity')::BIGINT quantity FROM jsonb_array_elements(p_items) x JOIN retail_products p ON p.sku=x->>'sku' ORDER BY p.sku LOOP
    UPDATE retail_inventory_balances SET reserved=reserved+r.quantity,updated_at=now() WHERE product_id=r.id AND on_hand-reserved>=r.quantity;
    IF NOT FOUND THEN RAISE EXCEPTION 'inventory changed during checkout'; END IF;
    INSERT INTO retail_inventory_reservations(order_id,request_id,product_id,quantity,status,expires_at,idempotency_key) VALUES(created_order_id,p_request,r.id,r.quantity,'active',now()+interval '15 minutes',md5(p_request::text||':'||r.sku)::uuid);
    INSERT INTO retail_inventory_ledger(product_id,delta_reserved,reason,idempotency_key) VALUES(r.id,r.quantity,'checkout_reservation',md5('reserve:'||p_request::text||':'||r.sku)::uuid);
  END LOOP;
  RETURN QUERY SELECT o.id,o.paypal_order_id,o.currency,o.subtotal_minor,o.shipping_minor,o.tax_minor,o.discount_minor,o.amount_minor,o.shipping_method,o.items_snapshot,o.checkout_shipping,o.status FROM retail_orders o WHERE o.id=created_order_id;
END $$;
