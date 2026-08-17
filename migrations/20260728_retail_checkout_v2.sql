-- Buyer checkout, shipping, cancellation, refunds, notifications, and rate limits.
-- This migration is additive and may be rerun safely after the two foundation migrations.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS retail_shipping_zones (
  country CHAR(2) PRIMARY KEY CHECK (country ~ '^[A-Z]{2}$'),
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  shipping_minor BIGINT NOT NULL CHECK (shipping_minor >= 0),
  free_shipping_threshold_minor BIGINT CHECK (free_shipping_threshold_minor > 0),
  tax_rate_bps INT NOT NULL DEFAULT 0 CHECK (tax_rate_bps BETWEEN 0 AND 10000),
  active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS retail_rate_limits (
  scope TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  attempts INT NOT NULL DEFAULT 1 CHECK (attempts > 0),
  PRIMARY KEY(scope,fingerprint)
);

CREATE TABLE IF NOT EXISTS retail_notification_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id BIGINT NOT NULL REFERENCES retail_orders(id),
  kind TEXT NOT NULL CHECK(kind IN ('order_confirmed','order_fulfilled','order_refunded','payment_attention','low_stock')),
  recipient TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','sent','failed')),
  attempts INT NOT NULL DEFAULT 0 CHECK(attempts >= 0),
  claimed_at TIMESTAMPTZ,
  idempotency_key TEXT NOT NULL UNIQUE,
  last_error TEXT,
  available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);
ALTER TABLE retail_notification_outbox ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS retail_notification_outbox_pending_idx ON retail_notification_outbox(status,available_at,created_at);

CREATE TABLE IF NOT EXISTS retail_refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key UUID NOT NULL UNIQUE,
  order_id BIGINT NOT NULL REFERENCES retail_orders(id),
  amount_minor BIGINT NOT NULL CHECK(amount_minor > 0),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','completed','failed')),
  paypal_refund_id TEXT UNIQUE,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE retail_orders
  ADD COLUMN IF NOT EXISTS public_id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS subtotal_minor BIGINT,
  ADD COLUMN IF NOT EXISTS shipping_minor BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_minor BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_minor BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_method TEXT,
  ADD COLUMN IF NOT EXISTS checkout_email TEXT,
  ADD COLUMN IF NOT EXISTS checkout_shipping JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS terms_version TEXT,
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS quote_hash TEXT;
UPDATE retail_orders SET public_id=COALESCE(public_id,gen_random_uuid()),subtotal_minor=COALESCE(subtotal_minor,amount_minor),shipping_minor=COALESCE(shipping_minor,0),tax_minor=COALESCE(tax_minor,0),discount_minor=COALESCE(discount_minor,0);
ALTER TABLE retail_orders ALTER COLUMN public_id SET NOT NULL, ALTER COLUMN subtotal_minor SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS retail_orders_public_id_idx ON retail_orders(public_id);
CREATE INDEX IF NOT EXISTS retail_orders_request_confirmation_idx ON retail_orders(client_request_id,created_at DESC);

-- Keep the first-generation checkout function usable during rolling deploys.
-- It only writes amount_minor, so derive the equivalent zero-shipping
-- breakdown before NOT NULL and breakdown constraints are checked.
CREATE OR REPLACE FUNCTION retail_legacy_order_breakdown() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.subtotal_minor IS NULL AND NEW.amount_minor IS NOT NULL THEN
    NEW.subtotal_minor := NEW.amount_minor;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS retail_legacy_order_breakdown_insert ON retail_orders;
CREATE TRIGGER retail_legacy_order_breakdown_insert BEFORE INSERT ON retail_orders
  FOR EACH ROW EXECUTE FUNCTION retail_legacy_order_breakdown();

DO $$
BEGIN
  ALTER TABLE retail_orders DROP CONSTRAINT IF EXISTS retail_orders_status_check;
  ALTER TABLE retail_orders ADD CONSTRAINT retail_orders_status_check CHECK (status IN ('pending','created','approved','capturing','captured','refunded','reversed','denied','failed','expired','cancelled'));
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='retail_orders'::regclass AND conname='retail_orders_breakdown_check') THEN
    ALTER TABLE retail_orders ADD CONSTRAINT retail_orders_breakdown_check CHECK (
      subtotal_minor >= 0 AND shipping_minor >= 0 AND tax_minor >= 0 AND discount_minor >= 0
      AND amount_minor = subtotal_minor + shipping_minor + tax_minor - discount_minor
    );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION retail_quote_checkout(p_items JSONB,p_checkout JSONB)
