-- Media deletion support is intentionally kept separate from the agent API
-- sections that may share this deployment migration.
-- Keep the product row ahead of the image row so this serializes with the PDP
-- editor, which uses the same product-then-image order.
CREATE OR REPLACE FUNCTION retail_detach_product_image_as_actor(
  p_image UUID,p_remove_references BOOLEAN,p_key UUID,
  p_actor_id TEXT,p_actor_name TEXT,p_actor_role TEXT,p_legacy BOOLEAN
) RETURNS TABLE(blob_url TEXT,blob_key TEXT,deleted BOOLEAN,replayed BOOLEAN,removed_references BOOLEAN) LANGUAGE plpgsql AS $$
DECLARE
  prior retail_admin_idempotency%ROWTYPE;
  v_product_id UUID;
  v_public_id UUID;
  v_blob_url TEXT;
  v_blob_key TEXT;
  v_referenced BOOLEAN := false;
  payload JSONB;
BEGIN
  payload := jsonb_build_object('imageId',p_image,'removeReferences',p_remove_references);
  PERFORM pg_advisory_xact_lock(hashtextextended(p_key::text,0));
  SELECT * INTO prior FROM retail_admin_idempotency WHERE idempotency_key=p_key FOR UPDATE;
  IF FOUND THEN
    IF prior.operation <> 'product.image.detach' OR prior.request_payload <> payload THEN
      RAISE EXCEPTION 'idempotency conflict';
    END IF;
    PERFORM retail_attribute_admin_audit(
      p_key,'product.image.detach',
      prior.response_payload->>'auditEntityType',prior.response_payload->>'auditEntityId',
      prior.response_payload->'auditDetail',
      p_actor_id,p_actor_name,p_actor_role,p_legacy
    );
    RETURN QUERY SELECT prior.response_payload->>'blobUrl',prior.response_payload->>'blobKey',COALESCE((prior.response_payload->>'deleted')::boolean,false),true,COALESCE((prior.response_payload->>'removedReferences')::boolean,false);
    RETURN;
  END IF;

  -- Read the owner only to find the product lock. The image is re-read and
  -- locked after the product lock, avoiding an image-then-product cycle.
  SELECT image.product_id INTO v_product_id FROM retail_product_images image WHERE image.id=p_image;
  IF NOT FOUND THEN
    INSERT INTO retail_admin_idempotency(idempotency_key,operation,request_payload,response_payload)
      VALUES(p_key,'product.image.detach',payload,jsonb_build_object(
        'deleted',false,'removedReferences',false,
        'auditEntityType','product_image','auditEntityId',p_image::text,'auditDetail',payload
      ));
    PERFORM retail_attribute_admin_audit(p_key,'product.image.detach','product_image',p_image::text,payload,p_actor_id,p_actor_name,p_actor_role,p_legacy);
    RETURN QUERY SELECT NULL::text,NULL::text,false,false,false;
    RETURN;
  END IF;

  SELECT product.id,product.public_id INTO v_product_id,v_public_id FROM retail_products product WHERE product.id=v_product_id FOR UPDATE;
  SELECT image.blob_url,image.blob_key INTO v_blob_url,v_blob_key FROM retail_product_images image WHERE image.id=p_image AND image.product_id=v_product_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO retail_admin_idempotency(idempotency_key,operation,request_payload,response_payload)
      VALUES(p_key,'product.image.detach',payload,jsonb_build_object(
        'deleted',false,'removedReferences',false,
        'auditEntityType','product','auditEntityId',v_public_id::text,'auditDetail',payload
      ));
    PERFORM retail_attribute_admin_audit(p_key,'product.image.detach','product',v_public_id::text,payload,p_actor_id,p_actor_name,p_actor_role,p_legacy);
    RETURN QUERY SELECT NULL::text,NULL::text,false,false,false;
    RETURN;
  END IF;

  v_referenced := EXISTS (SELECT 1 FROM jsonb_array_elements((SELECT pdp_a_plus FROM retail_products WHERE id=v_product_id)) module WHERE module->>'image'=v_blob_url);
  IF v_referenced AND NOT p_remove_references THEN RAISE EXCEPTION 'image is used by product PDP content'; END IF;
  IF v_referenced THEN
    UPDATE retail_products SET
      pdp_a_plus=(SELECT COALESCE(jsonb_agg(CASE WHEN module->>'image'=v_blob_url THEN module-'image' ELSE module END ORDER BY position),'[]'::jsonb) FROM jsonb_array_elements(pdp_a_plus) WITH ORDINALITY AS modules(module,position)),
      updated_at=now()
    WHERE id=v_product_id;
  END IF;
  DELETE FROM retail_product_images WHERE id=p_image;
  INSERT INTO retail_blob_delete_outbox(blob_url) VALUES(v_blob_url) ON CONFLICT DO NOTHING;
  INSERT INTO retail_admin_idempotency(idempotency_key,operation,request_payload,response_payload)
    VALUES(p_key,'product.image.detach',payload,jsonb_build_object(
      'blobUrl',v_blob_url,'blobKey',v_blob_key,'deleted',true,'removedReferences',v_referenced,
      'auditEntityType','product','auditEntityId',v_public_id::text,
      'auditDetail',payload || jsonb_build_object('removedReferences',v_referenced)
    ));
  PERFORM retail_attribute_admin_audit(p_key,'product.image.detach','product',v_public_id::text,payload || jsonb_build_object('removedReferences',v_referenced),p_actor_id,p_actor_name,p_actor_role,p_legacy);
  RETURN QUERY SELECT v_blob_url,v_blob_key,true,false,v_referenced;
END $$;
