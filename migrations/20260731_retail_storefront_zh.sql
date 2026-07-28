-- Optional Chinese catalog copy. Existing storefront rows continue to use
-- their English value until a vetted Chinese translation is supplied.
ALTER TABLE retail_products
  ADD COLUMN IF NOT EXISTS title_zh TEXT,
  ADD COLUMN IF NOT EXISTS description_zh TEXT;

ALTER TABLE retail_shipping_zones
  ADD COLUMN IF NOT EXISTS name_zh TEXT;

ALTER TABLE retail_products
  ADD CONSTRAINT retail_products_title_zh_length CHECK (title_zh IS NULL OR char_length(title_zh) <= 200),
  ADD CONSTRAINT retail_products_description_zh_length CHECK (description_zh IS NULL OR char_length(description_zh) <= 4000);

ALTER TABLE retail_shipping_zones
  ADD CONSTRAINT retail_shipping_zones_name_zh_length CHECK (name_zh IS NULL OR char_length(name_zh) <= 100);

-- Keep the old function signatures intact for already-deployed English/Arabic
-- clients. The admin API uses these extended, single-transaction functions so
-- the base record, Chinese copy, idempotency receipt, and audit cannot diverge.
CREATE OR REPLACE FUNCTION retail_create_admin_product(
  p_sku TEXT,p_slug TEXT,p_title_en TEXT,p_title_ar TEXT,p_title_zh TEXT,p_description_en TEXT,p_description_ar TEXT,p_description_zh TEXT,
  p_status TEXT,p_amount_minor BIGINT,p_key UUID
) RETURNS TABLE(public_id UUID,replayed BOOLEAN) LANGUAGE plpgsql AS $$
DECLARE payload JSONB; prior retail_admin_idempotency%ROWTYPE; p_id UUID; p_public UUID;
BEGIN
  IF p_status NOT IN ('draft','archived') OR p_amount_minor<=0 THEN RAISE EXCEPTION 'invalid product state'; END IF;
  payload:=jsonb_build_object('sku',p_sku,'slug',p_slug,'titleEn',p_title_en,'titleAr',p_title_ar,'titleZh',p_title_zh,'descriptionEn',p_description_en,'descriptionAr',p_description_ar,'descriptionZh',p_description_zh,'status',p_status,'amountMinor',p_amount_minor);
  PERFORM pg_advisory_xact_lock(hashtextextended(p_key::text,0));
  SELECT * INTO prior FROM retail_admin_idempotency WHERE idempotency_key=p_key FOR UPDATE;
  IF FOUND THEN
    IF prior.operation<>'product.create' OR prior.request_payload<>payload THEN RAISE EXCEPTION 'idempotency conflict'; END IF;
    RETURN QUERY SELECT (prior.response_payload->>'publicId')::uuid,true;
    RETURN;
  END IF;
  INSERT INTO retail_admin_idempotency(idempotency_key,operation,request_payload) VALUES(p_key,'product.create',payload);
  INSERT INTO retail_products(sku,slug,title_en,title_ar,title_zh,description_en,description_ar,description_zh,status)
    VALUES(p_sku,p_slug,p_title_en,p_title_ar,NULLIF(p_title_zh,''),p_description_en,p_description_ar,NULLIF(p_description_zh,''),p_status) RETURNING id,retail_products.public_id INTO p_id,p_public;
  INSERT INTO retail_price_history(product_id,amount_minor,idempotency_key,changed_by) VALUES(p_id,p_amount_minor,p_key,'admin');
  INSERT INTO retail_inventory_balances(product_id) VALUES(p_id);
  INSERT INTO retail_admin_audit(action,entity_type,entity_id,detail,idempotency_key)
    VALUES('product.create','product',p_public::text,jsonb_build_object('sku',p_sku,'status',p_status),p_key) ON CONFLICT(idempotency_key) DO NOTHING;
  UPDATE retail_admin_idempotency SET response_payload=jsonb_build_object('publicId',p_public) WHERE idempotency_key=p_key;
  RETURN QUERY SELECT p_public,false;
END $$;

