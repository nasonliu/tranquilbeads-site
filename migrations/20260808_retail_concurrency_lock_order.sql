-- Retail V3 lock ordering: every inventory mutation takes variant state before
-- its compatibility product mirror.  Do not replace this with 40P01 retries:
-- the ordering is the correctness boundary shared by checkout, lifecycle,
-- expiry, cancellation, inventory adjustment, and sellable RMA restock.

CREATE OR REPLACE FUNCTION retail_create_checkout_v3(p_request UUID,p_items JSONB,p_checkout JSONB,p_expected_total BIGINT,p_promo_code TEXT DEFAULT NULL)
RETURNS TABLE(order_id BIGINT,paypal_order_id TEXT,currency CHAR(3),subtotal_minor BIGINT,shipping_minor BIGINT,tax_minor BIGINT,discount_minor BIGINT,amount_minor BIGINT,shipping_method TEXT,items_snapshot JSONB,checkout_shipping JSONB,status TEXT)
LANGUAGE plpgsql AS $$
DECLARE existing retail_orders%ROWTYPE; q RECORD; r RECORD; promo retail_promotions%ROWTYPE; requested JSONB; prior_requested JSONB; actual_count INT:=0; created_order_id BIGINT; normalized_code TEXT:=NULLIF(upper(trim(COALESCE(p_promo_code,''))),''); promo_count BIGINT; customer_count BIGINT; grouped_items JSONB; has_promotion BOOLEAN:=false;
BEGIN
  PERFORM retail_release_expired_reservations();
  SELECT * INTO q FROM retail_quote_checkout_v3(p_items,p_checkout,p_promo_code);
  IF p_expected_total IS NULL OR p_expected_total<>q.total_minor THEN RAISE EXCEPTION 'quote changed'; END IF;
  SELECT jsonb_agg(jsonb_build_object('variantSku',COALESCE(x->>'variantSku',x->>'sku'),'quantity',(x->>'quantity')::bigint) ORDER BY COALESCE(x->>'variantSku',x->>'sku')) INTO requested FROM jsonb_array_elements(p_items) x;
  SELECT * INTO existing FROM retail_orders WHERE client_request_id=p_request FOR UPDATE;
  IF FOUND THEN
    SELECT jsonb_agg(jsonb_build_object('variantSku',COALESCE(x->>'variantSku',x->>'sku'),'quantity',(x->>'quantity')::bigint) ORDER BY COALESCE(x->>'variantSku',x->>'sku')) INTO prior_requested FROM retail_order_lines l WHERE l.order_id=existing.id;
    IF prior_requested IS DISTINCT FROM requested OR existing.checkout_shipping<>q.shipping_snapshot OR existing.checkout_email<>lower(trim(p_checkout->>'email')) OR existing.amount_minor<>q.total_minor THEN RAISE EXCEPTION 'idempotency conflict'; END IF;
    IF existing.status='expired' THEN RAISE EXCEPTION 'checkout_expired'; END IF;
    RETURN QUERY SELECT existing.id,existing.paypal_order_id,existing.currency,existing.subtotal_minor,existing.shipping_minor,existing.tax_minor,existing.discount_minor,existing.amount_minor,existing.shipping_method,existing.items_snapshot,existing.checkout_shipping,existing.status; RETURN;
  END IF;

  -- Do not combine these joins in one FOR UPDATE.  PostgreSQL may choose a
  -- join order; the two explicit loops make the global order observable.
  FOR r IN SELECT v.id variant_id,v.sku variant_sku,v.product_id,vb.on_hand,vb.reserved,(x->>'quantity')::bigint quantity
    FROM jsonb_array_elements(p_items) x JOIN retail_product_variants v ON v.sku=COALESCE(x->>'variantSku',x->>'sku') JOIN retail_variant_inventory_balances vb ON vb.variant_id=v.id
    ORDER BY v.id FOR UPDATE OF v,vb
  LOOP
    actual_count:=actual_count+1;
    IF r.on_hand-r.reserved<r.quantity THEN RAISE EXCEPTION 'unavailable sku'; END IF;
  END LOOP;
  IF actual_count<>jsonb_array_length(p_items) THEN RAISE EXCEPTION 'unknown sku'; END IF;
  actual_count:=0;
  FOR r IN SELECT p.id,p.sku,pb.on_hand,pb.reserved,w.quantity
    FROM (SELECT v.product_id,sum((x->>'quantity')::bigint) quantity FROM jsonb_array_elements(p_items) x JOIN retail_product_variants v ON v.sku=COALESCE(x->>'variantSku',x->>'sku') GROUP BY v.product_id) w
    JOIN retail_products p ON p.id=w.product_id JOIN retail_inventory_balances pb ON pb.product_id=p.id
    ORDER BY p.id FOR UPDATE OF p,pb
  LOOP
    actual_count:=actual_count+1;
    IF r.on_hand-r.reserved<r.quantity THEN RAISE EXCEPTION 'unavailable sku'; END IF;
  END LOOP;
  IF actual_count<>(SELECT count(DISTINCT v.product_id) FROM jsonb_array_elements(p_items) x JOIN retail_product_variants v ON v.sku=COALESCE(x->>'variantSku',x->>'sku')) THEN RAISE EXCEPTION 'unknown sku'; END IF;
  SELECT * INTO q FROM retail_quote_checkout_v3(p_items,p_checkout,p_promo_code);
  IF p_expected_total<>q.total_minor THEN RAISE EXCEPTION 'quote changed'; END IF;
  IF q.promotion_id IS NOT NULL THEN
    SELECT * INTO promo FROM retail_promotions WHERE id=q.promotion_id FOR UPDATE;
    IF NOT FOUND OR lower(promo.code)<>lower(normalized_code) THEN RAISE EXCEPTION 'quote changed'; END IF;
    has_promotion:=true;
    SELECT count(*) INTO promo_count FROM retail_promotion_redemptions redemption WHERE redemption.promotion_id=promo.id AND redemption.status IN ('reserved','committed');
    SELECT count(*) INTO customer_count FROM retail_promotion_redemptions redemption WHERE redemption.promotion_id=promo.id AND redemption.customer_email=lower(trim(p_checkout->>'email')) AND redemption.status IN ('reserved','committed');
    IF (promo.max_redemptions IS NOT NULL AND promo_count>=promo.max_redemptions) OR (promo.max_per_customer IS NOT NULL AND customer_count>=promo.max_per_customer) THEN RAISE EXCEPTION 'promotion exhausted'; END IF;
  END IF;
  SELECT jsonb_agg(jsonb_build_object('sku',product_sku,'quantity',quantity) ORDER BY product_sku) INTO grouped_items FROM (SELECT x->>'productSku' product_sku,sum((x->>'quantity')::bigint) quantity FROM jsonb_array_elements(q.items_snapshot) x GROUP BY x->>'productSku') grouped;
  INSERT INTO retail_orders(client_request_id,currency,subtotal_minor,shipping_minor,tax_minor,discount_minor,amount_minor,shipping_method,items_snapshot,checkout_email,checkout_shipping,terms_version,terms_accepted_at,quote_hash,status)
  VALUES(p_request,'USD',q.subtotal_minor,q.shipping_minor,q.tax_minor,q.discount_minor,q.total_minor,q.shipping_method,grouped_items,lower(trim(p_checkout->>'email')),q.shipping_snapshot,p_checkout->>'termsVersion',now(),q.quote_hash,'pending') RETURNING id INTO created_order_id;
  INSERT INTO retail_order_lines(order_id,product_id,variant_id,product_sku,variant_sku,title_en,title_ar,title_zh,option_values,quantity,unit_amount_minor)
  SELECT created_order_id,v.product_id,v.id,x->>'productSku',x->>'variantSku',COALESCE(x->>'titleEn',x->>'productTitleEn'),COALESCE(x->>'titleAr',x->>'productTitleAr'),COALESCE(x->>'titleZh',x->>'productTitleZh'),COALESCE(x->'options','{}'::jsonb),(x->>'quantity')::bigint,(x->>'unitAmountMinor')::bigint FROM jsonb_array_elements(q.items_snapshot) x JOIN retail_product_variants v ON v.sku=x->>'variantSku';
  FOR r IN SELECT l.variant_id,l.variant_sku,l.quantity FROM retail_order_lines l WHERE l.order_id=created_order_id ORDER BY l.variant_id LOOP
    UPDATE retail_variant_inventory_balances SET reserved=reserved+r.quantity,updated_at=now() WHERE variant_id=r.variant_id AND on_hand-reserved>=r.quantity; IF NOT FOUND THEN RAISE EXCEPTION 'inventory changed during checkout'; END IF;
    INSERT INTO retail_variant_inventory_reservations(order_id,request_id,variant_id,quantity,status,expires_at,idempotency_key) VALUES(created_order_id,p_request,r.variant_id,r.quantity,'active',now()+interval '15 minutes',md5('v3:'||p_request::text||':'||r.variant_sku)::uuid);
    INSERT INTO retail_variant_inventory_ledger(variant_id,delta_reserved,reason,idempotency_key) VALUES(r.variant_id,r.quantity,'checkout_reservation',md5('v3-ledger:'||p_request::text||':'||r.variant_sku)::uuid);
  END LOOP;
  FOR r IN SELECT l.product_id,l.product_sku,sum(l.quantity) quantity FROM retail_order_lines l WHERE l.order_id=created_order_id GROUP BY l.product_id,l.product_sku ORDER BY l.product_id LOOP
    UPDATE retail_inventory_balances SET reserved=reserved+r.quantity,updated_at=now() WHERE product_id=r.product_id AND on_hand-reserved>=r.quantity; IF NOT FOUND THEN RAISE EXCEPTION 'product inventory changed during checkout'; END IF;
    INSERT INTO retail_inventory_reservations(order_id,request_id,product_id,quantity,status,expires_at,idempotency_key) VALUES(created_order_id,p_request,r.product_id,r.quantity,'active',now()+interval '15 minutes',md5('v3-product:'||p_request::text||':'||r.product_sku)::uuid);
    INSERT INTO retail_inventory_ledger(product_id,delta_reserved,reason,idempotency_key) VALUES(r.product_id,r.quantity,'checkout_reservation_v3',md5('v3-product-ledger:'||p_request::text||':'||r.product_sku)::uuid);
  END LOOP;
  IF has_promotion THEN INSERT INTO retail_promotion_redemptions(promotion_id,order_id,request_id,customer_email,discount_minor,status,expires_at) VALUES(promo.id,created_order_id,p_request,lower(trim(p_checkout->>'email')),q.discount_minor,'reserved',now()+interval '15 minutes'); END IF;
  RETURN QUERY SELECT o.id,o.paypal_order_id,o.currency,o.subtotal_minor,o.shipping_minor,o.tax_minor,o.discount_minor,o.amount_minor,o.shipping_method,o.items_snapshot,o.checkout_shipping,o.status FROM retail_orders o WHERE o.id=created_order_id;
