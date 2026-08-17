-- Admin write consistency hardening. This follows the immutable checkout and
-- operations migrations; it is intentionally safe to apply exactly once.
CREATE TABLE IF NOT EXISTS retail_admin_idempotency (
  idempotency_key UUID PRIMARY KEY,
  operation TEXT NOT NULL,
  request_payload JSONB NOT NULL,
  response_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION retail_create_admin_product(
  p_sku TEXT,p_slug TEXT,p_title_en TEXT,p_title_ar TEXT,p_description_en TEXT,p_description_ar TEXT,
  p_status TEXT,p_amount_minor BIGINT,p_key UUID
) RETURNS TABLE(public_id UUID,replayed BOOLEAN) LANGUAGE plpgsql AS $$
DECLARE payload JSONB; prior retail_admin_idempotency%ROWTYPE; p_id UUID; p_public UUID;
BEGIN
  IF p_status NOT IN ('draft','archived') OR p_amount_minor<=0 THEN RAISE EXCEPTION 'invalid product state'; END IF;
  payload:=jsonb_build_object('sku',p_sku,'slug',p_slug,'titleEn',p_title_en,'titleAr',p_title_ar,'descriptionEn',p_description_en,'descriptionAr',p_description_ar,'status',p_status,'amountMinor',p_amount_minor);
  -- The advisory lock closes the insert-race before the key record exists.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_key::text,0));
  SELECT * INTO prior FROM retail_admin_idempotency WHERE idempotency_key=p_key FOR UPDATE;
  IF FOUND THEN
    IF prior.operation<>'product.create' OR prior.request_payload<>payload THEN RAISE EXCEPTION 'idempotency conflict'; END IF;
    RETURN QUERY SELECT (prior.response_payload->>'publicId')::uuid,true;
    RETURN;
  END IF;
  INSERT INTO retail_admin_idempotency(idempotency_key,operation,request_payload) VALUES(p_key,'product.create',payload);
  INSERT INTO retail_products(sku,slug,title_en,title_ar,description_en,description_ar,status)
    VALUES(p_sku,p_slug,p_title_en,p_title_ar,p_description_en,p_description_ar,p_status) RETURNING id,retail_products.public_id INTO p_id,p_public;
  INSERT INTO retail_price_history(product_id,amount_minor,idempotency_key,changed_by) VALUES(p_id,p_amount_minor,p_key,'admin');
  INSERT INTO retail_inventory_balances(product_id) VALUES(p_id);
  INSERT INTO retail_admin_audit(action,entity_type,entity_id,detail,idempotency_key)
    VALUES('product.create','product',p_public::text,jsonb_build_object('sku',p_sku,'status',p_status),p_key) ON CONFLICT(idempotency_key) DO NOTHING;
  UPDATE retail_admin_idempotency SET response_payload=jsonb_build_object('publicId',p_public) WHERE idempotency_key=p_key;
  RETURN QUERY SELECT p_public,false;
END $$;

