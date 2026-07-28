-- Admin mutations used to commit their business change and then receive actor
-- attribution in a separate Neon request.  Keep the legacy entry points for
-- historical callers, but make the production entry points below perform both
-- pieces in one PostgreSQL transaction.
ALTER TABLE retail_admin_audit
  ADD COLUMN IF NOT EXISTS actor_attributed BOOLEAN NOT NULL DEFAULT false;

-- Existing rows predate this invariant and must never be claimed by a later
-- replay.  New audit rows start false and are sealed by the helper below.
UPDATE retail_admin_audit SET actor_attributed=true WHERE actor_attributed=false AND created_at < now();

CREATE OR REPLACE FUNCTION retail_attribute_admin_audit(
  p_key UUID,p_action TEXT,p_entity_type TEXT,p_entity_id TEXT,p_detail JSONB,
  p_actor_id TEXT,p_actor_name TEXT,p_actor_role TEXT,p_legacy BOOLEAN
) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE prior retail_admin_audit%ROWTYPE;
BEGIN
  IF COALESCE(btrim(p_actor_id),'')='' OR COALESCE(btrim(p_actor_name),'')='' OR p_actor_role NOT IN ('owner','operations','warehouse','finance','viewer') OR p_legacy IS NULL THEN
    RAISE EXCEPTION 'invalid admin actor';
  END IF;
  SELECT * INTO prior FROM retail_admin_audit WHERE idempotency_key=p_key FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO retail_admin_audit(action,entity_type,entity_id,detail,idempotency_key,actor_id,actor_name,actor_role,legacy_actor,actor_attributed)
      VALUES(p_action,p_entity_type,p_entity_id,p_detail,p_key,p_actor_id,p_actor_name,p_actor_role,p_legacy,true);
    RETURN;
  END IF;
  IF prior.action<>p_action OR prior.entity_type<>p_entity_type OR prior.entity_id IS DISTINCT FROM p_entity_id OR prior.detail<>p_detail THEN
    RAISE EXCEPTION 'idempotency conflict';
  END IF;
  IF prior.actor_attributed THEN
    IF prior.actor_id IS DISTINCT FROM p_actor_id OR prior.actor_name IS DISTINCT FROM p_actor_name OR prior.actor_role IS DISTINCT FROM p_actor_role OR prior.legacy_actor IS DISTINCT FROM p_legacy THEN
      RAISE EXCEPTION 'idempotency actor conflict';
    END IF;
    RETURN;
  END IF;
  UPDATE retail_admin_audit
    SET actor_id=p_actor_id,actor_name=p_actor_name,actor_role=p_actor_role,legacy_actor=p_legacy,actor_attributed=true
    WHERE id=prior.id;
END $$;

CREATE OR REPLACE FUNCTION retail_create_admin_product_as_actor(
  p_sku TEXT,p_slug TEXT,p_title_en TEXT,p_title_ar TEXT,p_title_zh TEXT,p_description_en TEXT,p_description_ar TEXT,p_description_zh TEXT,p_status TEXT,p_amount_minor BIGINT,p_key UUID,
  p_actor_id TEXT,p_actor_name TEXT,p_actor_role TEXT,p_legacy BOOLEAN
) RETURNS TABLE(public_id UUID,replayed BOOLEAN) LANGUAGE plpgsql AS $$
DECLARE result RECORD; payload JSONB;
BEGIN
  SELECT * INTO result FROM retail_create_admin_product(p_sku,p_slug,p_title_en,p_title_ar,p_title_zh,p_description_en,p_description_ar,p_description_zh,p_status,p_amount_minor,p_key);
  payload:=jsonb_build_object('sku',p_sku,'status',p_status);
  PERFORM retail_attribute_admin_audit(p_key,'product.create','product',result.public_id::text,payload,p_actor_id,p_actor_name,p_actor_role,p_legacy);
  RETURN QUERY SELECT result.public_id,result.replayed;
END $$;