END $$;

CREATE OR REPLACE FUNCTION retail_sync_variant_order_lifecycle() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE r RECORD;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF NEW.status='captured' THEN
    FOR r IN SELECT rv.id,rv.variant_id,rv.quantity FROM retail_variant_inventory_reservations rv WHERE rv.order_id=NEW.id AND rv.status='active' ORDER BY rv.variant_id,rv.id FOR UPDATE LOOP
      PERFORM 1 FROM retail_product_variants v JOIN retail_variant_inventory_balances vb ON vb.variant_id=v.id WHERE v.id=r.variant_id FOR UPDATE OF v,vb;
      UPDATE retail_variant_inventory_balances SET on_hand=on_hand-r.quantity,reserved=reserved-r.quantity,updated_at=now() WHERE variant_id=r.variant_id AND on_hand>=r.quantity AND reserved>=r.quantity; IF NOT FOUND THEN RAISE EXCEPTION 'variant inventory state invalid at capture'; END IF;
      UPDATE retail_variant_inventory_reservations SET status='consumed' WHERE id=r.id;
      INSERT INTO retail_variant_inventory_ledger(variant_id,delta_on_hand,delta_reserved,reason,idempotency_key,reference_id) VALUES(r.variant_id,-r.quantity,-r.quantity,'payment_capture',md5('variant-capture:'||COALESCE(NEW.capture_id,NEW.id::text)||':'||r.id::text)::uuid,r.id) ON CONFLICT(idempotency_key) DO NOTHING;
    END LOOP;
    FOR r IN SELECT rv.id,rv.product_id,rv.quantity FROM retail_inventory_reservations rv WHERE rv.order_id=NEW.id AND rv.status='active' ORDER BY rv.product_id,rv.id FOR UPDATE LOOP
      PERFORM 1 FROM retail_products p JOIN retail_inventory_balances pb ON pb.product_id=p.id WHERE p.id=r.product_id FOR UPDATE OF p,pb;
      UPDATE retail_inventory_balances SET on_hand=on_hand-r.quantity,reserved=reserved-r.quantity,updated_at=now() WHERE product_id=r.product_id AND on_hand>=r.quantity AND reserved>=r.quantity; IF NOT FOUND THEN RAISE EXCEPTION 'product inventory state invalid at capture'; END IF;
      UPDATE retail_inventory_reservations SET status='consumed' WHERE id=r.id;
      INSERT INTO retail_inventory_ledger(product_id,delta_on_hand,delta_reserved,reason,idempotency_key,reference_id) VALUES(r.product_id,-r.quantity,-r.quantity,'payment_capture',md5('capture:'||COALESCE(NEW.capture_id,NEW.id::text)||':'||r.id::text)::uuid,r.id) ON CONFLICT(idempotency_key) DO NOTHING;
    END LOOP;
    UPDATE retail_promotion_redemptions SET status='committed',committed_at=now() WHERE order_id=NEW.id AND status='reserved';
  ELSIF NEW.status IN ('cancelled','expired','failed','denied') THEN
    FOR r IN SELECT rv.id,rv.variant_id,rv.quantity FROM retail_variant_inventory_reservations rv WHERE rv.order_id=NEW.id AND rv.status='active' ORDER BY rv.variant_id,rv.id FOR UPDATE LOOP
      PERFORM 1 FROM retail_product_variants v JOIN retail_variant_inventory_balances vb ON vb.variant_id=v.id WHERE v.id=r.variant_id FOR UPDATE OF v,vb;
      UPDATE retail_variant_inventory_balances SET reserved=reserved-r.quantity,updated_at=now() WHERE variant_id=r.variant_id AND reserved>=r.quantity; IF NOT FOUND THEN RAISE EXCEPTION 'variant reservation balance invalid'; END IF;
      UPDATE retail_variant_inventory_reservations SET status=CASE WHEN NEW.status='expired' THEN 'expired' ELSE 'released' END WHERE id=r.id;
      INSERT INTO retail_variant_inventory_ledger(variant_id,delta_reserved,reason,idempotency_key,reference_id) VALUES(r.variant_id,-r.quantity,CASE WHEN NEW.status='expired' THEN 'reservation_expired' ELSE 'order_released' END,md5('variant-release:'||NEW.status||':'||NEW.id::text||':'||r.id::text)::uuid,r.id) ON CONFLICT(idempotency_key) DO NOTHING;
    END LOOP;
    FOR r IN SELECT rv.id,rv.product_id,rv.quantity FROM retail_inventory_reservations rv WHERE rv.order_id=NEW.id AND rv.status='active' ORDER BY rv.product_id,rv.id FOR UPDATE LOOP
      PERFORM 1 FROM retail_products p JOIN retail_inventory_balances pb ON pb.product_id=p.id WHERE p.id=r.product_id FOR UPDATE OF p,pb;
      UPDATE retail_inventory_balances SET reserved=reserved-r.quantity,updated_at=now() WHERE product_id=r.product_id AND reserved>=r.quantity; IF NOT FOUND THEN RAISE EXCEPTION 'reservation balance invalid'; END IF;
      UPDATE retail_inventory_reservations SET status=CASE WHEN NEW.status='expired' THEN 'expired' ELSE 'released' END WHERE id=r.id;
      INSERT INTO retail_inventory_ledger(product_id,delta_reserved,reason,idempotency_key,reference_id) VALUES(r.product_id,-r.quantity,CASE WHEN NEW.status='expired' THEN 'reservation_expired' ELSE 'order_released' END,md5('release:'||NEW.status||':'||NEW.id::text||':'||r.id::text)::uuid,r.id) ON CONFLICT(idempotency_key) DO NOTHING;
    END LOOP;
    UPDATE retail_promotion_redemptions SET status='released',released_at=now() WHERE order_id=NEW.id AND status='reserved';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION retail_release_expired_reservations() RETURNS INT LANGUAGE plpgsql AS $$
