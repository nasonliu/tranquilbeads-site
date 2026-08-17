-- Stage 6 catalog hierarchy: a product (SPU) owns one or more sellable
-- styles (SKC), and each SKU variant belongs to exactly one style.  Product
-- media remains the shared media source for styles in this first iteration.
CREATE TABLE IF NOT EXISTS retail_product_styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES retail_products(id) ON DELETE CASCADE,
  code TEXT NOT NULL CHECK(code ~ '^[A-Za-z0-9][A-Za-z0-9._-]*$'),
  title_en TEXT NOT NULL DEFAULT '',
  title_ar TEXT NOT NULL DEFAULT '',
  title_zh TEXT NOT NULL DEFAULT '',
  option_values JSONB NOT NULL DEFAULT '{"en":{},"ar":{},"zh":{}}'::jsonb CHECK(jsonb_typeof(option_values)='object'),
  primary_image_id UUID REFERENCES retail_product_images(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','archived')),
  position SMALLINT NOT NULL DEFAULT 0 CHECK(position>=0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id,code)
);
CREATE INDEX IF NOT EXISTS retail_product_styles_product_idx ON retail_product_styles(product_id,status,position,created_at);

-- The SKU-named style is the immutable compatibility/default SKC used by
-- legacy product price and inventory commands.  Other styles remain freely
-- editable, but this identity must not drift when its display data changes.
CREATE OR REPLACE FUNCTION retail_enforce_default_style_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE product_sku TEXT;
BEGIN
  SELECT sku INTO product_sku FROM retail_products WHERE id=OLD.product_id;
  IF OLD.code=product_sku AND NEW.code IS DISTINCT FROM product_sku THEN
    RAISE EXCEPTION 'default style code is immutable';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS retail_enforce_default_style_code ON retail_product_styles;
CREATE TRIGGER retail_enforce_default_style_code
  BEFORE UPDATE OF code ON retail_product_styles
  FOR EACH ROW EXECUTE FUNCTION retail_enforce_default_style_code();

CREATE OR REPLACE FUNCTION retail_validate_style_primary_image()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.primary_image_id IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM retail_product_images image
    WHERE image.id=NEW.primary_image_id AND image.product_id=NEW.product_id
  ) THEN
    RAISE EXCEPTION 'style image must belong to product';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS retail_validate_style_primary_image ON retail_product_styles;
CREATE TRIGGER retail_validate_style_primary_image
  BEFORE INSERT OR UPDATE OF product_id,primary_image_id ON retail_product_styles
  FOR EACH ROW EXECUTE FUNCTION retail_validate_style_primary_image();

ALTER TABLE retail_product_variants ADD COLUMN IF NOT EXISTS style_id UUID REFERENCES retail_product_styles(id) ON DELETE RESTRICT;

-- Every pre-existing product becomes one style, preserving the V3 default
-- variant and every existing checkout/order/inventory key unchanged.
INSERT INTO retail_product_styles(product_id,code,title_en,title_ar,title_zh,option_values,status,position)
SELECT p.id,p.sku,p.title_en,p.title_ar,COALESCE(p.title_zh,p.title_en),'{"en":{},"ar":{},"zh":{}}'::jsonb,
  CASE WHEN p.status='archived' THEN 'archived' ELSE 'active' END,0
FROM retail_products p
ON CONFLICT(product_id,code) DO NOTHING;

UPDATE retail_product_variants v
SET style_id=s.id
FROM retail_product_styles s
WHERE s.product_id=v.product_id AND s.code=(SELECT p.sku FROM retail_products p WHERE p.id=v.product_id)
  AND v.style_id IS NULL;

-- The legacy uniqueness key made it impossible to have the same option tuple
-- in two distinct styles.  SKUs are now unique by style plus option values.
ALTER TABLE retail_product_variants DROP CONSTRAINT IF EXISTS retail_product_variants_product_id_option_values_key;
CREATE UNIQUE INDEX IF NOT EXISTS retail_product_variants_style_options_key
  ON retail_product_variants(style_id,option_values);

CREATE OR REPLACE FUNCTION retail_assign_variant_style()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE assigned_style UUID; product_row retail_products%ROWTYPE;
BEGIN
  -- An omitted style is a legacy/default-SKU operation, not a request to
  -- create a new SKC for every SKU.  Materialize the product-SKU-named style
  -- once, then consistently attach later omitted-style inserts to it.
  IF NEW.style_id IS NULL THEN
    SELECT * INTO product_row FROM retail_products WHERE id=NEW.product_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'variant product missing'; END IF;
    SELECT id INTO assigned_style FROM retail_product_styles
      WHERE product_id=NEW.product_id AND code=product_row.sku;
    IF assigned_style IS NULL THEN
      INSERT INTO retail_product_styles(product_id,code,title_en,title_ar,title_zh,option_values,status,position)
      VALUES(NEW.product_id,product_row.sku,product_row.title_en,product_row.title_ar,COALESCE(product_row.title_zh,product_row.title_en),'{"en":{},"ar":{},"zh":{}}'::jsonb,CASE WHEN product_row.status='archived' THEN 'archived' ELSE 'active' END,0)
      ON CONFLICT(product_id,code) DO NOTHING;
      SELECT id INTO assigned_style FROM retail_product_styles
        WHERE product_id=NEW.product_id AND code=product_row.sku;
    END IF;
    NEW.style_id:=assigned_style;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM retail_product_styles s WHERE s.id=NEW.style_id AND s.product_id=NEW.product_id) THEN
    RAISE EXCEPTION 'variant style must belong to product';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS retail_assign_variant_style ON retail_product_variants;