CREATE OR REPLACE FUNCTION retail_update_admin_product_as_actor(
  p_public_id UUID,p_slug TEXT,p_title_en TEXT,p_title_ar TEXT,p_description_en TEXT,p_description_ar TEXT,p_title_zh TEXT,p_description_zh TEXT,p_has_title_zh BOOLEAN,p_has_description_zh BOOLEAN,p_status TEXT,p_key UUID,
  p_actor_id TEXT,p_actor_name TEXT,p_actor_role TEXT,p_legacy BOOLEAN
) RETURNS TABLE(public_id UUID,status TEXT,replayed BOOLEAN) LANGUAGE plpgsql AS $$
DECLARE result RECORD; payload JSONB;
BEGIN
  SELECT * INTO result FROM retail_update_admin_product(p_public_id,p_slug,p_title_en,p_title_ar,p_description_en,p_description_ar,p_title_zh,p_description_zh,p_has_title_zh,p_has_description_zh,p_status,p_key);
  payload:=jsonb_build_object('productId',p_public_id,'slug',p_slug,'titleEn',p_title_en,'titleAr',p_title_ar,'descriptionEn',p_description_en,'descriptionAr',p_description_ar,'titleZh',p_title_zh,'descriptionZh',p_description_zh,'hasTitleZh',p_has_title_zh,'hasDescriptionZh',p_has_description_zh,'status',p_status);
  PERFORM retail_attribute_admin_audit(p_key,'product.update','product',p_public_id::text,payload,p_actor_id,p_actor_name,p_actor_role,p_legacy);
  RETURN QUERY SELECT result.public_id,result.status,result.replayed;
END $$;

CREATE OR REPLACE FUNCTION retail_change_product_price_as_actor(p_public_id UUID,p_amount BIGINT,p_key UUID,p_reason TEXT,p_actor_id TEXT,p_actor_name TEXT,p_actor_role TEXT,p_legacy BOOLEAN) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE changed BOOLEAN; payload JSONB;
BEGIN
  SELECT retail_change_product_price_with_audit(p_public_id,p_amount,p_key,p_reason) INTO changed;
  payload:=jsonb_build_object('productId',p_public_id,'amountMinor',p_amount,'reason',p_reason);
  PERFORM retail_attribute_admin_audit(p_key,'product.price','product',p_public_id::text,payload,p_actor_id,p_actor_name,p_actor_role,p_legacy);
  RETURN changed;
END $$;

CREATE OR REPLACE FUNCTION retail_adjust_inventory_as_actor(p_public_id UUID,p_delta BIGINT,p_reason TEXT,p_key UUID,p_actor_id TEXT,p_actor_name TEXT,p_actor_role TEXT,p_legacy BOOLEAN) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE adjusted BOOLEAN; payload JSONB;
BEGIN
  SELECT retail_adjust_inventory_with_audit(p_public_id,p_delta,p_reason,p_key) INTO adjusted;
  payload:=jsonb_build_object('productId',p_public_id,'delta',p_delta,'reason',p_reason);
  PERFORM retail_attribute_admin_audit(p_key,'inventory.adjust','product',p_public_id::text,payload,p_actor_id,p_actor_name,p_actor_role,p_legacy);
  RETURN adjusted;
END $$;

CREATE OR REPLACE FUNCTION retail_fulfil_order_as_actor(p_order BIGINT,p_carrier TEXT,p_tracking TEXT,p_note TEXT,p_key UUID,p_actor_id TEXT,p_actor_name TEXT,p_actor_role TEXT,p_legacy BOOLEAN) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  PERFORM retail_fulfil_order(p_order,p_carrier,p_tracking,p_note,p_key);
  PERFORM retail_attribute_admin_audit(p_key,'order.fulfil','order',p_order::text,jsonb_build_object('carrier',p_carrier,'tracking',p_tracking,'note',p_note),p_actor_id,p_actor_name,p_actor_role,p_legacy);
END $$;

CREATE OR REPLACE FUNCTION retail_cancel_order_as_actor(p_order BIGINT,p_reason TEXT,p_key UUID,p_actor_id TEXT,p_actor_name TEXT,p_actor_role TEXT,p_legacy BOOLEAN) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE cancelled BOOLEAN;
BEGIN
  SELECT retail_cancel_order(p_order,p_reason,p_key) INTO cancelled;
  PERFORM retail_attribute_admin_audit(p_key,'order.cancel','order',p_order::text,jsonb_build_object('reason',p_reason),p_actor_id,p_actor_name,p_actor_role,p_legacy);
  RETURN cancelled;
END $$;

