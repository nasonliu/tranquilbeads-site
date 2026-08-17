-- Immutable operations migration. Do not edit the prior payment migration.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE retail_products (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), public_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(), sku TEXT NOT NULL UNIQUE, slug TEXT NOT NULL UNIQUE, title_en TEXT NOT NULL, title_ar TEXT NOT NULL, description_en TEXT NOT NULL DEFAULT '', description_ar TEXT NOT NULL DEFAULT '', status TEXT NOT NULL CHECK (status IN ('draft','published','archived')), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE retail_product_images (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), product_id UUID NOT NULL REFERENCES retail_products(id) ON DELETE CASCADE, blob_url TEXT NOT NULL UNIQUE, blob_key TEXT NOT NULL UNIQUE, mime_type TEXT NOT NULL, bytes BIGINT NOT NULL CHECK(bytes>0), sha256 TEXT NOT NULL, position SMALLINT NOT NULL CHECK (position >= 0), alt_en TEXT NOT NULL DEFAULT '', alt_ar TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(product_id, position));
CREATE TABLE retail_price_history (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), product_id UUID NOT NULL REFERENCES retail_products(id), amount_minor BIGINT NOT NULL CHECK (amount_minor > 0), currency CHAR(3) NOT NULL DEFAULT 'USD' CHECK (currency='USD'), active BOOLEAN NOT NULL DEFAULT true, idempotency_key UUID NOT NULL UNIQUE, changed_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE retail_inventory_balances (product_id UUID PRIMARY KEY REFERENCES retail_products(id), on_hand BIGINT NOT NULL DEFAULT 0 CHECK(on_hand>=0), reserved BIGINT NOT NULL DEFAULT 0 CHECK(reserved>=0), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE retail_inventory_ledger (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), product_id UUID NOT NULL REFERENCES retail_products(id), delta_on_hand BIGINT NOT NULL DEFAULT 0, delta_reserved BIGINT NOT NULL DEFAULT 0, reason TEXT NOT NULL, idempotency_key UUID NOT NULL UNIQUE, reference_id UUID, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE retail_inventory_reservations (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), order_id BIGINT REFERENCES retail_orders(id), request_id UUID NOT NULL, product_id UUID NOT NULL REFERENCES retail_products(id), quantity BIGINT NOT NULL CHECK(quantity>0), status TEXT NOT NULL CHECK(status IN ('active','consumed','released','expired')), expires_at TIMESTAMPTZ NOT NULL, idempotency_key UUID NOT NULL UNIQUE, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(request_id,product_id));
CREATE TABLE retail_customers (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), public_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(), email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE retail_addresses (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), customer_id UUID NOT NULL REFERENCES retail_customers(id), recipient TEXT NOT NULL, line1 TEXT NOT NULL, line2 TEXT, city TEXT NOT NULL, region TEXT, postal_code TEXT, country CHAR(2) NOT NULL, phone TEXT, is_default BOOLEAN NOT NULL DEFAULT false, archived_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE UNIQUE INDEX retail_addresses_one_default_idx ON retail_addresses(customer_id) WHERE is_default AND archived_at IS NULL;
CREATE TABLE retail_order_snapshots (order_id TEXT PRIMARY KEY REFERENCES retail_orders(paypal_order_id), customer_snapshot JSONB NOT NULL, shipping_snapshot JSONB NOT NULL, items_snapshot JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE retail_payment_ledger (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), order_id BIGINT NOT NULL REFERENCES retail_orders(id), kind TEXT NOT NULL CHECK(kind IN ('payment','refund','reversal','fee','net')), amount_minor BIGINT NOT NULL, currency CHAR(3) NOT NULL CHECK(currency='USD'), reconciliation_status TEXT NOT NULL DEFAULT 'pending' CHECK(reconciliation_status IN ('pending','reconciled','disputed')), paypal_reference TEXT UNIQUE, idempotency_key UUID NOT NULL UNIQUE, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE retail_admin_audit (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT, detail JSONB NOT NULL DEFAULT '{}', idempotency_key UUID UNIQUE, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE retail_blob_delete_outbox (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), blob_url TEXT NOT NULL UNIQUE, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processed','failed')), attempts INT NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), processed_at TIMESTAMPTZ);
CREATE TABLE retail_admin_login_limits (
  fingerprint TEXT PRIMARY KEY,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  attempts INT NOT NULL DEFAULT 1 CHECK(attempts > 0)
);
ALTER TABLE retail_orders ADD COLUMN IF NOT EXISTS fulfilment_status TEXT NOT NULL DEFAULT 'unfulfilled' CHECK(fulfilment_status IN ('unfulfilled','fulfilled','cancelled')), ADD COLUMN IF NOT EXISTS carrier TEXT, ADD COLUMN IF NOT EXISTS tracking_number TEXT, ADD COLUMN IF NOT EXISTS admin_note TEXT;
-- An expired stock hold must never remain payable.  The original payments
-- migration is immutable, so widen its state constraint here.
ALTER TABLE retail_orders DROP CONSTRAINT IF EXISTS retail_orders_status_check;
ALTER TABLE retail_orders ADD CONSTRAINT retail_orders_status_check CHECK (status IN ('pending','created','approved','capturing','captured','refunded','reversed','denied','failed','expired'));

CREATE OR REPLACE FUNCTION retail_adjust_inventory(p_product UUID, p_delta BIGINT, p_reason TEXT, p_key UUID) RETURNS VOID LANGUAGE plpgsql AS $$ BEGIN IF p_delta=0 THEN RAISE EXCEPTION 'zero inventory adjustment'; END IF; INSERT INTO retail_inventory_ledger(product_id,delta_on_hand,reason,idempotency_key) VALUES(p_product,p_delta,p_reason,p_key) ON CONFLICT(idempotency_key) DO NOTHING; IF FOUND THEN UPDATE retail_inventory_balances SET on_hand=on_hand+p_delta,updated_at=now() WHERE product_id=p_product AND on_hand+p_delta>=reserved; IF NOT FOUND THEN RAISE EXCEPTION 'insufficient or missing inventory'; END IF; END IF; END $$;
CREATE OR REPLACE FUNCTION retail_reserve_inventory(p_product UUID, p_quantity BIGINT, p_reason TEXT, p_key UUID) RETURNS VOID LANGUAGE plpgsql AS $$ BEGIN IF p_quantity<=0 THEN RAISE EXCEPTION 'invalid quantity'; END IF; INSERT INTO retail_inventory_ledger(product_id,delta_reserved,reason,idempotency_key) VALUES(p_product,p_quantity,p_reason,p_key) ON CONFLICT(idempotency_key) DO NOTHING; IF FOUND THEN UPDATE retail_inventory_balances SET reserved=reserved+p_quantity,updated_at=now() WHERE product_id=p_product AND on_hand-reserved>=p_quantity RETURNING product_id INTO p_product; IF NOT FOUND THEN RAISE EXCEPTION 'insufficient or missing inventory'; END IF; END IF; END $$;
CREATE OR REPLACE FUNCTION retail_release_expired_reservations() RETURNS INT LANGUAGE plpgsql AS $$
DECLARE r RECORD; n INT := 0; updated INT;
BEGIN
  -- Lock individual reservations in stable product order.  Each balance is
  -- verified before the reservation state is changed; an exception rolls the
  -- complete function back, including prior products in this invocation.
  FOR r IN SELECT rv.id,rv.order_id,rv.product_id,rv.quantity FROM retail_inventory_reservations rv
    LEFT JOIN retail_orders o ON o.id=rv.order_id
    WHERE rv.status='active' AND rv.expires_at < now() AND COALESCE(o.status,'pending') <> 'capturing'
    ORDER BY rv.product_id,rv.id FOR UPDATE OF rv
  LOOP
    PERFORM 1 FROM retail_inventory_balances WHERE product_id=r.product_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'missing inventory balance for expired reservation'; END IF;
    UPDATE retail_inventory_balances SET reserved=reserved-r.quantity,updated_at=now()
      WHERE product_id=r.product_id AND reserved>=r.quantity;
    GET DIAGNOSTICS updated=ROW_COUNT;
    IF updated <> 1 THEN RAISE EXCEPTION 'insufficient reserved inventory for expired reservation'; END IF;
    UPDATE retail_inventory_reservations SET status='expired' WHERE id=r.id AND status='active';
    IF NOT FOUND THEN RAISE EXCEPTION 'expired reservation state changed concurrently'; END IF;
    INSERT INTO retail_inventory_ledger(product_id,delta_reserved,reason,idempotency_key,reference_id)
      VALUES(r.product_id,-r.quantity,'reservation_expired',r.id,r.id)
      ON CONFLICT(idempotency_key) DO NOTHING;
    -- Multi-item holds expire item-by-item.  Only mark the checkout expired
    -- once its final active hold is gone; captures already in flight stay out
    -- of this function's selection above.
    UPDATE retail_orders o SET status='expired',capturing_started_at=NULL,updated_at=now()
      WHERE o.id=r.order_id AND o.status IN ('pending','created','approved')
        AND NOT EXISTS(SELECT 1 FROM retail_inventory_reservations pending WHERE pending.order_id=o.id AND pending.status='active');
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;
CREATE OR REPLACE FUNCTION retail_consume_reservation(p_reservation UUID, p_key UUID) RETURNS VOID LANGUAGE plpgsql AS $$ DECLARE r retail_inventory_reservations%ROWTYPE; BEGIN SELECT * INTO r FROM retail_inventory_reservations WHERE id=p_reservation FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'reservation unavailable'; END IF; IF r.status='consumed' AND EXISTS(SELECT 1 FROM retail_inventory_ledger WHERE idempotency_key=p_key) THEN RETURN; END IF; IF r.status<>'active' THEN RAISE EXCEPTION 'reservation unavailable'; END IF; INSERT INTO retail_inventory_ledger(product_id,delta_on_hand,delta_reserved,reason,idempotency_key,reference_id) VALUES(r.product_id,-r.quantity,-r.quantity,'payment_capture',p_key,r.id) ON CONFLICT(idempotency_key) DO NOTHING; IF FOUND THEN UPDATE retail_inventory_balances SET on_hand=on_hand-r.quantity,reserved=reserved-r.quantity,updated_at=now() WHERE product_id=r.product_id AND on_hand>=r.quantity AND reserved>=r.quantity; IF NOT FOUND THEN RAISE EXCEPTION 'inventory state invalid'; END IF; UPDATE retail_inventory_reservations SET status='consumed' WHERE id=r.id; END IF; END $$;
CREATE OR REPLACE FUNCTION retail_fulfil_order(p_order BIGINT,p_carrier TEXT,p_tracking TEXT,p_note TEXT,p_key UUID) RETURNS VOID LANGUAGE plpgsql AS $$ BEGIN IF EXISTS(SELECT 1 FROM retail_admin_audit WHERE action='fulfil' AND entity_type='order' AND entity_id=p_order::text AND detail->>'key'=p_key::text) THEN RETURN; END IF; IF NOT EXISTS(SELECT 1 FROM retail_orders WHERE id=p_order AND status='captured') THEN RAISE EXCEPTION 'only captured orders may be fulfilled'; END IF; INSERT INTO retail_admin_audit(action,entity_type,entity_id,detail) VALUES('fulfil','order',p_order::text,jsonb_build_object('carrier',p_carrier,'tracking',p_tracking,'key',p_key)); UPDATE retail_orders SET fulfilment_status='fulfilled',carrier=p_carrier,tracking_number=p_tracking,admin_note=p_note WHERE id=p_order; END $$;
CREATE OR REPLACE FUNCTION retail_change_price(p_public_id UUID,p_amount BIGINT,p_key UUID,p_reason TEXT,p_actor TEXT) RETURNS BOOLEAN LANGUAGE plpgsql AS $$ DECLARE p UUID; BEGIN SELECT id INTO p FROM retail_products WHERE public_id=p_public_id FOR UPDATE; IF NOT FOUND OR p_amount<=0 THEN RAISE EXCEPTION 'invalid product or price'; END IF; IF EXISTS(SELECT 1 FROM retail_price_history WHERE idempotency_key=p_key) THEN RETURN false; END IF; UPDATE retail_price_history SET active=false WHERE product_id=p AND active=true; INSERT INTO retail_price_history(product_id,amount_minor,idempotency_key,changed_by) VALUES(p,p_amount,p_key,p_actor||':'||p_reason); RETURN true; END $$;
CREATE OR REPLACE FUNCTION retail_update_reconciliation(p_ledger UUID,p_status TEXT,p_note TEXT,p_key UUID) RETURNS VOID LANGUAGE plpgsql AS $$ BEGIN IF EXISTS(SELECT 1 FROM retail_admin_audit WHERE action='ledger.reconcile' AND entity_id=p_ledger::text AND detail->>'key'=p_key::text) THEN RETURN; END IF; UPDATE retail_payment_ledger SET reconciliation_status=p_status WHERE id=p_ledger; IF NOT FOUND THEN RAISE EXCEPTION 'ledger not found'; END IF; INSERT INTO retail_admin_audit(action,entity_type,entity_id,detail) VALUES('ledger.reconcile','ledger',p_ledger::text,jsonb_build_object('status',p_status,'note',p_note,'key',p_key)); END $$;
CREATE OR REPLACE FUNCTION retail_upsert_customer_address(p_customer UUID,p_address UUID,p_recipient TEXT,p_line1 TEXT,p_line2 TEXT,p_city TEXT,p_region TEXT,p_postal TEXT,p_country TEXT,p_phone TEXT,p_default BOOLEAN,p_archive BOOLEAN) RETURNS UUID LANGUAGE plpgsql AS $$ DECLARE c UUID; DECLARE out_id UUID; BEGIN SELECT id INTO c FROM retail_customers WHERE public_id=p_customer FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'customer not found'; END IF; IF p_default THEN UPDATE retail_addresses SET is_default=false,updated_at=now() WHERE customer_id=c AND archived_at IS NULL; END IF; IF p_address IS NULL THEN INSERT INTO retail_addresses(customer_id,recipient,line1,line2,city,region,postal_code,country,phone,is_default) VALUES(c,p_recipient,p_line1,p_line2,p_city,p_region,p_postal,p_country,p_phone,COALESCE(p_default,false)) RETURNING id INTO out_id; ELSE UPDATE retail_addresses SET recipient=COALESCE(p_recipient,recipient),line1=COALESCE(p_line1,line1),line2=COALESCE(p_line2,line2),city=COALESCE(p_city,city),region=COALESCE(p_region,region),postal_code=COALESCE(p_postal,postal_code),country=COALESCE(p_country,country),phone=COALESCE(p_phone,phone),is_default=COALESCE(p_default,is_default),archived_at=CASE WHEN p_archive THEN now() ELSE archived_at END,updated_at=now() WHERE id=p_address AND customer_id=c RETURNING id INTO out_id; END IF; IF out_id IS NULL THEN RAISE EXCEPTION 'address not found'; END IF; RETURN out_id; END $$;

CREATE OR REPLACE FUNCTION retail_attach_product_image(p_public_id UUID,p_url TEXT,p_key TEXT,p_mime TEXT,p_bytes BIGINT,p_sha256 TEXT,p_alt_en TEXT,p_alt_ar TEXT) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE p UUID; image_id UUID;
BEGIN
  SELECT id INTO p FROM retail_products WHERE public_id=p_public_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'product not found'; END IF;
  IF (SELECT count(*) FROM retail_product_images WHERE product_id=p) >= 8 THEN RAISE EXCEPTION 'product image limit reached'; END IF;
  INSERT INTO retail_product_images(product_id,blob_url,blob_key,mime_type,bytes,sha256,position,alt_en,alt_ar)
    VALUES(p,p_url,p_key,p_mime,p_bytes,p_sha256,
      COALESCE((SELECT max(position)+1 FROM retail_product_images WHERE product_id=p),0),p_alt_en,p_alt_ar)
    RETURNING id INTO image_id;
  RETURN image_id;
END $$;

CREATE OR REPLACE FUNCTION retail_detach_product_image(p_image UUID) RETURNS TABLE(blob_url TEXT,blob_key TEXT) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY WITH removed AS (
    DELETE FROM retail_product_images WHERE id=p_image RETURNING retail_product_images.blob_url,retail_product_images.blob_key
  ), queued AS (
    INSERT INTO retail_blob_delete_outbox(blob_url) SELECT removed.blob_url FROM removed ON CONFLICT(blob_url) DO NOTHING
  ) SELECT removed.blob_url,removed.blob_key FROM removed;
END $$;

-- The checkout quote and stock hold are one database operation.  Do not move
-- this logic into a sequence of Neon HTTP calls: concurrent checkouts would
-- otherwise oversell before a PayPal order exists.
CREATE OR REPLACE FUNCTION retail_create_checkout(p_request UUID,p_items JSONB)
RETURNS TABLE(order_id BIGINT,paypal_order_id TEXT,currency CHAR(3),amount_minor BIGINT,items_snapshot JSONB,status TEXT)
LANGUAGE plpgsql AS $$
DECLARE existing retail_orders%ROWTYPE; r RECORD; item JSONB := '[]'::jsonb; requested JSONB; prior_requested JSONB; total BIGINT := 0; actual_count INT := 0; requested_count INT;
BEGIN
  -- Reclaim stale holds in the same transaction before reading live stock.
  PERFORM retail_release_expired_reservations();
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items)=0 OR jsonb_array_length(p_items)>10 THEN RAISE EXCEPTION 'invalid cart'; END IF;
  SELECT count(*) INTO requested_count FROM jsonb_array_elements(p_items);
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_items) x WHERE jsonb_typeof(x)<>'object' OR COALESCE(x->>'sku','')='' OR COALESCE(x->>'quantity','') !~ '^(?:[1-9]|10)$') THEN RAISE EXCEPTION 'invalid cart'; END IF;
  IF EXISTS(SELECT sku FROM (SELECT x->>'sku' sku FROM jsonb_array_elements(p_items) x) d GROUP BY sku HAVING count(*)>1) THEN RAISE EXCEPTION 'duplicate sku'; END IF;
  SELECT jsonb_agg(jsonb_build_object('sku',x->>'sku','quantity',(x->>'quantity')::BIGINT) ORDER BY x->>'sku') INTO requested FROM jsonb_array_elements(p_items) x;
  -- An idempotent retry returns its original immutable quote before checking
  -- current product visibility, price, or stock (including its own hold).
  SELECT * INTO existing FROM retail_orders WHERE client_request_id=p_request FOR UPDATE;
  IF FOUND THEN
    SELECT jsonb_agg(jsonb_build_object('sku',x->>'sku','quantity',(x->>'quantity')::BIGINT) ORDER BY x->>'sku') INTO prior_requested FROM jsonb_array_elements(existing.items_snapshot) x;
    IF prior_requested <> requested THEN RAISE EXCEPTION 'idempotency conflict'; END IF;
    -- The client must create a brand-new request id after the reservation has
    -- expired. Returning its historic PayPal id would make an invalid hold
    -- appear payable again.
    IF existing.status='expired' THEN RAISE EXCEPTION 'checkout_expired'; END IF;
    RETURN QUERY SELECT existing.id,existing.paypal_order_id,existing.currency,existing.amount_minor,existing.items_snapshot,existing.status;
    RETURN;
  END IF;

  -- Lock product and balance rows in SKU order, which makes simultaneous carts
  -- serialize deterministically.
  FOR r IN SELECT p.id,p.sku,b.on_hand,b.reserved,h.amount_minor,(x->>'quantity')::BIGINT quantity
    FROM jsonb_array_elements(p_items) x
    JOIN retail_products p ON p.sku=x->>'sku' AND p.status='published'
    JOIN retail_inventory_balances b ON b.product_id=p.id
    JOIN LATERAL (SELECT ph.amount_minor FROM retail_price_history ph WHERE ph.product_id=p.id AND ph.active=true ORDER BY ph.created_at DESC LIMIT 1) h ON true
    ORDER BY p.sku FOR UPDATE OF p,b
  LOOP
    actual_count := actual_count+1;
    IF r.on_hand-r.reserved < r.quantity THEN RAISE EXCEPTION 'unavailable sku'; END IF;
    item := item || jsonb_build_array(jsonb_build_object('sku',r.sku,'quantity',r.quantity,'unitAmountMinor',r.amount_minor));
    IF r.quantity*r.amount_minor > 900000000000000 - total THEN RAISE EXCEPTION 'invalid cart total'; END IF;
    total := total + r.quantity*r.amount_minor;
  END LOOP;
  IF actual_count <> requested_count OR total<=0 THEN RAISE EXCEPTION 'unknown sku'; END IF;

  INSERT INTO retail_orders(client_request_id,currency,amount_minor,status,items_snapshot) VALUES(p_request,'USD',total,'pending',item) RETURNING id INTO order_id;
  FOR r IN SELECT p.id,p.sku,(x->>'quantity')::BIGINT quantity FROM jsonb_array_elements(item) x JOIN retail_products p ON p.sku=x->>'sku' ORDER BY p.sku LOOP
    UPDATE retail_inventory_balances SET reserved=reserved+r.quantity,updated_at=now() WHERE product_id=r.id AND on_hand-reserved>=r.quantity;
    IF NOT FOUND THEN RAISE EXCEPTION 'inventory changed during checkout'; END IF;
    INSERT INTO retail_inventory_reservations(order_id,request_id,product_id,quantity,status,expires_at,idempotency_key)
      VALUES(order_id,p_request,r.id,r.quantity,'active',now()+interval '15 minutes',md5(p_request::text||':'||r.sku)::uuid);
    INSERT INTO retail_inventory_ledger(product_id,delta_reserved,reason,idempotency_key)
      VALUES(r.id,r.quantity,'checkout_reservation',md5('reserve:'||p_request::text||':'||r.sku)::uuid);
  END LOOP;
  RETURN QUERY SELECT o.id,o.paypal_order_id,o.currency,o.amount_minor,o.items_snapshot,o.status FROM retail_orders o WHERE o.id=order_id;