RETURNS TABLE(currency CHAR(3),subtotal_minor BIGINT,shipping_minor BIGINT,tax_minor BIGINT,discount_minor BIGINT,total_minor BIGINT,shipping_method TEXT,items_snapshot JSONB,shipping_snapshot JSONB,quote_hash TEXT)
LANGUAGE plpgsql STABLE AS $$
DECLARE r RECORD; zone retail_shipping_zones%ROWTYPE; requested_count INT; actual_count INT := 0; subtotal BIGINT := 0; shipping BIGINT; tax BIGINT; item JSONB := '[]'::jsonb; normalized_items JSONB; normalized_shipping JSONB; country_code TEXT; email TEXT; terms_ok BOOLEAN;
BEGIN
  IF jsonb_typeof(p_items)<>'array' OR jsonb_array_length(p_items)=0 OR jsonb_array_length(p_items)>10 OR jsonb_typeof(p_checkout)<>'object' THEN RAISE EXCEPTION 'invalid checkout'; END IF;
  SELECT count(*) INTO requested_count FROM jsonb_array_elements(p_items);
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_items) x WHERE jsonb_typeof(x)<>'object' OR COALESCE(x->>'sku','')='' OR COALESCE(x->>'quantity','') !~ '^(?:[1-9]|10)$') THEN RAISE EXCEPTION 'invalid cart'; END IF;
  IF EXISTS(SELECT sku FROM (SELECT x->>'sku' sku FROM jsonb_array_elements(p_items) x) d GROUP BY sku HAVING count(*)>1) THEN RAISE EXCEPTION 'duplicate sku'; END IF;
  email := lower(trim(COALESCE(p_checkout->>'email','')));
  country_code := upper(trim(COALESCE(p_checkout->>'country','')));
  terms_ok := COALESCE((p_checkout->>'termsAccepted')::BOOLEAN,false) AND length(COALESCE(p_checkout->>'termsVersion','')) BETWEEN 1 AND 50;
  IF email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' OR country_code !~ '^[A-Z]{2}$' OR NOT terms_ok
    OR length(trim(COALESCE(p_checkout->>'recipient','')))=0 OR length(trim(COALESCE(p_checkout->>'line1','')))=0 OR length(trim(COALESCE(p_checkout->>'city','')))=0 THEN RAISE EXCEPTION 'invalid checkout'; END IF;
  SELECT * INTO zone FROM retail_shipping_zones z WHERE z.country=country_code AND z.active;
  IF NOT FOUND THEN RAISE EXCEPTION 'unsupported shipping country'; END IF;
  FOR r IN SELECT p.sku,p.slug,p.title_en,p.title_ar,b.on_hand,b.reserved,h.amount_minor,(x->>'quantity')::BIGINT quantity
    FROM jsonb_array_elements(p_items) x
    JOIN retail_products p ON p.sku=x->>'sku' AND p.status='published'
    JOIN retail_inventory_balances b ON b.product_id=p.id
    JOIN LATERAL(SELECT ph.amount_minor FROM retail_price_history ph WHERE ph.product_id=p.id AND ph.active ORDER BY ph.created_at DESC LIMIT 1) h ON true
    ORDER BY p.sku
  LOOP
    actual_count:=actual_count+1;
    IF r.on_hand-r.reserved<r.quantity THEN RAISE EXCEPTION 'unavailable sku'; END IF;
    IF r.quantity*r.amount_minor>900000000000000-subtotal THEN RAISE EXCEPTION 'invalid cart total'; END IF;
    subtotal:=subtotal+r.quantity*r.amount_minor;
    item:=item||jsonb_build_array(jsonb_build_object('sku',r.sku,'slug',r.slug,'titleEn',r.title_en,'titleAr',r.title_ar,'quantity',r.quantity,'unitAmountMinor',r.amount_minor));
  END LOOP;
  IF actual_count<>requested_count OR subtotal<=0 THEN RAISE EXCEPTION 'unknown sku'; END IF;
  shipping:=CASE WHEN zone.free_shipping_threshold_minor IS NOT NULL AND subtotal>=zone.free_shipping_threshold_minor THEN 0 ELSE zone.shipping_minor END;
  tax:=((subtotal+shipping)*zone.tax_rate_bps+5000)/10000;
  normalized_shipping:=jsonb_build_object('email',email,'recipient',trim(p_checkout->>'recipient'),'line1',trim(p_checkout->>'line1'),'line2',trim(COALESCE(p_checkout->>'line2','')),'city',trim(p_checkout->>'city'),'region',trim(COALESCE(p_checkout->>'region','')),'postalCode',trim(COALESCE(p_checkout->>'postalCode','')),'country',country_code,'phone',trim(COALESCE(p_checkout->>'phone','')));
  SELECT jsonb_agg(jsonb_build_object('sku',x->>'sku','quantity',(x->>'quantity')::BIGINT) ORDER BY x->>'sku') INTO normalized_items FROM jsonb_array_elements(p_items) x;
  RETURN QUERY SELECT 'USD'::CHAR(3),subtotal,shipping,tax,0::BIGINT,subtotal+shipping+tax,'standard'::TEXT,item,normalized_shipping,encode(digest(normalized_items::text||normalized_shipping::text||subtotal::text||':'||shipping::text||':'||tax::text,'sha256'),'hex');