CREATE TRIGGER retail_assign_variant_style
  BEFORE INSERT OR UPDATE OF product_id,style_id ON retail_product_variants
  FOR EACH ROW EXECUTE FUNCTION retail_assign_variant_style();

-- The backfill above must have covered all old rows before this becomes the
-- durable SKU contract.  A failed assertion rolls back this migration.
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM retail_product_variants WHERE style_id IS NULL) THEN
    RAISE EXCEPTION 'retail variant style backfill incomplete';
  END IF;
END $$;
ALTER TABLE retail_product_variants ALTER COLUMN style_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS retail_product_variants_style_idx ON retail_product_variants(style_id,status,created_at);

-- The default SKC is stable: it is the product's original SKU-named style.
-- Legacy product-level mutations must never choose an arbitrary empty-option
-- SKU once a product owns multiple styles.
CREATE OR REPLACE FUNCTION retail_default_product_style_id(p_product_id UUID)
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT style.id
    FROM retail_product_styles style
    JOIN retail_products product ON product.id=style.product_id
   WHERE style.product_id=p_product_id AND style.code=product.sku
   ORDER BY style.position,style.created_at,style.id
   LIMIT 1
$$;

CREATE OR REPLACE FUNCTION retail_prevent_default_variant_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE product_sku TEXT; default_style UUID;
BEGIN
  SELECT sku INTO product_sku FROM retail_products WHERE id=OLD.product_id;
  default_style:=retail_default_product_style_id(OLD.product_id);
  IF OLD.style_id=default_style AND OLD.sku=product_sku AND OLD.option_values='{}'::jsonb
     AND (NEW.style_id IS DISTINCT FROM default_style OR NEW.sku IS DISTINCT FROM product_sku OR NEW.option_values IS DISTINCT FROM '{}'::jsonb) THEN
    RAISE EXCEPTION 'default variant identity is immutable';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS retail_prevent_default_variant_mutation ON retail_product_variants;
CREATE TRIGGER retail_prevent_default_variant_mutation
  BEFORE UPDATE OF style_id,sku,option_values ON retail_product_variants
  FOR EACH ROW EXECUTE FUNCTION retail_prevent_default_variant_mutation();