END $$;

CREATE OR REPLACE FUNCTION retail_apply_paypal_capture(p_paypal_order TEXT,p_capture TEXT,p_customer JSONB DEFAULT '{}'::jsonb,p_shipping JSONB DEFAULT '{}'::jsonb,p_fee BIGINT DEFAULT NULL,p_net BIGINT DEFAULT NULL)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE o retail_orders%ROWTYPE; r RECORD; v_customer_id UUID; buyer_email TEXT; buyer_name TEXT; reservation_count INT;
BEGIN
  SELECT * INTO o FROM retail_orders WHERE paypal_order_id=p_paypal_order FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF o.status='captured' AND o.capture_id=p_capture THEN
    IF (p_fee IS NULL) <> (p_net IS NULL) OR (p_fee IS NOT NULL AND (p_fee < 0 OR p_fee+p_net <> o.amount_minor)) THEN RAISE EXCEPTION 'invalid paypal fee breakdown'; END IF;
    INSERT INTO retail_payment_ledger(order_id,kind,amount_minor,currency,paypal_reference,idempotency_key) VALUES(o.id,'payment',o.amount_minor,o.currency,p_capture,md5('payment:'||p_capture)::uuid) ON CONFLICT(idempotency_key) DO NOTHING;
    IF p_fee IS NOT NULL THEN INSERT INTO retail_payment_ledger(order_id,kind,amount_minor,currency,paypal_reference,idempotency_key) VALUES(o.id,'fee',-p_fee,o.currency,'fee:'||p_capture,md5('fee:'||p_capture)::uuid) ON CONFLICT(idempotency_key) DO NOTHING; END IF;
    UPDATE retail_order_snapshots SET customer_snapshot=CASE WHEN customer_snapshot='{}'::jsonb AND p_customer<>'{}'::jsonb THEN p_customer ELSE customer_snapshot END,shipping_snapshot=CASE WHEN shipping_snapshot='{}'::jsonb AND p_shipping<>'{}'::jsonb THEN p_shipping ELSE shipping_snapshot END WHERE order_id=p_paypal_order;
    RETURN true;
  END IF;
  IF o.status NOT IN ('pending','created','approved','capturing') THEN RETURN false; END IF;
  SELECT count(*) INTO reservation_count FROM retail_inventory_reservations WHERE order_id=o.id AND status='active';
  IF reservation_count <> jsonb_array_length(o.items_snapshot) THEN RAISE EXCEPTION 'active inventory reservation unavailable'; END IF;
  FOR r IN SELECT * FROM retail_inventory_reservations WHERE order_id=o.id AND status='active' ORDER BY product_id,id FOR UPDATE LOOP
    UPDATE retail_inventory_balances SET on_hand=on_hand-r.quantity,reserved=reserved-r.quantity,updated_at=now() WHERE product_id=r.product_id AND on_hand>=r.quantity AND reserved>=r.quantity;
    IF NOT FOUND THEN RAISE EXCEPTION 'inventory state invalid at capture'; END IF;
    UPDATE retail_inventory_reservations SET status='consumed' WHERE id=r.id;
    INSERT INTO retail_inventory_ledger(product_id,delta_on_hand,delta_reserved,reason,idempotency_key,reference_id) VALUES(r.product_id,-r.quantity,-r.quantity,'payment_capture',md5('capture:'||p_capture||':'||r.id::text)::uuid,r.id) ON CONFLICT(idempotency_key) DO NOTHING;
  END LOOP;
  UPDATE retail_orders SET status='captured',capture_id=p_capture,captured_at=COALESCE(captured_at,now()),capturing_started_at=NULL,updated_at=now() WHERE id=o.id;
  IF (p_fee IS NULL) <> (p_net IS NULL) OR (p_fee IS NOT NULL AND (p_fee < 0 OR p_fee+p_net <> o.amount_minor)) THEN RAISE EXCEPTION 'invalid paypal fee breakdown'; END IF;
  INSERT INTO retail_payment_ledger(order_id,kind,amount_minor,currency,paypal_reference,idempotency_key) VALUES(o.id,'payment',o.amount_minor,o.currency,p_capture,md5('payment:'||p_capture)::uuid) ON CONFLICT(idempotency_key) DO NOTHING;
  IF p_fee IS NOT NULL THEN INSERT INTO retail_payment_ledger(order_id,kind,amount_minor,currency,paypal_reference,idempotency_key) VALUES(o.id,'fee',-p_fee,o.currency,'fee:'||p_capture,md5('fee:'||p_capture)::uuid) ON CONFLICT(idempotency_key) DO NOTHING; END IF;
  buyer_email := NULLIF(lower(p_customer->>'email'),''); buyer_name := COALESCE(NULLIF(p_customer->>'name',''),'PayPal customer');
  IF buyer_email IS NOT NULL THEN INSERT INTO retail_customers(email,name) VALUES(buyer_email,buyer_name) ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name RETURNING id INTO v_customer_id; END IF;
  INSERT INTO retail_order_snapshots(order_id,customer_snapshot,shipping_snapshot,items_snapshot) VALUES(p_paypal_order,p_customer,p_shipping,o.items_snapshot) ON CONFLICT(order_id) DO NOTHING;
  IF v_customer_id IS NOT NULL AND COALESCE(p_shipping->>'line1','')<>'' AND COALESCE(p_shipping->>'recipient','')<>'' AND COALESCE(p_shipping->>'city','')<>'' AND COALESCE(p_shipping->>'country','') ~ '^[A-Z]{2}$' THEN
    INSERT INTO retail_addresses(customer_id,recipient,line1,line2,city,region,postal_code,country,phone,is_default) VALUES(v_customer_id,p_shipping->>'recipient',p_shipping->>'line1',p_shipping->>'line2',p_shipping->>'city',p_shipping->>'region',p_shipping->>'postalCode',p_shipping->>'country',p_shipping->>'phone',NOT EXISTS(SELECT 1 FROM retail_addresses a WHERE a.customer_id=v_customer_id AND a.archived_at IS NULL));
  END IF;
  RETURN true;