END $$;

CREATE OR REPLACE FUNCTION retail_create_checkout_v2(p_request UUID,p_items JSONB,p_checkout JSONB,p_expected_total BIGINT)
RETURNS TABLE(order_id BIGINT,paypal_order_id TEXT,currency CHAR(3),subtotal_minor BIGINT,shipping_minor BIGINT,tax_minor BIGINT,discount_minor BIGINT,amount_minor BIGINT,shipping_method TEXT,items_snapshot JSONB,checkout_shipping JSONB,status TEXT)
LANGUAGE plpgsql AS $$
DECLARE existing retail_orders%ROWTYPE; q RECORD; r RECORD; locked_zone retail_shipping_zones%ROWTYPE; requested JSONB; prior_requested JSONB; actual_count INT := 0; locked_shipping BIGINT; locked_tax BIGINT;
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
  -- Lock and recheck all balances in deterministic SKU order after the quote.
  FOR r IN SELECT p.id,p.sku,b.on_hand,b.reserved,(x->>'quantity')::BIGINT quantity FROM jsonb_array_elements(p_items) x JOIN retail_products p ON p.sku=x->>'sku' JOIN retail_inventory_balances b ON b.product_id=p.id ORDER BY p.sku FOR UPDATE OF p,b LOOP
    actual_count:=actual_count+1;
    IF r.on_hand-r.reserved<r.quantity THEN RAISE EXCEPTION 'unavailable sku'; END IF;
  END LOOP;
  IF actual_count<>jsonb_array_length(p_items) THEN RAISE EXCEPTION 'unknown sku'; END IF;
  -- Price changes lock retail_products through retail_change_price. Once all
  -- product rows are locked above, a new statement sees the current committed
  -- active price and status; compare it with the earlier quote before writing.
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
  -- Shipping configuration is mutable admin data too. Lock the exact zone and
  -- recompute the monetary fields so an in-flight disable/rate change cannot
  -- settle with a stale shipping or tax quote.
  SELECT * INTO locked_zone FROM retail_shipping_zones z WHERE z.country=q.shipping_snapshot->>'country' FOR UPDATE;
  IF NOT FOUND OR NOT locked_zone.active THEN RAISE EXCEPTION 'quote changed'; END IF;
  locked_shipping:=CASE WHEN locked_zone.free_shipping_threshold_minor IS NOT NULL AND q.subtotal_minor>=locked_zone.free_shipping_threshold_minor THEN 0 ELSE locked_zone.shipping_minor END;
  locked_tax:=((q.subtotal_minor+locked_shipping)*locked_zone.tax_rate_bps+5000)/10000;
  IF locked_shipping<>q.shipping_minor OR locked_tax<>q.tax_minor OR q.total_minor<>q.subtotal_minor+locked_shipping+locked_tax-q.discount_minor THEN RAISE EXCEPTION 'quote changed'; END IF;
  INSERT INTO retail_orders(client_request_id,currency,subtotal_minor,shipping_minor,tax_minor,discount_minor,amount_minor,shipping_method,items_snapshot,checkout_email,checkout_shipping,terms_version,terms_accepted_at,quote_hash,status)
    VALUES(p_request,'USD',q.subtotal_minor,q.shipping_minor,q.tax_minor,q.discount_minor,q.total_minor,q.shipping_method,q.items_snapshot,lower(trim(p_checkout->>'email')),q.shipping_snapshot,p_checkout->>'termsVersion',now(),q.quote_hash,'pending') RETURNING id INTO order_id;
  FOR r IN SELECT p.id,p.sku,(x->>'quantity')::BIGINT quantity FROM jsonb_array_elements(p_items) x JOIN retail_products p ON p.sku=x->>'sku' ORDER BY p.sku LOOP
    UPDATE retail_inventory_balances SET reserved=reserved+r.quantity,updated_at=now() WHERE product_id=r.id AND on_hand-reserved>=r.quantity;
    IF NOT FOUND THEN RAISE EXCEPTION 'inventory changed during checkout'; END IF;
    INSERT INTO retail_inventory_reservations(order_id,request_id,product_id,quantity,status,expires_at,idempotency_key) VALUES(order_id,p_request,r.id,r.quantity,'active',now()+interval '15 minutes',md5(p_request::text||':'||r.sku)::uuid);
    INSERT INTO retail_inventory_ledger(product_id,delta_reserved,reason,idempotency_key) VALUES(r.id,r.quantity,'checkout_reservation',md5('reserve:'||p_request::text||':'||r.sku)::uuid);
  END LOOP;
  RETURN QUERY SELECT o.id,o.paypal_order_id,o.currency,o.subtotal_minor,o.shipping_minor,o.tax_minor,o.discount_minor,o.amount_minor,o.shipping_method,o.items_snapshot,o.checkout_shipping,o.status FROM retail_orders o WHERE o.id=order_id;