DECLARE o RECORD; n INT:=0;
BEGIN
  FOR o IN SELECT ro.id FROM retail_orders ro
    WHERE ro.status IN ('pending','created','approved') AND ro.capturing_started_at IS NULL
      AND (EXISTS(SELECT 1 FROM retail_variant_inventory_reservations rv WHERE rv.order_id=ro.id AND rv.status='active' AND rv.expires_at<now()) OR EXISTS(SELECT 1 FROM retail_inventory_reservations ri WHERE ri.order_id=ro.id AND ri.status='active' AND ri.expires_at<now()))
    ORDER BY ro.id FOR UPDATE
  LOOP
    UPDATE retail_orders SET status='expired',capturing_started_at=NULL,updated_at=now() WHERE id=o.id AND status IN ('pending','created','approved');
    IF FOUND THEN n:=n+1; END IF;
  END LOOP;
  RETURN n;
END $$;

CREATE OR REPLACE FUNCTION retail_cancel_order(p_order BIGINT,p_reason TEXT,p_key UUID) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE o retail_orders%ROWTYPE; prior retail_admin_audit%ROWTYPE;
BEGIN
  SELECT * INTO o FROM retail_orders WHERE id=p_order FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'order not found'; END IF;
  SELECT * INTO prior FROM retail_admin_audit WHERE idempotency_key=p_key FOR UPDATE;
  IF FOUND THEN IF prior.action<>'order.cancel' OR prior.entity_type<>'order' OR prior.entity_id<>p_order::text OR prior.detail->>'reason' IS DISTINCT FROM p_reason THEN RAISE EXCEPTION 'idempotency conflict'; END IF; RETURN true; END IF;
  IF o.status='cancelled' THEN RAISE EXCEPTION 'order already cancelled'; END IF;
  IF o.status NOT IN ('pending','created','expired','failed','denied') OR (o.status='created' AND o.paypal_order_id IS NOT NULL) THEN RAISE EXCEPTION 'order requires payment reconciliation'; END IF;
  UPDATE retail_orders SET status='cancelled',capturing_started_at=NULL,updated_at=now() WHERE id=o.id;
  INSERT INTO retail_admin_audit(action,entity_type,entity_id,detail,idempotency_key) VALUES('order.cancel','order',p_order::text,jsonb_build_object('reason',p_reason),p_key);
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION retail_adjust_inventory_as_actor(p_public_id UUID,p_delta BIGINT,p_reason TEXT,p_key UUID,p_actor_id TEXT,p_actor_name TEXT,p_actor_role TEXT,p_legacy BOOLEAN) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE payload JSONB; prior retail_admin_idempotency%ROWTYPE; v_product_id UUID; v_variant_id UUID;
BEGIN
  IF p_delta=0 THEN RAISE EXCEPTION 'invalid inventory delta'; END IF;
  payload:=jsonb_build_object('productId',p_public_id,'delta',p_delta,'reason',p_reason);
  PERFORM pg_advisory_xact_lock(hashtextextended(p_key::text,0)); SELECT * INTO prior FROM retail_admin_idempotency WHERE idempotency_key=p_key FOR UPDATE;
  IF FOUND THEN IF prior.operation<>'inventory.adjust' OR prior.request_payload<>payload THEN RAISE EXCEPTION 'idempotency conflict'; END IF; PERFORM retail_attribute_admin_audit(p_key,'inventory.adjust','product',p_public_id::text,payload,p_actor_id,p_actor_name,p_actor_role,p_legacy); RETURN false; END IF;
  SELECT p.id,v.id INTO v_product_id,v_variant_id FROM retail_products p JOIN retail_product_variants v ON v.product_id=p.id JOIN retail_variant_inventory_balances vb ON vb.variant_id=v.id WHERE p.public_id=p_public_id AND v.option_values='{}'::jsonb FOR UPDATE OF v,vb;
  IF NOT FOUND THEN RAISE EXCEPTION 'default variant missing'; END IF;
  PERFORM 1 FROM retail_products p JOIN retail_inventory_balances pb ON pb.product_id=p.id WHERE p.id=v_product_id FOR UPDATE OF p,pb;
  INSERT INTO retail_admin_idempotency(idempotency_key,operation,request_payload) VALUES(p_key,'inventory.adjust',payload);
  UPDATE retail_variant_inventory_balances SET on_hand=on_hand+p_delta,updated_at=now() WHERE variant_id=v_variant_id AND on_hand+p_delta>=reserved; IF NOT FOUND THEN RAISE EXCEPTION 'insufficient available inventory'; END IF;
  INSERT INTO retail_variant_inventory_ledger(variant_id,delta_on_hand,reason,idempotency_key) VALUES(v_variant_id,p_delta,p_reason,p_key);
  PERFORM retail_sync_product_inventory_from_variants(v_product_id);
  INSERT INTO retail_inventory_ledger(product_id,delta_on_hand,reason,idempotency_key) VALUES(v_product_id,p_delta,p_reason,p_key);
  UPDATE retail_admin_idempotency SET response_payload=jsonb_build_object('adjusted',true) WHERE idempotency_key=p_key;
  PERFORM retail_attribute_admin_audit(p_key,'inventory.adjust','product',p_public_id::text,payload,p_actor_id,p_actor_name,p_actor_role,p_legacy); RETURN true;