CREATE OR REPLACE FUNCTION retail_update_admin_customer(
  p_customer UUID,p_name TEXT,p_address UUID,p_recipient TEXT,p_line1 TEXT,p_line2 TEXT,p_city TEXT,p_region TEXT,
  p_postal TEXT,p_country TEXT,p_phone TEXT,p_default BOOLEAN,p_archive BOOLEAN,p_has_address BOOLEAN,p_key UUID
) RETURNS TABLE(address_id UUID,replayed BOOLEAN) LANGUAGE plpgsql AS $$
DECLARE payload JSONB; prior retail_admin_idempotency%ROWTYPE; customer_row retail_customers%ROWTYPE; out_id UUID;
BEGIN
  payload:=jsonb_build_object('customerId',p_customer,'name',p_name,'addressId',p_address,'recipient',p_recipient,'line1',p_line1,'line2',p_line2,'city',p_city,'region',p_region,'postalCode',p_postal,'country',p_country,'phone',p_phone,'isDefault',p_default,'archive',p_archive,'hasAddress',p_has_address);
  PERFORM pg_advisory_xact_lock(hashtextextended(p_key::text,0));
  SELECT * INTO prior FROM retail_admin_idempotency WHERE idempotency_key=p_key FOR UPDATE;
  IF FOUND THEN
    IF prior.operation<>'customer.update' OR prior.request_payload<>payload THEN RAISE EXCEPTION 'idempotency conflict'; END IF;
    RETURN QUERY SELECT NULLIF(prior.response_payload->>'addressId','')::uuid,true;
    RETURN;
  END IF;
  SELECT * INTO customer_row FROM retail_customers WHERE public_id=p_customer FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'customer not found'; END IF;
  INSERT INTO retail_admin_idempotency(idempotency_key,operation,request_payload) VALUES(p_key,'customer.update',payload);
  UPDATE retail_customers SET name=COALESCE(p_name,name) WHERE id=customer_row.id;
  IF p_has_address THEN
    IF p_default THEN UPDATE retail_addresses SET is_default=false,updated_at=now() WHERE customer_id=customer_row.id AND archived_at IS NULL; END IF;
    IF p_address IS NULL THEN
      INSERT INTO retail_addresses(customer_id,recipient,line1,line2,city,region,postal_code,country,phone,is_default)
        VALUES(customer_row.id,p_recipient,p_line1,p_line2,p_city,p_region,p_postal,p_country,p_phone,COALESCE(p_default,false)) RETURNING id INTO out_id;
    ELSE
      UPDATE retail_addresses SET recipient=COALESCE(p_recipient,recipient),line1=COALESCE(p_line1,line1),line2=COALESCE(p_line2,line2),city=COALESCE(p_city,city),region=COALESCE(p_region,region),postal_code=COALESCE(p_postal,postal_code),country=COALESCE(p_country,country),phone=COALESCE(p_phone,phone),is_default=COALESCE(p_default,is_default),archived_at=CASE WHEN p_archive THEN now() ELSE archived_at END,updated_at=now() WHERE id=p_address AND customer_id=customer_row.id RETURNING id INTO out_id;
    END IF;
    IF out_id IS NULL THEN RAISE EXCEPTION 'address not found'; END IF;
  END IF;
  INSERT INTO retail_admin_audit(action,entity_type,entity_id,detail,idempotency_key) VALUES('customer.update','customer',p_customer::text,payload,p_key) ON CONFLICT(idempotency_key) DO NOTHING;
  UPDATE retail_admin_idempotency SET response_payload=jsonb_build_object('addressId',out_id) WHERE idempotency_key=p_key;
  RETURN QUERY SELECT out_id,false;
END $$;

CREATE OR REPLACE FUNCTION retail_fulfil_order(p_order BIGINT,p_carrier TEXT,p_tracking TEXT,p_note TEXT,p_key UUID) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE o retail_orders%ROWTYPE; prior retail_admin_audit%ROWTYPE; payload JSONB;
BEGIN
  payload:=jsonb_build_object('carrier',p_carrier,'tracking',p_tracking,'note',p_note);
  SELECT * INTO o FROM retail_orders WHERE id=p_order FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order not found'; END IF;
  SELECT * INTO prior FROM retail_admin_audit WHERE idempotency_key=p_key FOR UPDATE;
  IF FOUND THEN
    IF prior.action<>'order.fulfil' OR prior.entity_type<>'order' OR prior.entity_id<>p_order::text OR prior.detail<>payload THEN RAISE EXCEPTION 'idempotency conflict'; END IF;
    RETURN;
  END IF;
  IF o.status<>'captured' OR o.fulfilment_status<>'unfulfilled' OR EXISTS(SELECT 1 FROM retail_refund_requests WHERE order_id=p_order AND status='pending') THEN RAISE EXCEPTION 'order is not fulfilable'; END IF;
  UPDATE retail_orders SET fulfilment_status='fulfilled',carrier=p_carrier,tracking_number=p_tracking,admin_note=p_note,updated_at=now() WHERE id=p_order AND status='captured' AND fulfilment_status='unfulfilled';
  IF NOT FOUND THEN RAISE EXCEPTION 'order state changed concurrently'; END IF;
  INSERT INTO retail_admin_audit(action,entity_type,entity_id,detail,idempotency_key) VALUES('order.fulfil','order',p_order::text,payload,p_key);
END $$;