END $$;

CREATE OR REPLACE FUNCTION retail_cancel_order(p_order BIGINT,p_reason TEXT,p_key UUID) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE o retail_orders%ROWTYPE; r RECORD;
BEGIN
  SELECT * INTO o FROM retail_orders WHERE id=p_order FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order not found'; END IF;
  IF EXISTS(SELECT 1 FROM retail_admin_audit WHERE action='order.cancel' AND entity_id=p_order::text AND idempotency_key=p_key) THEN RETURN true; END IF;
  IF o.status='cancelled' THEN RETURN true; END IF;
  IF o.status NOT IN ('pending','created','approved','expired','failed','denied') THEN RAISE EXCEPTION 'order cannot be cancelled'; END IF;
  FOR r IN SELECT * FROM retail_inventory_reservations WHERE order_id=o.id AND status='active' ORDER BY product_id,id FOR UPDATE LOOP
    UPDATE retail_inventory_balances SET reserved=reserved-r.quantity,updated_at=now() WHERE product_id=r.product_id AND reserved>=r.quantity;
    IF NOT FOUND THEN RAISE EXCEPTION 'reservation balance invalid'; END IF;
    UPDATE retail_inventory_reservations SET status='released' WHERE id=r.id;
    INSERT INTO retail_inventory_ledger(product_id,delta_reserved,reason,idempotency_key,reference_id) VALUES(r.product_id,-r.quantity,'order_cancelled',md5('cancel:'||p_key::text||':'||r.id::text)::uuid,r.id) ON CONFLICT(idempotency_key) DO NOTHING;
  END LOOP;
  UPDATE retail_orders SET status='cancelled',capturing_started_at=NULL,updated_at=now() WHERE id=o.id;
  INSERT INTO retail_admin_audit(action,entity_type,entity_id,detail,idempotency_key) VALUES('order.cancel','order',p_order::text,jsonb_build_object('reason',p_reason),p_key);
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION retail_prepare_refund(p_order BIGINT,p_amount BIGINT,p_reason TEXT,p_key UUID)
RETURNS TABLE(capture_id TEXT,currency CHAR(3),amount_minor BIGINT,status TEXT,paypal_refund_id TEXT) LANGUAGE plpgsql AS $$
DECLARE o retail_orders%ROWTYPE; existing retail_refund_requests%ROWTYPE;
BEGIN
  SELECT * INTO o FROM retail_orders WHERE id=p_order FOR UPDATE;
  IF NOT FOUND OR o.capture_id IS NULL OR o.status NOT IN ('captured','refunded') THEN RAISE EXCEPTION 'order is not refundable'; END IF;
  SELECT * INTO existing FROM retail_refund_requests WHERE idempotency_key=p_key;
  IF FOUND THEN
    IF existing.order_id<>p_order OR existing.amount_minor<>p_amount THEN RAISE EXCEPTION 'idempotency conflict'; END IF;
    RETURN QUERY SELECT o.capture_id,o.currency,existing.amount_minor,existing.status,existing.paypal_refund_id; RETURN;
  END IF;
  IF p_amount<=0 OR o.refunded_minor+COALESCE((SELECT sum(rr.amount_minor) FROM retail_refund_requests rr WHERE rr.order_id=p_order AND rr.status='pending'),0)+p_amount>o.amount_minor THEN RAISE EXCEPTION 'invalid refund amount'; END IF;
  INSERT INTO retail_refund_requests(idempotency_key,order_id,amount_minor,reason) VALUES(p_key,p_order,p_amount,p_reason) RETURNING retail_refund_requests.status INTO status;
  RETURN QUERY SELECT o.capture_id,o.currency,p_amount,status,NULL::TEXT;
