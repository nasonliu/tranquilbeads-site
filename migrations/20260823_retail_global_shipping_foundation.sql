-- Provider-ready global shipping metadata.  Rates remain merchant verified;
-- this migration never invents or activates a destination.
ALTER TABLE retail_product_variants
  ADD COLUMN IF NOT EXISTS shipping_weight_grams INT,
  ADD COLUMN IF NOT EXISTS package_length_mm INT,
  ADD COLUMN IF NOT EXISTS package_width_mm INT,
  ADD COLUMN IF NOT EXISTS package_height_mm INT,
  ADD COLUMN IF NOT EXISTS customs_description_en TEXT,
  ADD COLUMN IF NOT EXISTS hs_code TEXT,
  ADD COLUMN IF NOT EXISTS origin_country CHAR(2),
  ADD COLUMN IF NOT EXISTS dangerous_goods BOOLEAN NOT NULL DEFAULT false;

DO $$ BEGIN
  ALTER TABLE retail_product_variants ADD CONSTRAINT retail_variant_shipping_weight_positive CHECK(shipping_weight_grams IS NULL OR shipping_weight_grams > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE retail_product_variants ADD CONSTRAINT retail_variant_package_length_positive CHECK(package_length_mm IS NULL OR package_length_mm > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE retail_product_variants ADD CONSTRAINT retail_variant_package_width_positive CHECK(package_width_mm IS NULL OR package_width_mm > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE retail_product_variants ADD CONSTRAINT retail_variant_package_height_positive CHECK(package_height_mm IS NULL OR package_height_mm > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE retail_product_variants ADD CONSTRAINT retail_variant_hs_code_format CHECK(hs_code IS NULL OR hs_code ~ '^[0-9]{4,12}$');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE retail_product_variants ADD CONSTRAINT retail_variant_origin_country_format CHECK(origin_country IS NULL OR origin_country ~ '^[A-Z]{2}$');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE retail_shipping_zones
  ADD COLUMN IF NOT EXISTS carrier TEXT NOT NULL DEFAULT 'YunExpress',
  ADD COLUMN IF NOT EXISTS service_code TEXT,
  ADD COLUMN IF NOT EXISTS delivery_min_days INT,
  ADD COLUMN IF NOT EXISTS delivery_max_days INT,
  ADD COLUMN IF NOT EXISTS duties_mode TEXT NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN IF NOT EXISTS rate_source TEXT NOT NULL DEFAULT 'manual_contract',
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;

DO $$ BEGIN
  ALTER TABLE retail_shipping_zones ADD CONSTRAINT retail_shipping_delivery_min_valid CHECK(delivery_min_days IS NULL OR delivery_min_days > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE retail_shipping_zones ADD CONSTRAINT retail_shipping_delivery_max_valid CHECK(delivery_max_days IS NULL OR delivery_max_days > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE retail_shipping_zones ADD CONSTRAINT retail_shipping_delivery_order_valid CHECK(delivery_min_days IS NULL OR delivery_max_days IS NULL OR delivery_max_days >= delivery_min_days);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE retail_shipping_zones ADD CONSTRAINT retail_shipping_duties_mode_valid CHECK(duties_mode IN ('DDP','DAP','UNKNOWN'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE retail_shipping_zones ADD CONSTRAINT retail_shipping_rate_source_valid CHECK(rate_source IN ('manual_contract','provider_api','estimated'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION retail_upsert_admin_shipping_zone_v2(
  p_country TEXT,p_name_en TEXT,p_name_ar TEXT,p_name_zh TEXT,p_has_name_zh BOOLEAN,
  p_shipping_minor BIGINT,p_free_threshold BIGINT,p_tax_bps INT,p_active BOOLEAN,
  p_carrier TEXT,p_service_code TEXT,p_delivery_min_days INT,p_delivery_max_days INT,
  p_duties_mode TEXT,p_rate_source TEXT,p_last_verified_at TIMESTAMPTZ,p_key UUID
) RETURNS TABLE(country TEXT,name_en TEXT,name_ar TEXT,name_zh TEXT,shipping_minor BIGINT,free_shipping_threshold_minor BIGINT,tax_rate_bps INT,active BOOLEAN,carrier TEXT,service_code TEXT,delivery_min_days INT,delivery_max_days INT,duties_mode TEXT,rate_source TEXT,last_verified_at TIMESTAMPTZ,updated_at TIMESTAMPTZ,replayed BOOLEAN) LANGUAGE plpgsql AS $$
DECLARE payload JSONB; prior retail_admin_idempotency%ROWTYPE; zone retail_shipping_zones%ROWTYPE;
BEGIN
  payload:=jsonb_build_object('country',p_country,'nameEn',p_name_en,'nameAr',p_name_ar,'nameZh',p_name_zh,'hasNameZh',p_has_name_zh,'shippingMinor',p_shipping_minor,'freeShippingThresholdMinor',p_free_threshold,'taxRateBps',p_tax_bps,'active',p_active,'carrier',p_carrier,'serviceCode',p_service_code,'deliveryMinDays',p_delivery_min_days,'deliveryMaxDays',p_delivery_max_days,'dutiesMode',p_duties_mode,'rateSource',p_rate_source,'lastVerifiedAt',p_last_verified_at);
  PERFORM pg_advisory_xact_lock(hashtextextended(p_key::text,0));
  SELECT * INTO prior FROM retail_admin_idempotency WHERE idempotency_key=p_key FOR UPDATE;
  IF FOUND THEN
    IF prior.operation<>'shipping.upsert.v2' OR prior.request_payload<>payload THEN RAISE EXCEPTION 'idempotency conflict'; END IF;
    RETURN QUERY SELECT prior.response_payload->>'country',prior.response_payload->>'name_en',prior.response_payload->>'name_ar',prior.response_payload->>'name_zh',(prior.response_payload->>'shipping_minor')::bigint,NULLIF(prior.response_payload->>'free_shipping_threshold_minor','')::bigint,(prior.response_payload->>'tax_rate_bps')::int,(prior.response_payload->>'active')::boolean,prior.response_payload->>'carrier',prior.response_payload->>'service_code',NULLIF(prior.response_payload->>'delivery_min_days','')::int,NULLIF(prior.response_payload->>'delivery_max_days','')::int,prior.response_payload->>'duties_mode',prior.response_payload->>'rate_source',NULLIF(prior.response_payload->>'last_verified_at','')::timestamptz,(prior.response_payload->>'updated_at')::timestamptz,true;
    RETURN;
  END IF;
  INSERT INTO retail_admin_idempotency(idempotency_key,operation,request_payload) VALUES(p_key,'shipping.upsert.v2',payload);
  INSERT INTO retail_shipping_zones(country,name_en,name_ar,name_zh,shipping_minor,free_shipping_threshold_minor,tax_rate_bps,active,carrier,service_code,delivery_min_days,delivery_max_days,duties_mode,rate_source,last_verified_at)
  VALUES(p_country,p_name_en,p_name_ar,CASE WHEN p_has_name_zh THEN NULLIF(p_name_zh,'') ELSE NULL END,p_shipping_minor,p_free_threshold,p_tax_bps,p_active,p_carrier,NULLIF(p_service_code,''),p_delivery_min_days,p_delivery_max_days,p_duties_mode,p_rate_source,p_last_verified_at)
  ON CONFLICT ON CONSTRAINT retail_shipping_zones_pkey DO UPDATE SET name_en=EXCLUDED.name_en,name_ar=EXCLUDED.name_ar,name_zh=CASE WHEN p_has_name_zh THEN EXCLUDED.name_zh ELSE retail_shipping_zones.name_zh END,shipping_minor=EXCLUDED.shipping_minor,free_shipping_threshold_minor=EXCLUDED.free_shipping_threshold_minor,tax_rate_bps=EXCLUDED.tax_rate_bps,active=EXCLUDED.active,carrier=EXCLUDED.carrier,service_code=EXCLUDED.service_code,delivery_min_days=EXCLUDED.delivery_min_days,delivery_max_days=EXCLUDED.delivery_max_days,duties_mode=EXCLUDED.duties_mode,rate_source=EXCLUDED.rate_source,last_verified_at=EXCLUDED.last_verified_at,updated_at=now()
  RETURNING * INTO zone;
  INSERT INTO retail_admin_audit(action,entity_type,entity_id,detail,idempotency_key) VALUES('shipping_zone.upsert','shipping_zone',p_country,payload,p_key) ON CONFLICT(idempotency_key) DO NOTHING;
  UPDATE retail_admin_idempotency SET response_payload=to_jsonb(zone) WHERE idempotency_key=p_key;
  RETURN QUERY SELECT zone.country::text,zone.name_en,zone.name_ar,zone.name_zh,zone.shipping_minor,zone.free_shipping_threshold_minor,zone.tax_rate_bps,zone.active,zone.carrier,zone.service_code,zone.delivery_min_days,zone.delivery_max_days,zone.duties_mode,zone.rate_source,zone.last_verified_at,zone.updated_at,false;
END $$;

CREATE OR REPLACE FUNCTION retail_upsert_admin_shipping_zone_v2_as_actor(
  p_country TEXT,p_name_en TEXT,p_name_ar TEXT,p_name_zh TEXT,p_has_name_zh BOOLEAN,
  p_shipping_minor BIGINT,p_free_threshold BIGINT,p_tax_bps INT,p_active BOOLEAN,
  p_carrier TEXT,p_service_code TEXT,p_delivery_min_days INT,p_delivery_max_days INT,
  p_duties_mode TEXT,p_rate_source TEXT,p_last_verified_at TIMESTAMPTZ,p_key UUID,
  p_actor_id TEXT,p_actor_name TEXT,p_actor_role TEXT,p_legacy BOOLEAN
) RETURNS TABLE(country TEXT,name_en TEXT,name_ar TEXT,name_zh TEXT,shipping_minor BIGINT,free_shipping_threshold_minor BIGINT,tax_rate_bps INT,active BOOLEAN,carrier TEXT,service_code TEXT,delivery_min_days INT,delivery_max_days INT,duties_mode TEXT,rate_source TEXT,last_verified_at TIMESTAMPTZ,updated_at TIMESTAMPTZ,replayed BOOLEAN) LANGUAGE plpgsql AS $$
DECLARE result RECORD; payload JSONB;
BEGIN
  SELECT * INTO result FROM retail_upsert_admin_shipping_zone_v2(p_country,p_name_en,p_name_ar,p_name_zh,p_has_name_zh,p_shipping_minor,p_free_threshold,p_tax_bps,p_active,p_carrier,p_service_code,p_delivery_min_days,p_delivery_max_days,p_duties_mode,p_rate_source,p_last_verified_at,p_key);
  payload:=jsonb_build_object('country',p_country,'nameEn',p_name_en,'nameAr',p_name_ar,'nameZh',p_name_zh,'hasNameZh',p_has_name_zh,'shippingMinor',p_shipping_minor,'freeShippingThresholdMinor',p_free_threshold,'taxRateBps',p_tax_bps,'active',p_active,'carrier',p_carrier,'serviceCode',p_service_code,'deliveryMinDays',p_delivery_min_days,'deliveryMaxDays',p_delivery_max_days,'dutiesMode',p_duties_mode,'rateSource',p_rate_source,'lastVerifiedAt',p_last_verified_at);
  PERFORM retail_attribute_admin_audit(p_key,'shipping_zone.upsert','shipping_zone',p_country,payload,p_actor_id,p_actor_name,p_actor_role,p_legacy);
  RETURN QUERY SELECT result.country,result.name_en,result.name_ar,result.name_zh,result.shipping_minor,result.free_shipping_threshold_minor,result.tax_rate_bps,result.active,result.carrier,result.service_code,result.delivery_min_days,result.delivery_max_days,result.duties_mode,result.rate_source,result.last_verified_at,result.updated_at,result.replayed;
END $$;