CREATE OR REPLACE FUNCTION retail_sync_product_default_variant_price(p_variant_id UUID,p_changed_by TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE v_product_id UUID; v_amount BIGINT;
BEGIN
  SELECT variant.product_id,price.amount_minor INTO v_product_id,v_amount
    FROM retail_product_variants variant
    JOIN LATERAL (SELECT amount_minor FROM retail_variant_price_history WHERE variant_id=variant.id AND active ORDER BY created_at DESC LIMIT 1) price ON true
   WHERE variant.id=p_variant_id
     AND variant.style_id=retail_default_product_style_id(variant.product_id)
     AND variant.option_values='{}'::jsonb;
  IF NOT FOUND THEN RETURN; END IF;
  UPDATE retail_price_history SET active=false WHERE product_id=v_product_id AND active;
  INSERT INTO retail_price_history(product_id,amount_minor,idempotency_key,changed_by)
    VALUES(v_product_id,v_amount,gen_random_uuid(),p_changed_by);
END $$;

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
   WHERE variant.product_id=v_product_id
     AND variant.style_id=retail_default_product_style_id(v_product_id)
     AND variant.option_values='{}'::jsonb FOR UPDATE;
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
  FOR r IN SELECT variant.id FROM retail_product_variants variant JOIN retail_variant_inventory_balances balance ON balance.variant_id=variant.id WHERE variant.product_id=v_product_id ORDER BY variant.id FOR UPDATE OF variant,balance LOOP NULL; END LOOP;
  SELECT variant.id INTO v_variant_id FROM retail_product_variants variant
   WHERE variant.product_id=v_product_id
     AND variant.style_id=retail_default_product_style_id(v_product_id)
     AND variant.option_values='{}'::jsonb;
  IF NOT FOUND THEN RAISE EXCEPTION 'default variant missing'; END IF;
  PERFORM 1 FROM retail_products product JOIN retail_inventory_balances balance ON balance.product_id=product.id WHERE product.id=v_product_id FOR UPDATE OF product,balance;
  IF NOT FOUND THEN RAISE EXCEPTION 'product inventory mirror missing'; END IF;
  INSERT INTO retail_admin_idempotency(idempotency_key,operation,request_payload) VALUES(p_key,'inventory.adjust',payload);
  UPDATE retail_variant_inventory_balances SET on_hand=on_hand+p_delta,updated_at=now() WHERE variant_id=v_variant_id AND on_hand+p_delta>=reserved;
  IF NOT FOUND THEN RAISE EXCEPTION 'insufficient available inventory'; END IF;
  INSERT INTO retail_variant_inventory_ledger(variant_id,delta_on_hand,reason,idempotency_key) VALUES(v_variant_id,p_delta,p_reason,p_key);
  PERFORM retail_sync_product_inventory_from_variants(v_product_id);
  INSERT INTO retail_inventory_ledger(product_id,delta_on_hand,reason,idempotency_key) VALUES(v_product_id,p_delta,p_reason,p_key);
  UPDATE retail_admin_idempotency SET response_payload=jsonb_build_object('adjusted',true) WHERE idempotency_key=p_key;
  PERFORM retail_attribute_admin_audit(p_key,'inventory.adjust','product',p_public_id::text,payload,p_actor_id,p_actor_name,p_actor_role,p_legacy);
  RETURN true;
END $$;

-- Keep the later locale and promotion patches intact while extending their
-- authoritative lookups, locks, and persisted order-line source with active
-- style membership.  These guards make an archived SKC non-sellable.
DO $$
DECLARE definition TEXT;
BEGIN
  SELECT pg_get_functiondef('retail_quote_checkout_v3(jsonb,jsonb,text)'::regprocedure) INTO definition;
  IF position('JOIN retail_product_variants v ON v.sku=COALESCE(x->>''variantSku'',x->>''sku'') AND v.status=''active'' JOIN retail_products p' IN definition)=0 THEN RAISE EXCEPTION 'retail quote style patch source missing'; END IF;
  definition:=replace(definition,
    'JOIN retail_product_variants v ON v.sku=COALESCE(x->>''variantSku'',x->>''sku'') AND v.status=''active'' JOIN retail_products p',
    'JOIN retail_product_variants v ON v.sku=COALESCE(x->>''variantSku'',x->>''sku'') AND v.status=''active'' JOIN retail_product_styles style ON style.id=v.style_id AND style.status=''active'' JOIN retail_products p');
  EXECUTE definition;

  SELECT pg_get_functiondef('retail_create_checkout_v3(uuid,jsonb,jsonb,bigint,text)'::regprocedure) INTO definition;
  IF position('JOIN retail_product_variants v ON v.sku=COALESCE(x->>''variantSku'',x->>''sku'') JOIN retail_variant_inventory_balances vb' IN definition)=0
     OR position('FROM jsonb_array_elements(q.items_snapshot) x JOIN retail_product_variants v ON v.sku=x->>''variantSku'';' IN definition)=0 THEN RAISE EXCEPTION 'retail checkout style patch source missing'; END IF;
  definition:=replace(definition,
    'JOIN retail_product_variants v ON v.sku=COALESCE(x->>''variantSku'',x->>''sku'') JOIN retail_variant_inventory_balances vb ON vb.variant_id=v.id',
    'JOIN retail_product_variants v ON v.sku=COALESCE(x->>''variantSku'',x->>''sku'') JOIN retail_product_styles style ON style.id=v.style_id AND style.status=''active'' JOIN retail_variant_inventory_balances vb ON vb.variant_id=v.id');
  definition:=replace(definition,'ORDER BY v.id FOR UPDATE OF v,vb','ORDER BY v.id FOR UPDATE OF v,style,vb');
  definition:=replace(definition,
    'FROM (SELECT v.product_id,sum((x->>''quantity'')::bigint) quantity FROM jsonb_array_elements(p_items) x JOIN retail_product_variants v ON v.sku=COALESCE(x->>''variantSku'',x->>''sku'') GROUP BY v.product_id) w',
    'FROM (SELECT v.product_id,sum((x->>''quantity'')::bigint) quantity FROM jsonb_array_elements(p_items) x JOIN retail_product_variants v ON v.sku=COALESCE(x->>''variantSku'',x->>''sku'') JOIN retail_product_styles style ON style.id=v.style_id AND style.status=''active'' GROUP BY v.product_id) w');
  definition:=replace(definition,
    '(SELECT count(DISTINCT v.product_id) FROM jsonb_array_elements(p_items) x JOIN retail_product_variants v ON v.sku=COALESCE(x->>''variantSku'',x->>''sku''))',
    '(SELECT count(DISTINCT v.product_id) FROM jsonb_array_elements(p_items) x JOIN retail_product_variants v ON v.sku=COALESCE(x->>''variantSku'',x->>''sku'') JOIN retail_product_styles style ON style.id=v.style_id AND style.status=''active'')');
  definition:=replace(definition,
    'FROM jsonb_array_elements(q.items_snapshot) x JOIN retail_product_variants v ON v.sku=x->>''variantSku'';',
    'FROM jsonb_array_elements(q.items_snapshot) x JOIN retail_product_variants v ON v.sku=x->>''variantSku'' JOIN retail_product_styles style ON style.id=v.style_id AND style.status=''active'';');
  IF position('style.status=''active''' IN definition)=0 OR position('FOR UPDATE OF v,style,vb' IN definition)=0 THEN RAISE EXCEPTION 'retail checkout style patch did not apply'; END IF;
  EXECUTE definition;
END $$;
