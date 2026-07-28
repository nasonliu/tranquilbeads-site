-- Atomic, idempotent media ordering with optimistic concurrency.
ALTER TABLE retail_products ADD COLUMN IF NOT EXISTS media_version BIGINT NOT NULL DEFAULT 0 CHECK (media_version >= 0);

CREATE OR REPLACE FUNCTION retail_reorder_product_media(
  p_public_id UUID, p_image_ids JSONB, p_expected_version BIGINT, p_key UUID
) RETURNS TABLE(media_version BIGINT, image_ids JSONB, replayed BOOLEAN)
LANGUAGE plpgsql AS $$
DECLARE p UUID; current_version BIGINT; prior retail_admin_idempotency%ROWTYPE; payload JSONB; n INT; expected JSONB;
BEGIN
  IF jsonb_typeof(p_image_ids) <> 'array' OR jsonb_array_length(p_image_ids) < 1 OR jsonb_array_length(p_image_ids) > 8 THEN RAISE EXCEPTION 'invalid image order'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements_text(p_image_ids) x WHERE x !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$') THEN RAISE EXCEPTION 'invalid image order'; END IF;
  IF (SELECT count(*) FROM jsonb_array_elements(p_image_ids)) <> (SELECT count(DISTINCT value) FROM jsonb_array_elements_text(p_image_ids)) THEN RAISE EXCEPTION 'duplicate image'; END IF;
  payload := jsonb_build_object('productId',p_public_id,'imageIds',p_image_ids,'expectedVersion',p_expected_version);
  PERFORM pg_advisory_xact_lock(hashtextextended(p_key::text,0));
  SELECT * INTO prior FROM retail_admin_idempotency WHERE idempotency_key=p_key FOR UPDATE;
  IF FOUND THEN
    IF prior.operation <> 'product.media.reorder' OR prior.request_payload <> payload THEN RAISE EXCEPTION 'idempotency conflict'; END IF;
    RETURN QUERY SELECT (prior.response_payload->>'mediaVersion')::bigint,prior.response_payload->'imageIds',true; RETURN;
  END IF;
  SELECT product.id,product.media_version INTO p,current_version
    FROM retail_products AS product WHERE product.public_id=p_public_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'product not found'; END IF;
  IF current_version <> p_expected_version THEN RAISE EXCEPTION 'media_version_conflict'; END IF;
  SELECT count(*) INTO n FROM retail_product_images WHERE product_id=p;
  IF n <> jsonb_array_length(p_image_ids) OR EXISTS (SELECT 1 FROM retail_product_images i WHERE i.product_id=p AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements_text(p_image_ids) x WHERE x::uuid=i.id)) THEN RAISE EXCEPTION 'image_set_mismatch'; END IF;
  INSERT INTO retail_admin_idempotency(idempotency_key,operation,request_payload) VALUES(p_key,'product.media.reorder',payload);
  -- Move the complete locked image set out of the final 0..7 range first.
  -- A direct swap (0 -> 1 and 1 -> 0) can otherwise trip the non-deferrable
  -- unique (product_id, position) constraint mid-statement.
  UPDATE retail_product_images AS image
    SET position=(image.position+100)::smallint WHERE image.product_id=p;
  UPDATE retail_product_images i SET position=(x.ord-1)::smallint FROM jsonb_array_elements_text(p_image_ids) WITH ORDINALITY x(value,ord) WHERE i.product_id=p AND i.id=x.value::uuid;
  UPDATE retail_products AS product
    SET media_version=product.media_version+1,updated_at=now()
    WHERE product.id=p RETURNING product.media_version INTO current_version;
  expected := (SELECT jsonb_agg(i.id ORDER BY i.position) FROM retail_product_images i WHERE i.product_id=p);
  INSERT INTO retail_admin_audit(action,entity_type,entity_id,detail,idempotency_key) VALUES('product.media.reorder','product',p_public_id::text,payload,p_key);
  UPDATE retail_admin_idempotency SET response_payload=jsonb_build_object('mediaVersion',current_version,'imageIds',expected) WHERE idempotency_key=p_key;
  RETURN QUERY SELECT current_version,expected,false;
END $$;