CREATE OR REPLACE FUNCTION retail_attach_product_image_idempotent(
  p_public_id UUID,p_url TEXT,p_key TEXT,p_mime TEXT,p_bytes BIGINT,p_sha256 TEXT,p_alt_en TEXT,p_alt_ar TEXT,p_idempotency UUID
) RETURNS TABLE(id UUID,blob_url TEXT,replayed BOOLEAN) LANGUAGE plpgsql AS $$
DECLARE payload JSONB; prior retail_admin_idempotency%ROWTYPE; p UUID; image_id UUID;
BEGIN
  payload:=jsonb_build_object('productId',p_public_id,'blobKey',p_key,'mime',p_mime,'bytes',p_bytes,'sha256',p_sha256,'altEn',p_alt_en,'altAr',p_alt_ar);
  PERFORM pg_advisory_xact_lock(hashtextextended(p_idempotency::text,0));
  SELECT * INTO prior FROM retail_admin_idempotency WHERE idempotency_key=p_idempotency FOR UPDATE;
  IF FOUND THEN
    IF prior.operation<>'product.image.attach' OR prior.request_payload<>payload THEN RAISE EXCEPTION 'idempotency conflict'; END IF;
    RETURN QUERY SELECT (prior.response_payload->>'id')::uuid,prior.response_payload->>'url',true;
    RETURN;
  END IF;
  SELECT retail_products.id INTO p FROM retail_products WHERE public_id=p_public_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'product not found'; END IF;
  IF (SELECT count(*) FROM retail_product_images WHERE product_id=p)>=8 THEN RAISE EXCEPTION 'product image limit reached'; END IF;
  INSERT INTO retail_admin_idempotency(idempotency_key,operation,request_payload) VALUES(p_idempotency,'product.image.attach',payload);
  INSERT INTO retail_product_images(product_id,blob_url,blob_key,mime_type,bytes,sha256,position,alt_en,alt_ar)
    VALUES(p,p_url,p_key,p_mime,p_bytes,p_sha256,COALESCE((SELECT max(position)+1 FROM retail_product_images WHERE product_id=p),0),p_alt_en,p_alt_ar) RETURNING retail_product_images.id INTO image_id;
  INSERT INTO retail_admin_audit(action,entity_type,entity_id,detail,idempotency_key) VALUES('product.image.attach','product',p_public_id::text,payload,p_idempotency) ON CONFLICT(idempotency_key) DO NOTHING;
  UPDATE retail_admin_idempotency SET response_payload=jsonb_build_object('id',image_id,'url',p_url) WHERE idempotency_key=p_idempotency;
  RETURN QUERY SELECT image_id,p_url,false;
END $$;

CREATE OR REPLACE FUNCTION retail_update_admin_product(
  p_public_id UUID,p_slug TEXT,p_title_en TEXT,p_title_ar TEXT,p_description_en TEXT,p_description_ar TEXT,p_status TEXT,p_key UUID
) RETURNS TABLE(public_id UUID,status TEXT,replayed BOOLEAN) LANGUAGE plpgsql AS $$
DECLARE payload JSONB; prior retail_admin_idempotency%ROWTYPE; out_status TEXT;
BEGIN
  payload:=jsonb_build_object('productId',p_public_id,'slug',p_slug,'titleEn',p_title_en,'titleAr',p_title_ar,'descriptionEn',p_description_en,'descriptionAr',p_description_ar,'status',p_status);
  PERFORM pg_advisory_xact_lock(hashtextextended(p_key::text,0));
  SELECT * INTO prior FROM retail_admin_idempotency WHERE idempotency_key=p_key FOR UPDATE;
  IF FOUND THEN
    IF prior.operation<>'product.update' OR prior.request_payload<>payload THEN RAISE EXCEPTION 'idempotency conflict'; END IF;
    RETURN QUERY SELECT (prior.response_payload->>'publicId')::uuid,prior.response_payload->>'status',true; RETURN;
  END IF;
  INSERT INTO retail_admin_idempotency(idempotency_key,operation,request_payload) VALUES(p_key,'product.update',payload);
  UPDATE retail_products p SET slug=COALESCE(p_slug,p.slug),title_en=COALESCE(p_title_en,p.title_en),title_ar=COALESCE(p_title_ar,p.title_ar),description_en=COALESCE(p_description_en,p.description_en),description_ar=COALESCE(p_description_ar,p.description_ar),status=COALESCE(p_status,p.status),updated_at=now()
    WHERE p.public_id=p_public_id AND (p_status IS DISTINCT FROM 'published' OR EXISTS(SELECT 1 FROM retail_product_images pi WHERE pi.product_id=p.id)) RETURNING p.status INTO out_status;
  IF NOT FOUND THEN RAISE EXCEPTION 'product not found or missing verified image'; END IF;
  INSERT INTO retail_admin_audit(action,entity_type,entity_id,detail,idempotency_key) VALUES('product.update','product',p_public_id::text,payload,p_key) ON CONFLICT(idempotency_key) DO NOTHING;
  UPDATE retail_admin_idempotency SET response_payload=jsonb_build_object('publicId',p_public_id,'status',out_status) WHERE idempotency_key=p_key;
  RETURN QUERY SELECT p_public_id,out_status,false;
