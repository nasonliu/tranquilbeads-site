-- Product-level PDP content stays separate from sellable SKU, price, and
-- inventory authority. These JSONB columns are public copy only.
CREATE OR REPLACE FUNCTION retail_pdp_localized_text_valid(value JSONB, max_length INTEGER)
RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF value IS NULL OR jsonb_typeof(value) <> 'object' THEN RETURN false; END IF;
  IF NOT (value ? 'en' AND value ? 'ar' AND value ? 'zh') THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(value) key WHERE key NOT IN ('en','ar','zh')) THEN RETURN false; END IF;
  IF jsonb_typeof(value->'en') <> 'string' OR jsonb_typeof(value->'ar') <> 'string' OR jsonb_typeof(value->'zh') <> 'string' THEN RETURN false; END IF;
  IF length(btrim(value->>'en')) NOT BETWEEN 1 AND max_length OR length(btrim(value->>'ar')) NOT BETWEEN 1 AND max_length OR length(btrim(value->>'zh')) NOT BETWEEN 1 AND max_length THEN RETURN false; END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION retail_pdp_highlights_valid(value JSONB)
RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE item JSONB;
BEGIN
  IF value IS NULL OR jsonb_typeof(value) <> 'array' THEN RETURN false; END IF;
  IF jsonb_array_length(value) > 5 THEN RETURN false; END IF;
  FOR item IN SELECT entry FROM jsonb_array_elements(value) AS entries(entry) LOOP
    IF NOT retail_pdp_localized_text_valid(item, 400) THEN RETURN false; END IF;
  END LOOP;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION retail_pdp_details_valid(value JSONB)
RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE item JSONB;
BEGIN
  IF value IS NULL OR jsonb_typeof(value) <> 'array' THEN RETURN false; END IF;
  IF jsonb_array_length(value) > 12 THEN RETURN false; END IF;
  FOR item IN SELECT entry FROM jsonb_array_elements(value) AS entries(entry) LOOP
    IF jsonb_typeof(item) <> 'object'
      OR NOT (item ? 'label' AND item ? 'value')
      OR EXISTS (SELECT 1 FROM jsonb_object_keys(item) key WHERE key NOT IN ('label','value'))
      OR NOT retail_pdp_localized_text_valid(item->'label', 160)
      OR NOT retail_pdp_localized_text_valid(item->'value', 2000) THEN RETURN false; END IF;
  END LOOP;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION retail_pdp_a_plus_valid(value JSONB)
RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE item JSONB;
BEGIN
  IF value IS NULL OR jsonb_typeof(value) <> 'array' THEN RETURN false; END IF;
  IF jsonb_array_length(value) > 6 THEN RETURN false; END IF;
  FOR item IN SELECT entry FROM jsonb_array_elements(value) AS entries(entry) LOOP
    IF jsonb_typeof(item) <> 'object'
      OR NOT (item ? 'title' AND item ? 'body')
      OR EXISTS (SELECT 1 FROM jsonb_object_keys(item) key WHERE key NOT IN ('eyebrow','title','body','image'))
      OR NOT retail_pdp_localized_text_valid(item->'title', 240)
      OR NOT retail_pdp_localized_text_valid(item->'body', 4000)
      OR ((item ? 'eyebrow') AND NOT retail_pdp_localized_text_valid(item->'eyebrow', 160))
      OR ((item ? 'image') AND (jsonb_typeof(item->'image') <> 'string' OR length(item->>'image') > 2048 OR item->>'image' !~ '^https://')) THEN RETURN false; END IF;
  END LOOP;
  RETURN true;
END $$;

ALTER TABLE retail_products
  ADD COLUMN IF NOT EXISTS pdp_highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS pdp_details JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS pdp_a_plus JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE retail_products
  DROP CONSTRAINT IF EXISTS retail_products_pdp_highlights_check,
  ADD CONSTRAINT retail_products_pdp_highlights_check CHECK (retail_pdp_highlights_valid(pdp_highlights)),
  DROP CONSTRAINT IF EXISTS retail_products_pdp_details_check,
  ADD CONSTRAINT retail_products_pdp_details_check CHECK (retail_pdp_details_valid(pdp_details)),
  DROP CONSTRAINT IF EXISTS retail_products_pdp_a_plus_check,
  ADD CONSTRAINT retail_products_pdp_a_plus_check CHECK (retail_pdp_a_plus_valid(pdp_a_plus));