END $$;

-- Capture used to consume product reservations before the status trigger
-- consumed variant reservations.  Status transition now owns both halves.
CREATE OR REPLACE FUNCTION retail_apply_paypal_capture(p_paypal_order TEXT,p_capture TEXT,p_customer JSONB DEFAULT '{}'::jsonb,p_shipping JSONB DEFAULT '{}'::jsonb,p_fee BIGINT DEFAULT NULL,p_net BIGINT DEFAULT NULL)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE o retail_orders%ROWTYPE; v_customer_id UUID; buyer_email TEXT; buyer_name TEXT; reservation_count INT;
BEGIN
  SELECT * INTO o FROM retail_orders WHERE paypal_order_id=p_paypal_order FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF o.status='captured' AND o.capture_id=p_capture THEN
    IF (p_fee IS NULL) <> (p_net IS NULL) OR (p_fee IS NOT NULL AND (p_fee<0 OR p_fee+p_net<>o.amount_minor)) THEN RAISE EXCEPTION 'invalid paypal fee breakdown'; END IF;
    INSERT INTO retail_payment_ledger(order_id,kind,amount_minor,currency,paypal_reference,idempotency_key) VALUES(o.id,'payment',o.amount_minor,o.currency,p_capture,md5('payment:'||p_capture)::uuid) ON CONFLICT(idempotency_key) DO NOTHING;
    IF p_fee IS NOT NULL THEN INSERT INTO retail_payment_ledger(order_id,kind,amount_minor,currency,paypal_reference,idempotency_key) VALUES(o.id,'fee',-p_fee,o.currency,'fee:'||p_capture,md5('fee:'||p_capture)::uuid) ON CONFLICT(idempotency_key) DO NOTHING; END IF;
    UPDATE retail_order_snapshots SET customer_snapshot=CASE WHEN customer_snapshot='{}'::jsonb AND p_customer<>'{}'::jsonb THEN p_customer ELSE customer_snapshot END,shipping_snapshot=CASE WHEN shipping_snapshot='{}'::jsonb AND p_shipping<>'{}'::jsonb THEN p_shipping ELSE shipping_snapshot END WHERE order_id=p_paypal_order;
    RETURN true;
  END IF;
  IF o.status NOT IN ('pending','created','approved','capturing') THEN RETURN false; END IF;
  SELECT count(*) INTO reservation_count FROM retail_inventory_reservations WHERE order_id=o.id AND status='active';
  IF reservation_count<>jsonb_array_length(o.items_snapshot) THEN RAISE EXCEPTION 'active inventory reservation unavailable'; END IF;
  IF (p_fee IS NULL) <> (p_net IS NULL) OR (p_fee IS NOT NULL AND (p_fee<0 OR p_fee+p_net<>o.amount_minor)) THEN RAISE EXCEPTION 'invalid paypal fee breakdown'; END IF;
  UPDATE retail_orders SET status='captured',capture_id=p_capture,captured_at=COALESCE(captured_at,now()),capturing_started_at=NULL,updated_at=now() WHERE id=o.id;
  INSERT INTO retail_payment_ledger(order_id,kind,amount_minor,currency,paypal_reference,idempotency_key) VALUES(o.id,'payment',o.amount_minor,o.currency,p_capture,md5('payment:'||p_capture)::uuid) ON CONFLICT(idempotency_key) DO NOTHING;
  IF p_fee IS NOT NULL THEN INSERT INTO retail_payment_ledger(order_id,kind,amount_minor,currency,paypal_reference,idempotency_key) VALUES(o.id,'fee',-p_fee,o.currency,'fee:'||p_capture,md5('fee:'||p_capture)::uuid) ON CONFLICT(idempotency_key) DO NOTHING; END IF;
  buyer_email:=NULLIF(lower(p_customer->>'email'),''); buyer_name:=COALESCE(NULLIF(p_customer->>'name',''),'PayPal customer');
  IF buyer_email IS NOT NULL THEN INSERT INTO retail_customers(email,name) VALUES(buyer_email,buyer_name) ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name RETURNING id INTO v_customer_id; END IF;
  INSERT INTO retail_order_snapshots(order_id,customer_snapshot,shipping_snapshot,items_snapshot) VALUES(p_paypal_order,p_customer,p_shipping,o.items_snapshot) ON CONFLICT(order_id) DO NOTHING;
  IF v_customer_id IS NOT NULL AND COALESCE(p_shipping->>'line1','')<>'' AND COALESCE(p_shipping->>'recipient','')<>'' AND COALESCE(p_shipping->>'city','')<>'' AND COALESCE(p_shipping->>'country','') ~ '^[A-Z]{2}$' THEN INSERT INTO retail_addresses(customer_id,recipient,line1,line2,city,region,postal_code,country,phone,is_default) VALUES(v_customer_id,p_shipping->>'recipient',p_shipping->>'line1',p_shipping->>'line2',p_shipping->>'city',p_shipping->>'region',p_shipping->>'postalCode',p_shipping->>'country',p_shipping->>'phone',NOT EXISTS(SELECT 1 FROM retail_addresses a WHERE a.customer_id=v_customer_id AND a.archived_at IS NULL)); END IF;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION retail_admin_transition_return(p_public_id UUID,p_status TEXT,p_admin_note TEXT,p_restock_sellable BOOLEAN,p_key UUID,p_actor_id TEXT,p_actor_name TEXT,p_actor_role TEXT,p_legacy BOOLEAN)