END $$;

CREATE OR REPLACE FUNCTION retail_upsert_admin_shipping_zone(
  p_country TEXT,p_name_en TEXT,p_name_ar TEXT,p_shipping_minor BIGINT,p_free_threshold BIGINT,p_tax_bps INT,p_active BOOLEAN,p_key UUID
) RETURNS TABLE(country TEXT,name_en TEXT,name_ar TEXT,shipping_minor BIGINT,free_shipping_threshold_minor BIGINT,tax_rate_bps INT,active BOOLEAN,updated_at TIMESTAMPTZ,replayed BOOLEAN) LANGUAGE plpgsql AS $$
DECLARE payload JSONB; prior retail_admin_idempotency%ROWTYPE; zone retail_shipping_zones%ROWTYPE;
BEGIN
  payload:=jsonb_build_object('country',p_country,'nameEn',p_name_en,'nameAr',p_name_ar,'shippingMinor',p_shipping_minor,'freeShippingThresholdMinor',p_free_threshold,'taxRateBps',p_tax_bps,'active',p_active);
  PERFORM pg_advisory_xact_lock(hashtextextended(p_key::text,0)); SELECT * INTO prior FROM retail_admin_idempotency WHERE idempotency_key=p_key FOR UPDATE;
  IF FOUND THEN
    IF prior.operation<>'shipping.upsert' OR prior.request_payload<>payload THEN RAISE EXCEPTION 'idempotency conflict'; END IF;
    RETURN QUERY SELECT prior.response_payload->>'country',prior.response_payload->>'name_en',prior.response_payload->>'name_ar',(prior.response_payload->>'shipping_minor')::bigint,NULLIF(prior.response_payload->>'free_shipping_threshold_minor','')::bigint,(prior.response_payload->>'tax_rate_bps')::int,(prior.response_payload->>'active')::boolean,(prior.response_payload->>'updated_at')::timestamptz,true; RETURN;
  END IF;
  INSERT INTO retail_admin_idempotency(idempotency_key,operation,request_payload) VALUES(p_key,'shipping.upsert',payload);
  INSERT INTO retail_shipping_zones(country,name_en,name_ar,shipping_minor,free_shipping_threshold_minor,tax_rate_bps,active) VALUES(p_country,p_name_en,p_name_ar,p_shipping_minor,p_free_threshold,p_tax_bps,p_active)
    ON CONFLICT ON CONSTRAINT retail_shipping_zones_pkey DO UPDATE SET name_en=EXCLUDED.name_en,name_ar=EXCLUDED.name_ar,shipping_minor=EXCLUDED.shipping_minor,free_shipping_threshold_minor=EXCLUDED.free_shipping_threshold_minor,tax_rate_bps=EXCLUDED.tax_rate_bps,active=EXCLUDED.active,updated_at=now() RETURNING * INTO zone;
  INSERT INTO retail_admin_audit(action,entity_type,entity_id,detail,idempotency_key) VALUES('shipping_zone.upsert','shipping_zone',p_country,payload,p_key) ON CONFLICT(idempotency_key) DO NOTHING;
  UPDATE retail_admin_idempotency SET response_payload=to_jsonb(zone) WHERE idempotency_key=p_key;
  RETURN QUERY SELECT zone.country::text,zone.name_en,zone.name_ar,zone.shipping_minor,zone.free_shipping_threshold_minor,zone.tax_rate_bps,zone.active,zone.updated_at,false;