END $$;

-- Keep the public compatibility function from the payments migration, while
-- making its successful path write the operational accounting ledger exactly
-- once.  Refund stock is deliberately not auto-restocked: physical returns are
-- an explicit admin inventory adjustment.
CREATE OR REPLACE FUNCTION retail_apply_paypal_refund(should_process BOOLEAN,refund_id TEXT,related_capture_id TEXT,refund_currency TEXT,refund_amount_minor BIGINT)
RETURNS TABLE (paypal_order_id TEXT, outcome TEXT) LANGUAGE plpgsql AS $$
DECLARE target retail_orders%ROWTYPE; existing retail_refunds%ROWTYPE;
BEGIN
  IF NOT should_process OR refund_id IS NULL OR related_capture_id IS NULL OR refund_currency IS NULL OR refund_amount_minor IS NULL OR refund_amount_minor<=0 THEN RETURN; END IF;
  SELECT * INTO existing FROM retail_refunds WHERE paypal_refund_id=refund_id;
  IF FOUND THEN
    IF existing.capture_id=related_capture_id AND existing.currency=refund_currency AND existing.amount_minor=refund_amount_minor THEN RETURN QUERY SELECT existing.paypal_order_id,'duplicate'::TEXT; END IF;
    RETURN;
  END IF;
  SELECT * INTO target FROM retail_orders WHERE capture_id=related_capture_id AND currency=refund_currency FOR UPDATE;
  IF NOT FOUND OR target.refunded_minor+refund_amount_minor>target.amount_minor THEN RETURN; END IF;
  INSERT INTO retail_refunds(paypal_refund_id,paypal_order_id,capture_id,currency,amount_minor) VALUES(refund_id,target.paypal_order_id,related_capture_id,refund_currency,refund_amount_minor);
  UPDATE retail_orders SET refunded_minor=refunded_minor+refund_amount_minor,status=CASE WHEN refunded_minor+refund_amount_minor=amount_minor THEN 'refunded' ELSE status END,updated_at=now() WHERE id=target.id;
  INSERT INTO retail_payment_ledger(order_id,kind,amount_minor,currency,paypal_reference,idempotency_key) VALUES(target.id,'refund',-refund_amount_minor,refund_currency,refund_id,md5('refund:'||refund_id)::uuid) ON CONFLICT(idempotency_key) DO NOTHING;
  RETURN QUERY SELECT target.paypal_order_id,'processed'::TEXT;