CREATE OR REPLACE FUNCTION retail_prepare_refund_as_actor(p_order BIGINT,p_amount BIGINT,p_reason TEXT,p_key UUID,p_actor_id TEXT,p_actor_name TEXT,p_actor_role TEXT,p_legacy BOOLEAN)
RETURNS TABLE(capture_id TEXT,currency CHAR(3),amount_minor BIGINT,status TEXT,paypal_refund_id TEXT) LANGUAGE plpgsql AS $$
BEGIN
  PERFORM retail_attribute_admin_audit(p_key,'order.refund.request','order',p_order::text,jsonb_build_object('amountMinor',p_amount,'reason',p_reason),p_actor_id,p_actor_name,p_actor_role,p_legacy);
  RETURN QUERY SELECT * FROM retail_prepare_refund(p_order,p_amount,p_reason,p_key);
END $$;

CREATE OR REPLACE FUNCTION retail_upsert_admin_shipping_zone_as_actor(
  p_country TEXT,p_name_en TEXT,p_name_ar TEXT,p_name_zh TEXT,p_has_name_zh BOOLEAN,p_shipping_minor BIGINT,p_free_threshold BIGINT,p_tax_bps INT,p_active BOOLEAN,p_key UUID,
  p_actor_id TEXT,p_actor_name TEXT,p_actor_role TEXT,p_legacy BOOLEAN
) RETURNS TABLE(country TEXT,name_en TEXT,name_ar TEXT,name_zh TEXT,shipping_minor BIGINT,free_shipping_threshold_minor BIGINT,tax_rate_bps INT,active BOOLEAN,updated_at TIMESTAMPTZ,replayed BOOLEAN) LANGUAGE plpgsql AS $$
DECLARE result RECORD; payload JSONB;
BEGIN
  SELECT * INTO result FROM retail_upsert_admin_shipping_zone(p_country,p_name_en,p_name_ar,p_name_zh,p_has_name_zh,p_shipping_minor,p_free_threshold,p_tax_bps,p_active,p_key);
  payload:=jsonb_build_object('country',p_country,'nameEn',p_name_en,'nameAr',p_name_ar,'nameZh',p_name_zh,'hasNameZh',p_has_name_zh,'shippingMinor',p_shipping_minor,'freeShippingThresholdMinor',p_free_threshold,'taxRateBps',p_tax_bps,'active',p_active);
  PERFORM retail_attribute_admin_audit(p_key,'shipping_zone.upsert','shipping_zone',p_country,payload,p_actor_id,p_actor_name,p_actor_role,p_legacy);
  RETURN QUERY SELECT result.country,result.name_en,result.name_ar,result.name_zh,result.shipping_minor,result.free_shipping_threshold_minor,result.tax_rate_bps,result.active,result.updated_at,result.replayed;
END $$;

CREATE OR REPLACE FUNCTION retail_disable_admin_shipping_zone_as_actor(p_country TEXT,p_key UUID,p_actor_id TEXT,p_actor_name TEXT,p_actor_role TEXT,p_legacy BOOLEAN) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE disabled BOOLEAN;
BEGIN
  SELECT retail_disable_admin_shipping_zone(p_country,p_key) INTO disabled;
  PERFORM retail_attribute_admin_audit(p_key,'shipping_zone.disable','shipping_zone',p_country,jsonb_build_object('country',p_country),p_actor_id,p_actor_name,p_actor_role,p_legacy);
  RETURN disabled;
END $$;

CREATE OR REPLACE FUNCTION retail_update_admin_customer_as_actor(
  p_customer UUID,p_name TEXT,p_address UUID,p_recipient TEXT,p_line1 TEXT,p_line2 TEXT,p_city TEXT,p_region TEXT,p_postal TEXT,p_country TEXT,p_phone TEXT,p_default BOOLEAN,p_archive BOOLEAN,p_has_address BOOLEAN,p_key UUID,
  p_actor_id TEXT,p_actor_name TEXT,p_actor_role TEXT,p_legacy BOOLEAN
) RETURNS TABLE(address_id UUID,replayed BOOLEAN) LANGUAGE plpgsql AS $$
DECLARE result RECORD; payload JSONB;
BEGIN
  SELECT * INTO result FROM retail_update_admin_customer(p_customer,p_name,p_address,p_recipient,p_line1,p_line2,p_city,p_region,p_postal,p_country,p_phone,p_default,p_archive,p_has_address,p_key);
  payload:=jsonb_build_object('customerId',p_customer,'name',p_name,'addressId',p_address,'recipient',p_recipient,'line1',p_line1,'line2',p_line2,'city',p_city,'region',p_region,'postalCode',p_postal,'country',p_country,'phone',p_phone,'isDefault',p_default,'archive',p_archive,'hasAddress',p_has_address);
  PERFORM retail_attribute_admin_audit(p_key,'customer.update','customer',p_customer::text,payload,p_actor_id,p_actor_name,p_actor_role,p_legacy);
  RETURN QUERY SELECT result.address_id,result.replayed;
