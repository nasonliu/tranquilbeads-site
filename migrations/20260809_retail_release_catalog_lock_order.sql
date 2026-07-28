-- Keep every V3 inventory mutation in the same lock order as checkout:
-- variant rows/balances first (by variant id), then product mirrors (by
-- product id).  Compatibility product inventory is derived state, never an
-- independently mutable source of truth.

-- PayPal denial/reversal arrives before db.ts changes the order status, so it
-- cannot delegate release to the order-status trigger.  The old version
-- released product rows directly and could therefore deadlock against a V3
-- checkout that already held a variant row.  Retain its public signature and
-- idempotent success result, but release the variant half first.
CREATE OR REPLACE FUNCTION retail_release_order_reservations(p_paypal_order TEXT,p_reason TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE o retail_orders%ROWTYPE; r RECORD;
BEGIN
  IF p_reason NOT IN ('payment_denied','payment_approval_reversed') THEN
    RAISE EXCEPTION 'invalid reservation release reason';
  END IF;
  SELECT * INTO o FROM retail_orders WHERE paypal_order_id=p_paypal_order FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF (p_reason='payment_denied' AND o.status NOT IN ('created','approved','capturing','denied'))
     OR (p_reason='payment_approval_reversed' AND o.status NOT IN ('created','approved')) THEN
    RETURN false;
  END IF;

  -- Lock all active variant reservations and their balances one-by-one in a
  -- fixed order.  Do this completely before touching any product mirror.
  FOR r IN
    SELECT rv.id,rv.variant_id
      FROM retail_variant_inventory_reservations rv
     WHERE rv.order_id=o.id AND rv.status='active'
     ORDER BY rv.variant_id,rv.id FOR UPDATE OF rv
  LOOP
    PERFORM 1
      FROM retail_product_variants v
      JOIN retail_variant_inventory_balances vb ON vb.variant_id=v.id
     WHERE v.id=r.variant_id FOR UPDATE OF v,vb;
    IF NOT FOUND THEN RAISE EXCEPTION 'variant reservation balance missing'; END IF;
  END LOOP;
  FOR r IN
    SELECT rv.id,rv.variant_id,rv.quantity
      FROM retail_variant_inventory_reservations rv
     WHERE rv.order_id=o.id AND rv.status='active'
     ORDER BY rv.variant_id,rv.id
  LOOP
    UPDATE retail_variant_inventory_balances
       SET reserved=reserved-r.quantity,updated_at=now()
     WHERE variant_id=r.variant_id AND reserved>=r.quantity;
    IF NOT FOUND THEN RAISE EXCEPTION 'variant reservation balance invalid'; END IF;
    UPDATE retail_variant_inventory_reservations SET status='released'
     WHERE id=r.id AND status='active';
    IF NOT FOUND THEN RAISE EXCEPTION 'variant reservation changed concurrently'; END IF;
    INSERT INTO retail_variant_inventory_ledger(variant_id,delta_reserved,reason,idempotency_key,reference_id)
      VALUES(r.variant_id,-r.quantity,p_reason,md5(p_reason||':variant:'||r.id::text)::uuid,r.id)
      ON CONFLICT(idempotency_key) DO NOTHING;
  END LOOP;

  -- Only after all variant state is locked/released may the compatibility
  -- mirrors be locked and released.
  FOR r IN
    SELECT rv.id,rv.product_id
      FROM retail_inventory_reservations rv
     WHERE rv.order_id=o.id AND rv.status='active'
     ORDER BY rv.product_id,rv.id FOR UPDATE OF rv
  LOOP
    PERFORM 1
      FROM retail_products p
      JOIN retail_inventory_balances pb ON pb.product_id=p.id
     WHERE p.id=r.product_id FOR UPDATE OF p,pb;
    IF NOT FOUND THEN RAISE EXCEPTION 'product reservation balance missing'; END IF;
  END LOOP;
  FOR r IN
    SELECT rv.id,rv.product_id,rv.quantity
      FROM retail_inventory_reservations rv
     WHERE rv.order_id=o.id AND rv.status='active'
     ORDER BY rv.product_id,rv.id
  LOOP
    UPDATE retail_inventory_balances
       SET reserved=reserved-r.quantity,updated_at=now()
     WHERE product_id=r.product_id AND reserved>=r.quantity;
    IF NOT FOUND THEN RAISE EXCEPTION 'reservation balance invalid'; END IF;
    UPDATE retail_inventory_reservations SET status='released'
     WHERE id=r.id AND status='active';
    IF NOT FOUND THEN RAISE EXCEPTION 'reservation changed concurrently'; END IF;
    INSERT INTO retail_inventory_ledger(product_id,delta_reserved,reason,idempotency_key,reference_id)
      VALUES(r.product_id,-r.quantity,p_reason,md5(p_reason||':'||r.id::text)::uuid,r.id)
      ON CONFLICT(idempotency_key) DO NOTHING;
  END LOOP;
  RETURN true;
END $$;

-- Catalogue variant create/update can run beside checkout.  Lock all of a
-- product's variants before its single product mirror, then aggregate only
-- after those locks have been obtained.  The old implementation aggregated
-- first and could overwrite a newer checkout/catalogue balance with a stale
-- snapshot.
CREATE OR REPLACE FUNCTION retail_sync_product_inventory_from_variants(p_product_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE totals RECORD; r RECORD;
BEGIN
  -- Catalogue writes can change different variants of the same product before
  -- they call this function.  A product-scoped advisory lock is taken before
  -- the variant phase so those writers cannot each hold one variant and wait
  -- for the other.  It also ensures a waiting sync obtains fresh totals after
  -- the preceding writer commits.
  PERFORM pg_advisory_xact_lock(hashtextextended('retail.catalog.inventory:'||p_product_id::text,0));
  FOR r IN
    SELECT v.id
      FROM retail_product_variants v
      JOIN retail_variant_inventory_balances vb ON vb.variant_id=v.id
     WHERE v.product_id=p_product_id
     ORDER BY v.id FOR UPDATE OF v,vb
  LOOP
    NULL;
  END LOOP;

  PERFORM 1
    FROM retail_products p
    JOIN retail_inventory_balances pb ON pb.product_id=p.id
   WHERE p.id=p_product_id FOR UPDATE OF p,pb;
  IF NOT FOUND THEN RAISE EXCEPTION 'product inventory mirror missing'; END IF;

  SELECT COALESCE(sum(vb.on_hand),0)::bigint AS on_hand,
         COALESCE(sum(vb.reserved),0)::bigint AS reserved
    INTO totals
    FROM retail_product_variants v
    JOIN retail_variant_inventory_balances vb ON vb.variant_id=v.id
   WHERE v.product_id=p_product_id;

  UPDATE retail_inventory_balances
     SET on_hand=totals.on_hand,reserved=totals.reserved,updated_at=now()
   WHERE product_id=p_product_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'product inventory mirror missing'; END IF;
END $$;

-- The legacy product inventory endpoint still adjusts the default variant.
-- It must participate in the same product writer gate, then lock every
-- variant before the product mirror; otherwise an absolute catalogue write
-- can form a product-to-variant cycle after the default row is changed.
CREATE OR REPLACE FUNCTION retail_adjust_inventory_as_actor(
  p_public_id UUID,p_delta BIGINT,p_reason TEXT,p_key UUID,
  p_actor_id TEXT,p_actor_name TEXT,p_actor_role TEXT,p_legacy BOOLEAN
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE payload JSONB; prior retail_admin_idempotency%ROWTYPE; v_product_id UUID; v_variant_id UUID; r RECORD;
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
  SELECT id INTO v_product_id FROM retail_products WHERE public_id=p_public_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'product not found'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('retail.catalog.inventory:'||v_product_id::text,0));
  FOR r IN
    SELECT v.id FROM retail_product_variants v JOIN retail_variant_inventory_balances vb ON vb.variant_id=v.id
     WHERE v.product_id=v_product_id ORDER BY v.id FOR UPDATE OF v,vb
  LOOP
    IF r.id IS NULL THEN RAISE EXCEPTION 'variant inventory missing'; END IF;
  END LOOP;
  SELECT v.id INTO v_variant_id FROM retail_product_variants v
   WHERE v.product_id=v_product_id AND v.option_values='{}'::jsonb;
  IF NOT FOUND THEN RAISE EXCEPTION 'default variant missing'; END IF;
  PERFORM 1 FROM retail_products p JOIN retail_inventory_balances pb ON pb.product_id=p.id
   WHERE p.id=v_product_id FOR UPDATE OF p,pb;
  IF NOT FOUND THEN RAISE EXCEPTION 'product inventory mirror missing'; END IF;
  INSERT INTO retail_admin_idempotency(idempotency_key,operation,request_payload) VALUES(p_key,'inventory.adjust',payload);
  UPDATE retail_variant_inventory_balances SET on_hand=on_hand+p_delta,updated_at=now()
   WHERE variant_id=v_variant_id AND on_hand+p_delta>=reserved;
  IF NOT FOUND THEN RAISE EXCEPTION 'insufficient available inventory'; END IF;
  INSERT INTO retail_variant_inventory_ledger(variant_id,delta_on_hand,reason,idempotency_key) VALUES(v_variant_id,p_delta,p_reason,p_key);
  PERFORM retail_sync_product_inventory_from_variants(v_product_id);
  INSERT INTO retail_inventory_ledger(product_id,delta_on_hand,reason,idempotency_key) VALUES(v_product_id,p_delta,p_reason,p_key);
  UPDATE retail_admin_idempotency SET response_payload=jsonb_build_object('adjusted',true) WHERE idempotency_key=p_key;
  PERFORM retail_attribute_admin_audit(p_key,'inventory.adjust','product',p_public_id::text,payload,p_actor_id,p_actor_name,p_actor_role,p_legacy);
  RETURN true;
END $$;