END $$;

CREATE OR REPLACE FUNCTION retail_disable_admin_shipping_zone(p_country TEXT,p_key UUID) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE payload JSONB:=jsonb_build_object('country',p_country); prior retail_admin_idempotency%ROWTYPE;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_key::text,0)); SELECT * INTO prior FROM retail_admin_idempotency WHERE idempotency_key=p_key FOR UPDATE;
  IF FOUND THEN IF prior.operation<>'shipping.disable' OR prior.request_payload<>payload THEN RAISE EXCEPTION 'idempotency conflict'; END IF; RETURN true; END IF;
  INSERT INTO retail_admin_idempotency(idempotency_key,operation,request_payload) VALUES(p_key,'shipping.disable',payload);
  UPDATE retail_shipping_zones SET active=false,updated_at=now() WHERE country=p_country;
  IF NOT FOUND THEN RAISE EXCEPTION 'shipping zone not found'; END IF;
  INSERT INTO retail_admin_audit(action,entity_type,entity_id,detail,idempotency_key) VALUES('shipping_zone.disable','shipping_zone',p_country,payload,p_key) ON CONFLICT(idempotency_key) DO NOTHING;
  UPDATE retail_admin_idempotency SET response_payload=jsonb_build_object('country',p_country) WHERE idempotency_key=p_key; RETURN true;
END $$;

CREATE OR REPLACE FUNCTION retail_change_product_price_with_audit(p_public_id UUID,p_amount BIGINT,p_key UUID,p_reason TEXT) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE payload JSONB; prior retail_admin_idempotency%ROWTYPE; changed BOOLEAN;
BEGIN
  payload:=jsonb_build_object('productId',p_public_id,'amountMinor',p_amount,'reason',p_reason); PERFORM pg_advisory_xact_lock(hashtextextended(p_key::text,0)); SELECT * INTO prior FROM retail_admin_idempotency WHERE idempotency_key=p_key FOR UPDATE;
  IF FOUND THEN IF prior.operation<>'product.price' OR prior.request_payload<>payload THEN RAISE EXCEPTION 'idempotency conflict'; END IF; RETURN false; END IF;
  INSERT INTO retail_admin_idempotency(idempotency_key,operation,request_payload) VALUES(p_key,'product.price',payload); SELECT retail_change_price(p_public_id,p_amount,p_key,p_reason,'admin') INTO changed;
  INSERT INTO retail_admin_audit(action,entity_type,entity_id,detail,idempotency_key) VALUES('product.price','product',p_public_id::text,payload,p_key) ON CONFLICT(idempotency_key) DO NOTHING;
  UPDATE retail_admin_idempotency SET response_payload=jsonb_build_object('changed',changed) WHERE idempotency_key=p_key; RETURN changed;
END $$;

CREATE OR REPLACE FUNCTION retail_adjust_inventory_with_audit(p_public_id UUID,p_delta BIGINT,p_reason TEXT,p_key UUID) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE payload JSONB; prior retail_admin_idempotency%ROWTYPE; product_id UUID;
BEGIN
  payload:=jsonb_build_object('productId',p_public_id,'delta',p_delta,'reason',p_reason); PERFORM pg_advisory_xact_lock(hashtextextended(p_key::text,0)); SELECT * INTO prior FROM retail_admin_idempotency WHERE idempotency_key=p_key FOR UPDATE;
  IF FOUND THEN IF prior.operation<>'inventory.adjust' OR prior.request_payload<>payload THEN RAISE EXCEPTION 'idempotency conflict'; END IF; RETURN false; END IF;
  SELECT id INTO product_id FROM retail_products WHERE public_id=p_public_id; IF NOT FOUND THEN RAISE EXCEPTION 'product not found'; END IF;
  INSERT INTO retail_admin_idempotency(idempotency_key,operation,request_payload) VALUES(p_key,'inventory.adjust',payload); PERFORM retail_adjust_inventory(product_id,p_delta,p_reason,p_key);
  INSERT INTO retail_admin_audit(action,entity_type,entity_id,detail,idempotency_key) VALUES('inventory.adjust','product',p_public_id::text,payload,p_key) ON CONFLICT(idempotency_key) DO NOTHING;
  UPDATE retail_admin_idempotency SET response_payload=jsonb_build_object('adjusted',true) WHERE idempotency_key=p_key; RETURN true;