END $$;

CREATE OR REPLACE FUNCTION retail_release_order_reservations(p_paypal_order TEXT,p_reason TEXT) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE o retail_orders%ROWTYPE; r RECORD;
BEGIN
  SELECT * INTO o FROM retail_orders WHERE paypal_order_id=p_paypal_order FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  FOR r IN SELECT * FROM retail_inventory_reservations WHERE order_id=o.id AND status='active' ORDER BY product_id,id FOR UPDATE LOOP
    UPDATE retail_inventory_balances SET reserved=reserved-r.quantity,updated_at=now() WHERE product_id=r.product_id AND reserved>=r.quantity;
    IF NOT FOUND THEN RAISE EXCEPTION 'reservation balance invalid'; END IF;
    UPDATE retail_inventory_reservations SET status='released' WHERE id=r.id;
    INSERT INTO retail_inventory_ledger(product_id,delta_reserved,reason,idempotency_key,reference_id) VALUES(r.product_id,-r.quantity,p_reason,md5(p_reason||':'||r.id::text)::uuid,r.id) ON CONFLICT(idempotency_key) DO NOTHING;
  END LOOP;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION retail_apply_paypal_reversal(p_capture TEXT,p_event TEXT,p_currency TEXT,p_amount BIGINT) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE o retail_orders%ROWTYPE;