RETURNS TABLE(public_id UUID,status TEXT,replayed BOOLEAN) LANGUAGE plpgsql AS $$
DECLARE rr retail_returns%ROWTYPE; existing retail_return_events%ROWTYPE; restock RECORD; allowed BOOLEAN:=false;
BEGIN
  PERFORM retail_assert_return_permissions(p_actor_id,p_actor_name,p_actor_role,p_legacy,p_restock_sellable,false);
  SELECT * INTO existing FROM retail_return_events WHERE idempotency_key=p_key FOR UPDATE;
  IF FOUND THEN SELECT * INTO rr FROM retail_returns WHERE id=existing.return_id; IF existing.to_status<>p_status THEN RAISE EXCEPTION 'idempotency conflict'; END IF; RETURN QUERY SELECT rr.public_id,rr.status,true; RETURN; END IF;
  SELECT * INTO rr FROM retail_returns r WHERE r.public_id=p_public_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'return not found'; END IF;
  allowed:=(rr.status='requested' AND p_status IN ('authorized','rejected','cancelled')) OR (rr.status='authorized' AND p_status IN ('in_transit','cancelled')) OR (rr.status='in_transit' AND p_status IN ('received','cancelled')) OR (rr.status='received' AND p_status IN ('inspected','rejected')) OR (rr.status='inspected' AND p_status IN ('approved','rejected')) OR (rr.status='approved' AND p_status IN ('refund_pending','closed')) OR (rr.status='refund_pending' AND p_status='refunded') OR (rr.status='refunded' AND p_status='closed');
  IF NOT allowed THEN RAISE EXCEPTION 'invalid return transition'; END IF;
  IF p_restock_sellable AND NOT (rr.status='inspected' AND p_status='approved') THEN RAISE EXCEPTION 'sellable restock requires inspected approval'; END IF;
  IF p_restock_sellable AND rr.restocked_at IS NOT NULL THEN RAISE EXCEPTION 'return already restocked'; END IF;
  IF p_restock_sellable THEN
    -- Lock every variant side first, then every product mirror.  Updating a
    -- product between two variants would invert checkout's all-variant phase.
    PERFORM 1 FROM retail_return_lines rl JOIN retail_product_variants v ON v.id=rl.variant_id JOIN retail_variant_inventory_balances vb ON vb.variant_id=v.id WHERE rl.return_id=rr.id ORDER BY v.id FOR UPDATE OF v,vb;
    PERFORM 1 FROM (SELECT DISTINCT v.product_id FROM retail_return_lines rl JOIN retail_product_variants v ON v.id=rl.variant_id WHERE rl.return_id=rr.id) wanted JOIN retail_products p ON p.id=wanted.product_id JOIN retail_inventory_balances pb ON pb.product_id=p.id ORDER BY p.id FOR UPDATE OF p,pb;
    FOR restock IN SELECT * FROM retail_return_lines WHERE return_id=rr.id ORDER BY variant_id FOR UPDATE LOOP
      UPDATE retail_variant_inventory_balances SET on_hand=on_hand+restock.quantity,updated_at=now() WHERE variant_id=restock.variant_id; IF NOT FOUND THEN RAISE EXCEPTION 'variant inventory unavailable'; END IF;
      INSERT INTO retail_variant_inventory_ledger(variant_id,delta_on_hand,reason,idempotency_key,reference_id) VALUES(restock.variant_id,restock.quantity,'return_restock_sellable',md5('return-restock:'||rr.id::text||':'||restock.id::text)::uuid,restock.id);
    END LOOP;
    FOR restock IN SELECT v.product_id,sum(rl.quantity) quantity FROM retail_return_lines rl JOIN retail_product_variants v ON v.id=rl.variant_id WHERE rl.return_id=rr.id GROUP BY v.product_id ORDER BY v.product_id LOOP
      UPDATE retail_inventory_balances SET on_hand=on_hand+restock.quantity,updated_at=now() WHERE product_id=restock.product_id;
      INSERT INTO retail_inventory_ledger(product_id,delta_on_hand,reason,idempotency_key) VALUES(restock.product_id,restock.quantity,'return_restock_sellable',md5('return-product-restock:'||rr.id::text||':'||restock.product_id::text)::uuid);
    END LOOP;
  END IF;
  UPDATE retail_returns SET status=p_status,admin_note=COALESCE(p_admin_note,''),authorized_at=CASE WHEN p_status='authorized' THEN now() ELSE authorized_at END,received_at=CASE WHEN p_status='received' THEN now() ELSE received_at END,inspected_at=CASE WHEN p_status='inspected' THEN now() ELSE inspected_at END,resolved_at=CASE WHEN p_status IN ('rejected','refunded','closed','cancelled') THEN now() ELSE resolved_at END,restocked_at=CASE WHEN p_restock_sellable THEN now() ELSE restocked_at END,restocked_by=CASE WHEN p_restock_sellable THEN p_actor_id ELSE restocked_by END,updated_at=now() WHERE id=rr.id;
  INSERT INTO retail_return_events(return_id,from_status,to_status,detail,actor_id,actor_name,actor_role,idempotency_key) VALUES(rr.id,rr.status,p_status,jsonb_build_object('adminNote',COALESCE(p_admin_note,''),'sellableRestock',p_restock_sellable),p_actor_id,p_actor_name,p_actor_role,p_key);
  PERFORM retail_attribute_admin_audit(p_key,'return.transition','return',rr.public_id::text,jsonb_build_object('fromStatus',rr.status,'toStatus',p_status,'sellableRestock',p_restock_sellable),p_actor_id,p_actor_name,p_actor_role,p_legacy);
  RETURN QUERY SELECT rr.public_id,p_status,false;
END $$;