END $$;

CREATE OR REPLACE FUNCTION retail_update_reconciliation(p_ledger UUID,p_status TEXT,p_note TEXT,p_key UUID) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE retail_payment_ledger SET reconciliation_status=p_status WHERE id=p_ledger; IF NOT FOUND THEN RAISE EXCEPTION 'ledger not found'; END IF;
  INSERT INTO retail_admin_audit(action,entity_type,entity_id,detail,idempotency_key) VALUES('ledger.reconcile','ledger',p_ledger::text,jsonb_build_object('status',p_status,'note',p_note),p_key) ON CONFLICT(idempotency_key) DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION retail_reconcile_with_audit(p_ledger UUID,p_status TEXT,p_note TEXT,p_key UUID) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE payload JSONB; prior retail_admin_idempotency%ROWTYPE;
BEGIN
  payload:=jsonb_build_object('ledgerId',p_ledger,'status',p_status,'note',p_note); PERFORM pg_advisory_xact_lock(hashtextextended(p_key::text,0)); SELECT * INTO prior FROM retail_admin_idempotency WHERE idempotency_key=p_key FOR UPDATE;
  IF FOUND THEN IF prior.operation<>'ledger.reconcile' OR prior.request_payload<>payload THEN RAISE EXCEPTION 'idempotency conflict'; END IF; RETURN false; END IF;
  INSERT INTO retail_admin_idempotency(idempotency_key,operation,request_payload) VALUES(p_key,'ledger.reconcile',payload); PERFORM retail_update_reconciliation(p_ledger,p_status,p_note,p_key);
  UPDATE retail_admin_idempotency SET response_payload=jsonb_build_object('updated',true) WHERE idempotency_key=p_key; RETURN true;
END $$;

CREATE OR REPLACE FUNCTION retail_cancel_order(p_order BIGINT,p_reason TEXT,p_key UUID) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE o retail_orders%ROWTYPE; r RECORD; prior retail_admin_audit%ROWTYPE;
BEGIN
  SELECT * INTO o FROM retail_orders WHERE id=p_order FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order not found'; END IF;
  SELECT * INTO prior FROM retail_admin_audit WHERE idempotency_key=p_key FOR UPDATE;
  IF FOUND THEN
    IF prior.action<>'order.cancel' OR prior.entity_type<>'order' OR prior.entity_id<>p_order::text OR prior.detail->>'reason' IS DISTINCT FROM p_reason THEN RAISE EXCEPTION 'idempotency conflict'; END IF;
    RETURN true;
  END IF;
  IF o.status='cancelled' THEN RAISE EXCEPTION 'order already cancelled'; END IF;
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
    IF existing.order_id<>p_order OR existing.amount_minor<>p_amount OR existing.reason IS DISTINCT FROM p_reason THEN RAISE EXCEPTION 'idempotency conflict'; END IF;
    RETURN QUERY SELECT o.capture_id,o.currency,existing.amount_minor,existing.status,existing.paypal_refund_id; RETURN;
  END IF;
  IF p_amount<=0 OR o.refunded_minor+COALESCE((SELECT sum(rr.amount_minor) FROM retail_refund_requests rr WHERE rr.order_id=p_order AND rr.status='pending'),0)+p_amount>o.amount_minor THEN RAISE EXCEPTION 'invalid refund amount'; END IF;
  INSERT INTO retail_refund_requests(idempotency_key,order_id,amount_minor,reason) VALUES(p_key,p_order,p_amount,p_reason) RETURNING retail_refund_requests.status INTO status;
  RETURN QUERY SELECT o.capture_id,o.currency,p_amount,status,NULL::TEXT;
END $$;
