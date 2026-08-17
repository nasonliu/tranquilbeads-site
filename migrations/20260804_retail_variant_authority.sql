-- V3 sells variants.  Product-level price and inventory tables remain only as
-- compatibility mirrors for the legacy order lifecycle, never as an
-- independently writable source of retail truth.

CREATE OR REPLACE FUNCTION retail_sync_product_inventory_from_variants(p_product_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE totals RECORD;
BEGIN
  SELECT COALESCE(sum(balance.on_hand),0)::bigint AS on_hand,
         COALESCE(sum(balance.reserved),0)::bigint AS reserved
    INTO totals
    FROM retail_product_variants variant
    JOIN retail_variant_inventory_balances balance ON balance.variant_id=variant.id
   WHERE variant.product_id=p_product_id;

  UPDATE retail_inventory_balances
     SET on_hand=totals.on_hand,reserved=totals.reserved,updated_at=now()
   WHERE product_id=p_product_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'product inventory mirror missing';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION retail_sync_product_default_variant_price(p_variant_id UUID,p_changed_by TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE v_product_id UUID; v_amount BIGINT;
BEGIN
  SELECT variant.product_id,price.amount_minor INTO v_product_id,v_amount
    FROM retail_product_variants variant
    JOIN LATERAL (
      SELECT amount_minor FROM retail_variant_price_history
       WHERE variant_id=variant.id AND active ORDER BY created_at DESC LIMIT 1
    ) price ON true
   WHERE variant.id=p_variant_id AND variant.option_values='{}'::jsonb;
  IF NOT FOUND THEN RETURN; END IF;
  UPDATE retail_price_history SET active=false WHERE product_id=v_product_id AND active;
  INSERT INTO retail_price_history(product_id,amount_minor,idempotency_key,changed_by)
    VALUES(v_product_id,v_amount,gen_random_uuid(),p_changed_by);
END $$;

-- New product creation is a single database transaction: the public product,
-- its default sellable variant, both price histories, and the compatibility
-- inventory mirror either all exist or none do.
CREATE OR REPLACE FUNCTION retail_create_admin_product_variant_authority_as_actor(
  p_sku TEXT,p_slug TEXT,p_title_en TEXT,p_title_ar TEXT,p_title_zh TEXT,
  p_description_en TEXT,p_description_ar TEXT,p_description_zh TEXT,p_status TEXT,
  p_amount_minor BIGINT,p_on_hand BIGINT,p_key UUID,
  p_actor_id TEXT,p_actor_name TEXT,p_actor_role TEXT,p_legacy BOOLEAN
) RETURNS TABLE(public_id UUID,replayed BOOLEAN) LANGUAGE plpgsql AS $$
DECLARE payload JSONB; prior retail_admin_idempotency%ROWTYPE; v_product_id UUID; product_public UUID; v_variant_id UUID;
BEGIN
  IF p_status NOT IN ('draft','archived') OR p_amount_minor<=0 OR p_on_hand<0 THEN
    RAISE EXCEPTION 'invalid product state';
  END IF;
  payload:=jsonb_build_object(
    'sku',p_sku,'slug',p_slug,'titleEn',p_title_en,'titleAr',p_title_ar,'titleZh',p_title_zh,
    'descriptionEn',p_description_en,'descriptionAr',p_description_ar,'descriptionZh',p_description_zh,
    'status',p_status,'amountMinor',p_amount_minor,'onHand',p_on_hand
  );
  PERFORM pg_advisory_xact_lock(hashtextextended(p_key::text,0));
  SELECT * INTO prior FROM retail_admin_idempotency WHERE idempotency_key=p_key FOR UPDATE;
  IF FOUND THEN
    IF prior.operation<>'product.create' OR prior.request_payload<>payload THEN
      RAISE EXCEPTION 'idempotency conflict';
    END IF;
    PERFORM retail_attribute_admin_audit(p_key,'product.create','product',prior.response_payload->>'publicId',payload,p_actor_id,p_actor_name,p_actor_role,p_legacy);
    RETURN QUERY SELECT (prior.response_payload->>'publicId')::uuid,true;
    RETURN;
  END IF;

  INSERT INTO retail_admin_idempotency(idempotency_key,operation,request_payload)
    VALUES(p_key,'product.create',payload);
  INSERT INTO retail_products(sku,slug,title_en,title_ar,title_zh,description_en,description_ar,description_zh,status)
    VALUES(p_sku,p_slug,p_title_en,p_title_ar,NULLIF(p_title_zh,''),p_description_en,p_description_ar,NULLIF(p_description_zh,''),p_status)
    RETURNING id,retail_products.public_id INTO v_product_id,product_public;
  INSERT INTO retail_inventory_balances(product_id,on_hand,reserved) VALUES(v_product_id,p_on_hand,0);
  INSERT INTO retail_price_history(product_id,amount_minor,idempotency_key,changed_by)
    VALUES(v_product_id,p_amount_minor,p_key,p_actor_id);
  INSERT INTO retail_product_variants(product_id,sku,title_en,title_ar,title_zh,option_values,status)
    VALUES(v_product_id,p_sku,p_title_en,p_title_ar,COALESCE(NULLIF(p_title_zh,''),p_title_en),'{}'::jsonb,'active')
    RETURNING id INTO v_variant_id;
  INSERT INTO retail_variant_inventory_balances(variant_id,on_hand,reserved) VALUES(v_variant_id,p_on_hand,0);
  INSERT INTO retail_variant_price_history(variant_id,amount_minor,idempotency_key,changed_by)
    VALUES(v_variant_id,p_amount_minor,p_key,p_actor_id);
  PERFORM retail_attribute_admin_audit(p_key,'product.create','product',product_public::text,payload,p_actor_id,p_actor_name,p_actor_role,p_legacy);
  UPDATE retail_admin_idempotency SET response_payload=jsonb_build_object('publicId',product_public) WHERE idempotency_key=p_key;
  RETURN QUERY SELECT product_public,false;
END $$;

-- The old product-price endpoint now means the default (empty-option) variant
-- price.  The historical product price stays a read-only V2 mirror.
CREATE OR REPLACE FUNCTION retail_change_product_price_as_actor(
  p_public_id UUID,p_amount BIGINT,p_key UUID,p_reason TEXT,
  p_actor_id TEXT,p_actor_name TEXT,p_actor_role TEXT,p_legacy BOOLEAN
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE payload JSONB; prior retail_admin_idempotency%ROWTYPE; v_product_id UUID; v_variant_id UUID;
BEGIN
  IF p_amount<=0 THEN RAISE EXCEPTION 'invalid product or price'; END IF;
  payload:=jsonb_build_object('productId',p_public_id,'amountMinor',p_amount,'reason',p_reason);
  PERFORM pg_advisory_xact_lock(hashtextextended(p_key::text,0));
  SELECT * INTO prior FROM retail_admin_idempotency WHERE idempotency_key=p_key FOR UPDATE;
  IF FOUND THEN
    IF prior.operation<>'product.price' OR prior.request_payload<>payload THEN RAISE EXCEPTION 'idempotency conflict'; END IF;
    PERFORM retail_attribute_admin_audit(p_key,'product.price','product',p_public_id::text,payload,p_actor_id,p_actor_name,p_actor_role,p_legacy);
    RETURN false;
  END IF;
  SELECT id INTO v_product_id FROM retail_products WHERE public_id=p_public_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'product not found'; END IF;
  SELECT variant.id INTO v_variant_id FROM retail_product_variants variant
    WHERE variant.product_id=v_product_id AND variant.option_values='{}'::jsonb FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'default variant missing'; END IF;
  INSERT INTO retail_admin_idempotency(idempotency_key,operation,request_payload) VALUES(p_key,'product.price',payload);
  UPDATE retail_price_history history SET active=false WHERE history.product_id=v_product_id AND active;
  INSERT INTO retail_price_history(product_id,amount_minor,idempotency_key,changed_by) VALUES(v_product_id,p_amount,p_key,p_actor_id||':'||p_reason);
  UPDATE retail_variant_price_history history SET active=false WHERE history.variant_id=v_variant_id AND active;
  INSERT INTO retail_variant_price_history(variant_id,amount_minor,idempotency_key,changed_by) VALUES(v_variant_id,p_amount,p_key,p_actor_id||':'||p_reason);
  UPDATE retail_admin_idempotency SET response_payload=jsonb_build_object('changed',true) WHERE idempotency_key=p_key;
  PERFORM retail_attribute_admin_audit(p_key,'product.price','product',p_public_id::text,payload,p_actor_id,p_actor_name,p_actor_role,p_legacy);
  RETURN true;
END $$;

-- Likewise, the legacy product stock adjustment only changes the default
-- variant, then recomputes the product compatibility mirror from all variants.
CREATE OR REPLACE FUNCTION retail_adjust_inventory_as_actor(
  p_public_id UUID,p_delta BIGINT,p_reason TEXT,p_key UUID,
  p_actor_id TEXT,p_actor_name TEXT,p_actor_role TEXT,p_legacy BOOLEAN
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE payload JSONB; prior retail_admin_idempotency%ROWTYPE; v_product_id UUID; v_variant_id UUID;
BEGIN
  IF p_delta=0 THEN RAISE EXCEPTION 'invalid inventory delta'; END IF;
  payload:=jsonb_build_object('productId',p_public_id,'delta',p_delta,'reason',p_reason);
  PERFORM pg_advisory_xact_lock(hashtextextended(p_key::text,0));
  SELECT * INTO prior FROM retail_admin_idempotency WHERE idempotency_key=p_key FOR UPDATE;
  IF FOUND THEN
    IF prior.operation<>'inventory.adjust' OR prior.request_payload<>payload THEN RAISE EXCEPTION 'idempotency conflict'; END IF;
    PERFORM retail_attribute_admin_audit(p_key,'inventory.adjust','product',p_public_id::text,payload,p_actor_id,p_actor_name,p_actor_role,p_legacy);
    RETURN false;
  END IF;
  SELECT id INTO v_product_id FROM retail_products WHERE public_id=p_public_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'product not found'; END IF;
  SELECT variant.id INTO v_variant_id FROM retail_product_variants variant
    WHERE variant.product_id=v_product_id AND variant.option_values='{}'::jsonb FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'default variant missing'; END IF;
  INSERT INTO retail_admin_idempotency(idempotency_key,operation,request_payload) VALUES(p_key,'inventory.adjust',payload);
  UPDATE retail_variant_inventory_balances SET on_hand=on_hand+p_delta,updated_at=now()
    WHERE retail_variant_inventory_balances.variant_id=v_variant_id AND on_hand+p_delta>=reserved;
  IF NOT FOUND THEN RAISE EXCEPTION 'insufficient available inventory'; END IF;
  INSERT INTO retail_variant_inventory_ledger(variant_id,delta_on_hand,reason,idempotency_key)
    VALUES(v_variant_id,p_delta,p_reason,p_key);
  PERFORM retail_sync_product_inventory_from_variants(v_product_id);
  INSERT INTO retail_inventory_ledger(product_id,delta_on_hand,reason,idempotency_key)
    VALUES(v_product_id,p_delta,p_reason,p_key);
  UPDATE retail_admin_idempotency SET response_payload=jsonb_build_object('adjusted',true) WHERE idempotency_key=p_key;
  PERFORM retail_attribute_admin_audit(p_key,'inventory.adjust','product',p_public_id::text,payload,p_actor_id,p_actor_name,p_actor_role,p_legacy);
  RETURN true;
END $$;