CREATE OR REPLACE FUNCTION retail_update_admin_product(
  p_public_id UUID,p_slug TEXT,p_title_en TEXT,p_title_ar TEXT,p_description_en TEXT,p_description_ar TEXT,p_title_zh TEXT,p_description_zh TEXT,p_has_title_zh BOOLEAN,p_has_description_zh BOOLEAN,p_status TEXT,p_key UUID
) RETURNS TABLE(public_id UUID,status TEXT,replayed BOOLEAN) LANGUAGE plpgsql AS $$
DECLARE payload JSONB; prior retail_admin_idempotency%ROWTYPE; out_status TEXT;
BEGIN
  payload:=jsonb_build_object('productId',p_public_id,'slug',p_slug,'titleEn',p_title_en,'titleAr',p_title_ar,'descriptionEn',p_description_en,'descriptionAr',p_description_ar,'titleZh',p_title_zh,'descriptionZh',p_description_zh,'hasTitleZh',p_has_title_zh,'hasDescriptionZh',p_has_description_zh,'status',p_status);
  PERFORM pg_advisory_xact_lock(hashtextextended(p_key::text,0));
  SELECT * INTO prior FROM retail_admin_idempotency WHERE idempotency_key=p_key FOR UPDATE;
  IF FOUND THEN
    IF prior.operation<>'product.update' OR prior.request_payload<>payload THEN RAISE EXCEPTION 'idempotency conflict'; END IF;
    RETURN QUERY SELECT (prior.response_payload->>'publicId')::uuid,prior.response_payload->>'status',true;
    RETURN;
  END IF;
  INSERT INTO retail_admin_idempotency(idempotency_key,operation,request_payload) VALUES(p_key,'product.update',payload);
  UPDATE retail_products p SET slug=COALESCE(p_slug,p.slug),title_en=COALESCE(p_title_en,p.title_en),title_ar=COALESCE(p_title_ar,p.title_ar),description_en=COALESCE(p_description_en,p.description_en),description_ar=COALESCE(p_description_ar,p.description_ar),title_zh=CASE WHEN p_has_title_zh THEN NULLIF(p_title_zh,'') ELSE p.title_zh END,description_zh=CASE WHEN p_has_description_zh THEN NULLIF(p_description_zh,'') ELSE p.description_zh END,status=COALESCE(p_status,p.status),updated_at=now()
    WHERE p.public_id=p_public_id AND (p_status IS DISTINCT FROM 'published' OR EXISTS(SELECT 1 FROM retail_product_images pi WHERE pi.product_id=p.id)) RETURNING p.status INTO out_status;
  IF NOT FOUND THEN RAISE EXCEPTION 'product not found or missing verified image'; END IF;
  INSERT INTO retail_admin_audit(action,entity_type,entity_id,detail,idempotency_key) VALUES('product.update','product',p_public_id::text,payload,p_key) ON CONFLICT(idempotency_key) DO NOTHING;
  UPDATE retail_admin_idempotency SET response_payload=jsonb_build_object('publicId',p_public_id,'status',out_status) WHERE idempotency_key=p_key;
  RETURN QUERY SELECT p_public_id,out_status,false;
END $$;

CREATE OR REPLACE FUNCTION retail_upsert_admin_shipping_zone(
  p_country TEXT,p_name_en TEXT,p_name_ar TEXT,p_name_zh TEXT,p_has_name_zh BOOLEAN,p_shipping_minor BIGINT,p_free_threshold BIGINT,p_tax_bps INT,p_active BOOLEAN,p_key UUID
) RETURNS TABLE(country TEXT,name_en TEXT,name_ar TEXT,name_zh TEXT,shipping_minor BIGINT,free_shipping_threshold_minor BIGINT,tax_rate_bps INT,active BOOLEAN,updated_at TIMESTAMPTZ,replayed BOOLEAN) LANGUAGE plpgsql AS $$
DECLARE payload JSONB; prior retail_admin_idempotency%ROWTYPE; zone retail_shipping_zones%ROWTYPE;
BEGIN
  payload:=jsonb_build_object('country',p_country,'nameEn',p_name_en,'nameAr',p_name_ar,'nameZh',p_name_zh,'hasNameZh',p_has_name_zh,'shippingMinor',p_shipping_minor,'freeShippingThresholdMinor',p_free_threshold,'taxRateBps',p_tax_bps,'active',p_active);
  PERFORM pg_advisory_xact_lock(hashtextextended(p_key::text,0)); SELECT * INTO prior FROM retail_admin_idempotency WHERE idempotency_key=p_key FOR UPDATE;
  IF FOUND THEN
    IF prior.operation<>'shipping.upsert' OR prior.request_payload<>payload THEN RAISE EXCEPTION 'idempotency conflict'; END IF;
    RETURN QUERY SELECT prior.response_payload->>'country',prior.response_payload->>'name_en',prior.response_payload->>'name_ar',prior.response_payload->>'name_zh',(prior.response_payload->>'shipping_minor')::bigint,NULLIF(prior.response_payload->>'free_shipping_threshold_minor','')::bigint,(prior.response_payload->>'tax_rate_bps')::int,(prior.response_payload->>'active')::boolean,(prior.response_payload->>'updated_at')::timestamptz,true;
    RETURN;
  END IF;
  INSERT INTO retail_admin_idempotency(idempotency_key,operation,request_payload) VALUES(p_key,'shipping.upsert',payload);
  INSERT INTO retail_shipping_zones(country,name_en,name_ar,name_zh,shipping_minor,free_shipping_threshold_minor,tax_rate_bps,active) VALUES(p_country,p_name_en,p_name_ar,CASE WHEN p_has_name_zh THEN NULLIF(p_name_zh,'') ELSE NULL END,p_shipping_minor,p_free_threshold,p_tax_bps,p_active)
    ON CONFLICT ON CONSTRAINT retail_shipping_zones_pkey DO UPDATE SET name_en=EXCLUDED.name_en,name_ar=EXCLUDED.name_ar,name_zh=CASE WHEN p_has_name_zh THEN EXCLUDED.name_zh ELSE retail_shipping_zones.name_zh END,shipping_minor=EXCLUDED.shipping_minor,free_shipping_threshold_minor=EXCLUDED.free_shipping_threshold_minor,tax_rate_bps=EXCLUDED.tax_rate_bps,active=EXCLUDED.active,updated_at=now() RETURNING * INTO zone;
  INSERT INTO retail_admin_audit(action,entity_type,entity_id,detail,idempotency_key) VALUES('shipping_zone.upsert','shipping_zone',p_country,payload,p_key) ON CONFLICT(idempotency_key) DO NOTHING;
  UPDATE retail_admin_idempotency SET response_payload=to_jsonb(zone) WHERE idempotency_key=p_key;
  RETURN QUERY SELECT zone.country::text,zone.name_en,zone.name_ar,zone.name_zh,zone.shipping_minor,zone.free_shipping_threshold_minor,zone.tax_rate_bps,zone.active,zone.updated_at,false;
END $$;