END $$;

CREATE OR REPLACE FUNCTION retail_reconcile_with_actor(p_ledger UUID,p_status TEXT,p_note TEXT,p_key UUID,p_actor_id TEXT,p_actor_name TEXT,p_actor_role TEXT,p_legacy BOOLEAN) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE changed BOOLEAN;
BEGIN
  SELECT retail_reconcile_with_audit(p_ledger,p_status,p_note,p_key) INTO changed;
  PERFORM retail_attribute_admin_audit(p_key,'ledger.reconcile','ledger',p_ledger::text,jsonb_build_object('status',p_status,'note',p_note),p_actor_id,p_actor_name,p_actor_role,p_legacy);
  RETURN changed;
END $$;

CREATE OR REPLACE FUNCTION retail_attach_product_image_as_actor(
  p_public_id UUID,p_url TEXT,p_key TEXT,p_mime TEXT,p_bytes BIGINT,p_sha256 TEXT,p_alt_en TEXT,p_alt_ar TEXT,p_idempotency UUID,
  p_actor_id TEXT,p_actor_name TEXT,p_actor_role TEXT,p_legacy BOOLEAN
) RETURNS TABLE(id UUID,blob_url TEXT,replayed BOOLEAN) LANGUAGE plpgsql AS $$
DECLARE result RECORD; payload JSONB;
BEGIN
  SELECT * INTO result FROM retail_attach_product_image_idempotent(p_public_id,p_url,p_key,p_mime,p_bytes,p_sha256,p_alt_en,p_alt_ar,p_idempotency);
  payload:=jsonb_build_object('productId',p_public_id,'blobKey',p_key,'mime',p_mime,'bytes',p_bytes,'sha256',p_sha256,'altEn',p_alt_en,'altAr',p_alt_ar);
  PERFORM retail_attribute_admin_audit(p_idempotency,'product.image.attach','product',p_public_id::text,payload,p_actor_id,p_actor_name,p_actor_role,p_legacy);
  RETURN QUERY SELECT result.id,result.blob_url,result.replayed;
END $$;

CREATE OR REPLACE FUNCTION retail_reorder_product_media_as_actor(p_public_id UUID,p_image_ids JSONB,p_expected_version BIGINT,p_key UUID,p_actor_id TEXT,p_actor_name TEXT,p_actor_role TEXT,p_legacy BOOLEAN)
RETURNS TABLE(media_version BIGINT,image_ids JSONB,replayed BOOLEAN) LANGUAGE plpgsql AS $$
DECLARE result RECORD; payload JSONB;
BEGIN
  SELECT * INTO result FROM retail_reorder_product_media(p_public_id,p_image_ids,p_expected_version,p_key);
  payload:=jsonb_build_object('productId',p_public_id,'imageIds',p_image_ids,'expectedVersion',p_expected_version);
  PERFORM retail_attribute_admin_audit(p_key,'product.media.reorder','product',p_public_id::text,payload,p_actor_id,p_actor_name,p_actor_role,p_legacy);
  RETURN QUERY SELECT result.media_version,result.image_ids,result.replayed;
END $$;

CREATE OR REPLACE FUNCTION retail_detach_product_image_as_actor(p_image UUID,p_actor_id TEXT,p_actor_name TEXT,p_actor_role TEXT,p_legacy BOOLEAN) RETURNS TABLE(blob_url TEXT,blob_key TEXT) LANGUAGE plpgsql AS $$
DECLARE result RECORD;
BEGIN
  SELECT * INTO result FROM retail_detach_product_image(p_image);
  IF NOT FOUND THEN RETURN; END IF;
  IF COALESCE(btrim(p_actor_id),'')='' OR COALESCE(btrim(p_actor_name),'')='' OR p_actor_role NOT IN ('owner','operations','warehouse','finance','viewer') OR p_legacy IS NULL THEN RAISE EXCEPTION 'invalid admin actor'; END IF;
  INSERT INTO retail_admin_audit(action,entity_type,entity_id,detail,actor_id,actor_name,actor_role,legacy_actor,actor_attributed)
    VALUES('product.image.detach','product_image',p_image::text,jsonb_build_object('blobDetached',true),p_actor_id,p_actor_name,p_actor_role,p_legacy,true);
  RETURN QUERY SELECT result.blob_url,result.blob_key;
END $$;