-- A media asset referenced by A+ content must remain renderable until the
-- merchant removes that reference from the dedicated content editor.
CREATE OR REPLACE FUNCTION retail_detach_product_image(p_image UUID)
RETURNS TABLE(blob_url TEXT,blob_key TEXT) LANGUAGE plpgsql AS $$
DECLARE v_product_id UUID;
BEGIN
  SELECT image.product_id INTO v_product_id
  FROM retail_product_images image WHERE image.id=p_image;
  IF NOT FOUND THEN RETURN; END IF;
  PERFORM 1 FROM retail_products product WHERE product.id=v_product_id FOR UPDATE;
  PERFORM 1 FROM retail_product_images image
    WHERE image.id=p_image AND image.product_id=v_product_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  IF EXISTS (
    SELECT 1
    FROM retail_product_images image
    JOIN retail_products product ON product.id=image.product_id
    CROSS JOIN LATERAL jsonb_array_elements(product.pdp_a_plus) AS modules(module)
    WHERE image.id=p_image AND module->>'image'=image.blob_url
  ) THEN RAISE EXCEPTION 'image is used by product PDP content'; END IF;
  RETURN QUERY WITH removed AS (
    DELETE FROM retail_product_images WHERE id=p_image
      RETURNING retail_product_images.blob_url,retail_product_images.blob_key
  ), queued AS (
    INSERT INTO retail_blob_delete_outbox(blob_url)
      SELECT removed.blob_url FROM removed ON CONFLICT DO NOTHING
  ) SELECT removed.blob_url,removed.blob_key FROM removed;
END $$;

CREATE OR REPLACE FUNCTION retail_update_admin_product_pdp_content_as_actor(
  p_public_id UUID,p_highlights JSONB,p_details JSONB,p_a_plus JSONB,p_key UUID,
  p_actor_id TEXT,p_actor_name TEXT,p_actor_role TEXT,p_legacy BOOLEAN
) RETURNS TABLE(public_id UUID,replayed BOOLEAN) LANGUAGE plpgsql AS $$
DECLARE payload JSONB; prior retail_admin_idempotency%ROWTYPE; v_product_id UUID;
BEGIN
  IF NOT retail_pdp_highlights_valid(p_highlights) OR NOT retail_pdp_details_valid(p_details) OR NOT retail_pdp_a_plus_valid(p_a_plus) THEN
    RAISE EXCEPTION 'invalid product PDP content';
  END IF;
  payload:=jsonb_build_object('productId',p_public_id,'highlights',p_highlights,'details',p_details,'aPlus',p_a_plus);
  PERFORM pg_advisory_xact_lock(hashtextextended(p_key::text,0));
  SELECT * INTO prior FROM retail_admin_idempotency WHERE idempotency_key=p_key FOR UPDATE;
  IF FOUND THEN
    IF prior.operation<>'product.pdp_content.update' OR prior.request_payload<>payload THEN RAISE EXCEPTION 'idempotency conflict'; END IF;
    PERFORM retail_attribute_admin_audit(p_key,'product.pdp_content.update','product',p_public_id::text,payload,p_actor_id,p_actor_name,p_actor_role,p_legacy);
    RETURN QUERY SELECT p_public_id,true; RETURN;
  END IF;
  SELECT product.id INTO v_product_id FROM retail_products product WHERE product.public_id=p_public_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'product not found'; END IF;
  -- Content updates and media deletion use the same product-then-image lock
  -- order. Whichever operation wins is rechecked by the loser after waiting.
  PERFORM 1
  FROM retail_product_images image
  WHERE image.product_id=v_product_id
    AND image.blob_url IN (
      SELECT module->>'image'
      FROM jsonb_array_elements(p_a_plus) AS modules(module)
      WHERE module ? 'image'
    )
  ORDER BY image.id
  FOR UPDATE;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_a_plus) item
    WHERE item ? 'image' AND NOT EXISTS (
      SELECT 1 FROM retail_product_images image
      WHERE image.product_id=v_product_id AND image.blob_url=item->>'image'
    )
  ) THEN RAISE EXCEPTION 'A+ image must belong to the product media library'; END IF;
  INSERT INTO retail_admin_idempotency(idempotency_key,operation,request_payload,response_payload)
    VALUES(p_key,'product.pdp_content.update',payload,jsonb_build_object('publicId',p_public_id));
  UPDATE retail_products SET pdp_highlights=p_highlights,pdp_details=p_details,pdp_a_plus=p_a_plus,updated_at=now() WHERE id=v_product_id;
  PERFORM retail_attribute_admin_audit(p_key,'product.pdp_content.update','product',p_public_id::text,payload,p_actor_id,p_actor_name,p_actor_role,p_legacy);
  RETURN QUERY SELECT p_public_id,false;
END $$;