BEGIN
  SELECT * INTO o FROM retail_orders WHERE capture_id=p_capture AND currency=p_currency FOR UPDATE;
  IF NOT FOUND OR p_event IS NULL OR p_amount IS NULL OR p_amount<>o.amount_minor THEN RETURN false; END IF;
  UPDATE retail_orders SET status='reversed',updated_at=now() WHERE id=o.id AND status IN ('captured','refunded','reversed');
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO retail_payment_ledger(order_id,kind,amount_minor,currency,paypal_reference,idempotency_key) VALUES(o.id,'reversal',-p_amount,p_currency,p_event,md5('reversal:'||p_event)::uuid) ON CONFLICT(idempotency_key) DO NOTHING;
  RETURN true;
END $$;

-- Posting ledger: amounts are signed. The legacy `net` enum value remains
-- readable for compatibility but is not generated or included in net totals.
CREATE OR REPLACE FUNCTION retail_payment_posting_summary()
RETURNS TABLE(gross_minor BIGINT,fee_minor BIGINT,refund_minor BIGINT,reversal_minor BIGINT,net_minor BIGINT)
LANGUAGE sql STABLE AS $$
  SELECT
    COALESCE(sum(amount_minor) FILTER (WHERE kind='payment'),0)::BIGINT,
    COALESCE(sum(amount_minor) FILTER (WHERE kind='fee'),0)::BIGINT,
    COALESCE(sum(amount_minor) FILTER (WHERE kind='refund'),0)::BIGINT,
    COALESCE(sum(amount_minor) FILTER (WHERE kind='reversal'),0)::BIGINT,
    COALESCE(sum(amount_minor) FILTER (WHERE kind IN ('payment','fee','refund','reversal')),0)::BIGINT
  FROM retail_payment_ledger;
$$;