END $$;

CREATE OR REPLACE FUNCTION retail_fail_refund(p_key UUID,p_error TEXT) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
BEGIN
  UPDATE retail_refund_requests SET status='failed',last_error=left(p_error,200)
    WHERE idempotency_key=p_key AND status='pending' AND paypal_refund_id IS NULL;
  RETURN FOUND;
END $$;

CREATE OR REPLACE FUNCTION retail_complete_refund(p_key UUID,p_refund TEXT) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE rr retail_refund_requests%ROWTYPE; o retail_orders%ROWTYPE; result RECORD;
BEGIN
  SELECT * INTO rr FROM retail_refund_requests WHERE idempotency_key=p_key FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'refund request not found'; END IF;
  IF rr.status='completed' AND rr.paypal_refund_id=p_refund THEN RETURN true; END IF;
  SELECT * INTO o FROM retail_orders WHERE id=rr.order_id FOR UPDATE;
  SELECT * INTO result FROM retail_apply_paypal_refund(true,p_refund,o.capture_id,o.currency,rr.amount_minor);
  IF result.outcome NOT IN ('processed','duplicate') THEN RAISE EXCEPTION 'refund reconciliation failed'; END IF;
  UPDATE retail_refund_requests SET status='completed',paypal_refund_id=p_refund,last_error=NULL,completed_at=now() WHERE id=rr.id;
  INSERT INTO retail_admin_audit(action,entity_type,entity_id,detail,idempotency_key) VALUES('order.refund','order',rr.order_id::text,jsonb_build_object('amountMinor',rr.amount_minor,'paypalRefundId',p_refund,'reason',rr.reason),p_key) ON CONFLICT(idempotency_key) DO NOTHING;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION retail_order_notification_trigger() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status='captured' AND OLD.status IS DISTINCT FROM 'captured' AND NEW.checkout_email IS NOT NULL THEN
    INSERT INTO retail_notification_outbox(order_id,kind,recipient,payload,idempotency_key) VALUES(NEW.id,'order_confirmed',NEW.checkout_email,jsonb_build_object('publicOrderId',NEW.public_id,'amountMinor',NEW.amount_minor),'confirmed:'||NEW.id) ON CONFLICT(idempotency_key) DO NOTHING;
  END IF;
  IF NEW.fulfilment_status='fulfilled' AND OLD.fulfilment_status IS DISTINCT FROM 'fulfilled' AND NEW.checkout_email IS NOT NULL THEN
    INSERT INTO retail_notification_outbox(order_id,kind,recipient,payload,idempotency_key) VALUES(NEW.id,'order_fulfilled',NEW.checkout_email,jsonb_build_object('carrier',NEW.carrier,'tracking',NEW.tracking_number),'fulfilled:'||NEW.id) ON CONFLICT(idempotency_key) DO NOTHING;
  END IF;
  IF NEW.refunded_minor>OLD.refunded_minor AND NEW.checkout_email IS NOT NULL THEN
    INSERT INTO retail_notification_outbox(order_id,kind,recipient,payload,idempotency_key) VALUES(NEW.id,'order_refunded',NEW.checkout_email,jsonb_build_object('refundedMinor',NEW.refunded_minor,'amountMinor',NEW.amount_minor),'refund:'||NEW.id||':'||NEW.refunded_minor) ON CONFLICT(idempotency_key) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS retail_order_notification_changes ON retail_orders;
CREATE TRIGGER retail_order_notification_changes AFTER UPDATE ON retail_orders FOR EACH ROW EXECUTE FUNCTION retail_order_notification_trigger();
