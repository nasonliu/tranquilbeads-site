-- Stage 3A: variant and promotion primitives.  This migration is additive:
-- V2 checkout and its product-level tables remain usable for rolling deploys.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS retail_product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES retail_products(id) ON DELETE CASCADE,
  sku TEXT NOT NULL UNIQUE,
  title_en TEXT NOT NULL DEFAULT '',
  title_ar TEXT NOT NULL DEFAULT '',
  title_zh TEXT NOT NULL DEFAULT '',
  option_values JSONB NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(option_values)='object'),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id,option_values)
);
CREATE INDEX IF NOT EXISTS retail_product_variants_checkout_idx ON retail_product_variants(sku,status,product_id);

CREATE TABLE IF NOT EXISTS retail_variant_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES retail_product_variants(id) ON DELETE CASCADE,
  amount_minor BIGINT NOT NULL CHECK(amount_minor>0),
  currency CHAR(3) NOT NULL DEFAULT 'USD' CHECK(currency='USD'),
  active BOOLEAN NOT NULL DEFAULT true,
  idempotency_key UUID NOT NULL UNIQUE,
  changed_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS retail_variant_price_active_idx ON retail_variant_price_history(variant_id,created_at DESC) WHERE active;

CREATE TABLE IF NOT EXISTS retail_variant_inventory_balances (
  variant_id UUID PRIMARY KEY REFERENCES retail_product_variants(id) ON DELETE CASCADE,
  on_hand BIGINT NOT NULL DEFAULT 0 CHECK(on_hand>=0),
  reserved BIGINT NOT NULL DEFAULT 0 CHECK(reserved>=0 AND reserved<=on_hand),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS retail_variant_inventory_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES retail_product_variants(id),
  delta_on_hand BIGINT NOT NULL DEFAULT 0,
  delta_reserved BIGINT NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  idempotency_key UUID NOT NULL UNIQUE,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS retail_variant_inventory_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id BIGINT NOT NULL REFERENCES retail_orders(id),
  request_id UUID NOT NULL,
  variant_id UUID NOT NULL REFERENCES retail_product_variants(id),
  quantity BIGINT NOT NULL CHECK(quantity>0),
  status TEXT NOT NULL CHECK(status IN ('active','consumed','released','expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  idempotency_key UUID NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(request_id,variant_id)
);
CREATE INDEX IF NOT EXISTS retail_variant_inventory_reservations_expiry_idx ON retail_variant_inventory_reservations(status,expires_at);

CREATE TABLE IF NOT EXISTS retail_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id BIGINT NOT NULL REFERENCES retail_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES retail_products(id),
  variant_id UUID NOT NULL REFERENCES retail_product_variants(id),
  product_sku TEXT NOT NULL,
  variant_sku TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  title_zh TEXT NOT NULL,
  option_values JSONB NOT NULL DEFAULT '{}'::jsonb,
  quantity BIGINT NOT NULL CHECK(quantity>0),
  unit_amount_minor BIGINT NOT NULL CHECK(unit_amount_minor>0),
  discount_minor BIGINT NOT NULL DEFAULT 0 CHECK(discount_minor>=0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(order_id,variant_id)
);

CREATE TABLE IF NOT EXISTS retail_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('percent','fixed','free_shipping')),
  amount BIGINT NOT NULL DEFAULT 0 CHECK(amount>=0),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  minimum_subtotal_minor BIGINT NOT NULL DEFAULT 0 CHECK(minimum_subtotal_minor>=0),
  scope JSONB NOT NULL DEFAULT '{"all":true}'::jsonb CHECK(jsonb_typeof(scope)='object'),
  max_redemptions BIGINT CHECK(max_redemptions>0),
  max_per_customer BIGINT CHECK(max_per_customer>0),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK((kind='percent' AND amount BETWEEN 1 AND 10000) OR (kind='fixed' AND amount>0) OR (kind='free_shipping' AND amount=0)),
  CHECK(ends_at IS NULL OR starts_at IS NULL OR ends_at>starts_at)
);
CREATE UNIQUE INDEX IF NOT EXISTS retail_promotions_code_lower_idx ON retail_promotions(lower(code));
CREATE TABLE IF NOT EXISTS retail_promotion_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES retail_promotions(id),
  order_id BIGINT NOT NULL REFERENCES retail_orders(id) ON DELETE CASCADE,
  request_id UUID NOT NULL,
  customer_email TEXT NOT NULL,
  discount_minor BIGINT NOT NULL CHECK(discount_minor>=0),
  status TEXT NOT NULL CHECK(status IN ('reserved','committed','released')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  committed_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  UNIQUE(promotion_id,order_id),
  UNIQUE(promotion_id,request_id)
);
CREATE INDEX IF NOT EXISTS retail_promotion_redemptions_limit_idx ON retail_promotion_redemptions(promotion_id,customer_email,status);

-- One default variant makes every legacy product immediately saleable through
-- V3.  Price and stock are copied exactly; product-level stock remains a
-- compatibility mirror for V2 and is rechecked by V3 before every hold.
INSERT INTO retail_product_variants(product_id,sku,title_en,title_ar,title_zh,option_values,status)
SELECT p.id,p.sku,p.title_en,p.title_ar,COALESCE(p.title_zh,p.title_en),'{}'::jsonb,
  CASE WHEN p.status='archived' THEN 'archived' ELSE 'active' END
FROM retail_products p
ON CONFLICT(sku) DO NOTHING;
INSERT INTO retail_variant_price_history(variant_id,amount_minor,currency,active,idempotency_key,changed_by,created_at)
SELECT v.id,h.amount_minor,h.currency,h.active,md5('variant-price-backfill:'||h.id::text)::uuid,h.changed_by,h.created_at
FROM retail_product_variants v JOIN retail_price_history h ON h.product_id=v.product_id
WHERE v.option_values='{}'::jsonb
ON CONFLICT(idempotency_key) DO NOTHING;
INSERT INTO retail_variant_inventory_balances(variant_id,on_hand,reserved,updated_at)
SELECT v.id,b.on_hand,b.reserved,b.updated_at FROM retail_product_variants v
JOIN retail_inventory_balances b ON b.product_id=v.product_id WHERE v.option_values='{}'::jsonb
ON CONFLICT(variant_id) DO NOTHING;
INSERT INTO retail_variant_inventory_reservations(order_id,request_id,variant_id,quantity,status,expires_at,idempotency_key,created_at)
SELECT r.order_id,r.request_id,v.id,r.quantity,r.status,r.expires_at,md5('variant-reservation-backfill:'||r.id::text)::uuid,r.created_at
FROM retail_inventory_reservations r JOIN retail_product_variants v ON v.product_id=r.product_id AND v.option_values='{}'::jsonb
ON CONFLICT(idempotency_key) DO NOTHING;

CREATE OR REPLACE FUNCTION retail_promotion_discount(p_promotion retail_promotions,p_subtotal BIGINT,p_shipping BIGINT,p_variant_skus JSONB)
RETURNS BIGINT LANGUAGE plpgsql STABLE AS $$
DECLARE scoped BOOLEAN;
BEGIN
  IF p_promotion IS NULL OR NOT p_promotion.active OR p_subtotal<p_promotion.minimum_subtotal_minor
    OR (p_promotion.starts_at IS NOT NULL AND p_promotion.starts_at>now()) OR (p_promotion.ends_at IS NOT NULL AND p_promotion.ends_at<=now()) THEN RETURN 0; END IF;
  scoped := COALESCE((p_promotion.scope->>'all')::boolean,false) OR NOT (p_promotion.scope ? 'variantSkus')
    OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(COALESCE(p_promotion.scope->'variantSkus','[]'::jsonb)) s WHERE p_variant_skus ? s);
  IF NOT scoped THEN RETURN 0; END IF;
  IF p_promotion.kind='percent' THEN RETURN LEAST(p_subtotal,(p_subtotal*p_promotion.amount+5000)/10000); END IF;
  IF p_promotion.kind='fixed' THEN RETURN LEAST(p_subtotal,p_promotion.amount); END IF;
  RETURN p_shipping;
END $$;

CREATE OR REPLACE FUNCTION retail_quote_checkout_v3(p_items JSONB,p_checkout JSONB,p_promo_code TEXT DEFAULT NULL)
RETURNS TABLE(currency CHAR(3),subtotal_minor BIGINT,shipping_minor BIGINT,tax_minor BIGINT,discount_minor BIGINT,total_minor BIGINT,shipping_method TEXT,items_snapshot JSONB,shipping_snapshot JSONB,quote_hash TEXT,promotion_code TEXT,promotion_id UUID)
LANGUAGE plpgsql STABLE AS $$
DECLARE r RECORD; z retail_shipping_zones%ROWTYPE; promo retail_promotions%ROWTYPE; requested_count INT; actual_count INT:=0; subtotal BIGINT:=0; shipping BIGINT; tax BIGINT; discount BIGINT:=0; item JSONB:='[]'::jsonb; normalized_items JSONB; normalized_shipping JSONB; country_code TEXT; email TEXT; terms_ok BOOLEAN; normalized_code TEXT:=NULLIF(upper(trim(COALESCE(p_promo_code,''))),''); sku_set JSONB;
BEGIN
  IF jsonb_typeof(p_items)<>'array' OR jsonb_array_length(p_items)=0 OR jsonb_array_length(p_items)>10 OR jsonb_typeof(p_checkout)<>'object' THEN RAISE EXCEPTION 'invalid checkout'; END IF;
  SELECT count(*) INTO requested_count FROM jsonb_array_elements(p_items);
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_items) x WHERE jsonb_typeof(x)<>'object' OR COALESCE(x->>'variantSku',x->>'sku','')='' OR COALESCE(x->>'quantity','') !~ '^(?:[1-9]|10)$') THEN RAISE EXCEPTION 'invalid cart'; END IF;
  IF EXISTS(SELECT sku FROM (SELECT COALESCE(x->>'variantSku',x->>'sku') sku FROM jsonb_array_elements(p_items) x) d GROUP BY sku HAVING count(*)>1) THEN RAISE EXCEPTION 'duplicate sku'; END IF;
  email:=lower(trim(COALESCE(p_checkout->>'email',''))); country_code:=upper(trim(COALESCE(p_checkout->>'country',''))); terms_ok:=COALESCE((p_checkout->>'termsAccepted')::boolean,false) AND length(COALESCE(p_checkout->>'termsVersion','')) BETWEEN 1 AND 50;
  IF email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' OR country_code !~ '^[A-Z]{2}$' OR NOT terms_ok OR length(trim(COALESCE(p_checkout->>'recipient','')))=0 OR length(trim(COALESCE(p_checkout->>'line1','')))=0 OR length(trim(COALESCE(p_checkout->>'city','')))=0 THEN RAISE EXCEPTION 'invalid checkout'; END IF;
  SELECT * INTO z FROM retail_shipping_zones WHERE country=country_code AND active; IF NOT FOUND THEN RAISE EXCEPTION 'unsupported shipping country'; END IF;
  FOR r IN SELECT v.id,v.sku variant_sku,p.sku product_sku,p.slug,p.title_en product_title_en,p.title_ar product_title_ar,COALESCE(p.title_zh,p.title_en) product_title_zh,v.title_en,v.title_ar,v.title_zh,v.option_values,vb.on_hand variant_on_hand,vb.reserved variant_reserved,pb.on_hand product_on_hand,pb.reserved product_reserved,h.amount_minor,(x->>'quantity')::bigint quantity
    FROM jsonb_array_elements(p_items) x JOIN retail_product_variants v ON v.sku=COALESCE(x->>'variantSku',x->>'sku') AND v.status='active' JOIN retail_products p ON p.id=v.product_id AND p.status='published' JOIN retail_variant_inventory_balances vb ON vb.variant_id=v.id JOIN retail_inventory_balances pb ON pb.product_id=p.id JOIN LATERAL(SELECT amount_minor FROM retail_variant_price_history WHERE variant_id=v.id AND active ORDER BY created_at DESC LIMIT 1) h ON true ORDER BY v.sku
  LOOP
    actual_count:=actual_count+1; IF r.variant_on_hand-r.variant_reserved<r.quantity OR r.product_on_hand-r.product_reserved<r.quantity THEN RAISE EXCEPTION 'unavailable sku'; END IF;
    IF r.quantity*r.amount_minor>900000000000000-subtotal THEN RAISE EXCEPTION 'invalid cart total'; END IF; subtotal:=subtotal+r.quantity*r.amount_minor;
    item:=item||jsonb_build_array(jsonb_build_object('sku',r.variant_sku,'variantSku',r.variant_sku,'productSku',r.product_sku,'slug',r.slug,'titleEn',NULLIF(r.title_en,''),'titleAr',NULLIF(r.title_ar,''),'titleZh',NULLIF(r.title_zh,''),'productTitleEn',r.product_title_en,'productTitleAr',r.product_title_ar,'productTitleZh',r.product_title_zh,'options',r.option_values,'quantity',r.quantity,'unitAmountMinor',r.amount_minor));
  END LOOP;
  IF actual_count<>requested_count OR subtotal<=0 THEN RAISE EXCEPTION 'unknown sku'; END IF;
  shipping:=CASE WHEN z.free_shipping_threshold_minor IS NOT NULL AND subtotal>=z.free_shipping_threshold_minor THEN 0 ELSE z.shipping_minor END;
  SELECT jsonb_object_agg(x->>'variantSku',true) INTO sku_set FROM jsonb_array_elements(item) x;
  IF normalized_code IS NOT NULL THEN SELECT * INTO promo FROM retail_promotions WHERE lower(code)=lower(normalized_code); IF NOT FOUND THEN RAISE EXCEPTION 'invalid promotion'; END IF; discount:=retail_promotion_discount(promo,subtotal,shipping,sku_set); IF discount=0 AND promo.kind<>'free_shipping' THEN RAISE EXCEPTION 'promotion unavailable'; END IF; promotion_code:=promo.code; promotion_id:=promo.id; END IF;
  tax:=((subtotal+shipping-discount)*z.tax_rate_bps+5000)/10000;
  normalized_shipping:=jsonb_build_object('email',email,'recipient',trim(p_checkout->>'recipient'),'line1',trim(p_checkout->>'line1'),'line2',trim(COALESCE(p_checkout->>'line2','')),'city',trim(p_checkout->>'city'),'region',trim(COALESCE(p_checkout->>'region','')),'postalCode',trim(COALESCE(p_checkout->>'postalCode','')),'country',country_code,'phone',trim(COALESCE(p_checkout->>'phone','')));
  SELECT jsonb_agg(jsonb_build_object('variantSku',COALESCE(x->>'variantSku',x->>'sku'),'quantity',(x->>'quantity')::bigint) ORDER BY COALESCE(x->>'variantSku',x->>'sku')) INTO normalized_items FROM jsonb_array_elements(p_items) x;
  RETURN QUERY SELECT 'USD'::char(3),subtotal,shipping,tax,discount,subtotal+shipping+tax-discount,'standard'::text,item,normalized_shipping,encode(digest(normalized_items::text||normalized_shipping::text||subtotal::text||':'||shipping::text||':'||tax::text||':'||discount::text||':'||COALESCE(promotion_id::text,''),'sha256'),'hex'),promotion_code,promotion_id;
END $$;

CREATE OR REPLACE FUNCTION retail_create_checkout_v3(p_request UUID,p_items JSONB,p_checkout JSONB,p_expected_total BIGINT,p_promo_code TEXT DEFAULT NULL)
RETURNS TABLE(order_id BIGINT,paypal_order_id TEXT,currency CHAR(3),subtotal_minor BIGINT,shipping_minor BIGINT,tax_minor BIGINT,discount_minor BIGINT,amount_minor BIGINT,shipping_method TEXT,items_snapshot JSONB,checkout_shipping JSONB,status TEXT)
LANGUAGE plpgsql AS $$
DECLARE existing retail_orders%ROWTYPE; q RECORD; r RECORD; promo retail_promotions%ROWTYPE; requested JSONB; prior_requested JSONB; actual_count INT:=0; created_order_id BIGINT; normalized_code TEXT:=NULLIF(upper(trim(COALESCE(p_promo_code,''))),''); promo_count BIGINT; customer_count BIGINT; grouped_items JSONB; has_promotion BOOLEAN:=false;
BEGIN
  PERFORM retail_release_expired_reservations();
  SELECT * INTO q FROM retail_quote_checkout_v3(p_items,p_checkout,p_promo_code);
  IF p_expected_total IS NULL OR p_expected_total<>q.total_minor THEN RAISE EXCEPTION 'quote changed'; END IF;
  SELECT jsonb_agg(jsonb_build_object('variantSku',COALESCE(x->>'variantSku',x->>'sku'),'quantity',(x->>'quantity')::bigint) ORDER BY COALESCE(x->>'variantSku',x->>'sku')) INTO requested FROM jsonb_array_elements(p_items) x;
  SELECT * INTO existing FROM retail_orders WHERE client_request_id=p_request FOR UPDATE;
  IF FOUND THEN
    SELECT jsonb_agg(jsonb_build_object('variantSku',COALESCE(x->>'variantSku',x->>'sku'),'quantity',(x->>'quantity')::bigint) ORDER BY COALESCE(x->>'variantSku',x->>'sku')) INTO prior_requested FROM retail_order_lines l WHERE l.order_id=existing.id;
    IF prior_requested IS DISTINCT FROM requested OR existing.checkout_shipping<>q.shipping_snapshot OR existing.checkout_email<>lower(trim(p_checkout->>'email')) OR existing.amount_minor<>q.total_minor THEN RAISE EXCEPTION 'idempotency conflict'; END IF;
    IF existing.status='expired' THEN RAISE EXCEPTION 'checkout_expired'; END IF;
    RETURN QUERY SELECT existing.id,existing.paypal_order_id,existing.currency,existing.subtotal_minor,existing.shipping_minor,existing.tax_minor,existing.discount_minor,existing.amount_minor,existing.shipping_method,existing.items_snapshot,existing.checkout_shipping,existing.status; RETURN;
  END IF;
  IF q.promotion_id IS NOT NULL THEN
    SELECT * INTO promo FROM retail_promotions WHERE id=q.promotion_id FOR UPDATE;
    IF NOT FOUND OR lower(promo.code)<>lower(normalized_code) THEN RAISE EXCEPTION 'quote changed'; END IF;
    has_promotion:=true;
  END IF;
  -- Lock all variant and product stock rows in one deterministic statement.
  FOR r IN SELECT v.id variant_id,v.sku variant_sku,v.product_id,p.sku product_sku,vb.on_hand variant_on_hand,vb.reserved variant_reserved,pb.on_hand product_on_hand,pb.reserved product_reserved,(x->>'quantity')::bigint quantity
    FROM jsonb_array_elements(p_items) x JOIN retail_product_variants v ON v.sku=COALESCE(x->>'variantSku',x->>'sku') JOIN retail_products p ON p.id=v.product_id JOIN retail_variant_inventory_balances vb ON vb.variant_id=v.id JOIN retail_inventory_balances pb ON pb.product_id=p.id ORDER BY v.sku FOR UPDATE OF v,p,vb,pb
  LOOP actual_count:=actual_count+1; IF r.variant_on_hand-r.variant_reserved<r.quantity OR r.product_on_hand-r.product_reserved<r.quantity THEN RAISE EXCEPTION 'unavailable sku'; END IF; END LOOP;
  IF actual_count<>jsonb_array_length(p_items) THEN RAISE EXCEPTION 'unknown sku'; END IF;
  -- Requote after the locks: current price/status/shipping/promotion rules are authoritative.
  SELECT * INTO q FROM retail_quote_checkout_v3(p_items,p_checkout,p_promo_code);
  IF p_expected_total<>q.total_minor THEN RAISE EXCEPTION 'quote changed'; END IF;
  IF has_promotion THEN
    SELECT count(*) INTO promo_count FROM retail_promotion_redemptions redemption WHERE redemption.promotion_id=promo.id AND redemption.status IN ('reserved','committed');
    SELECT count(*) INTO customer_count FROM retail_promotion_redemptions redemption WHERE redemption.promotion_id=promo.id AND redemption.customer_email=lower(trim(p_checkout->>'email')) AND redemption.status IN ('reserved','committed');
    IF (promo.max_redemptions IS NOT NULL AND promo_count>=promo.max_redemptions) OR (promo.max_per_customer IS NOT NULL AND customer_count>=promo.max_per_customer) THEN RAISE EXCEPTION 'promotion exhausted'; END IF;
  END IF;
  SELECT jsonb_agg(jsonb_build_object('sku',product_sku,'quantity',quantity) ORDER BY product_sku) INTO grouped_items FROM (SELECT x->>'productSku' product_sku,sum((x->>'quantity')::bigint) quantity FROM jsonb_array_elements(q.items_snapshot) x GROUP BY x->>'productSku') grouped;
  INSERT INTO retail_orders(client_request_id,currency,subtotal_minor,shipping_minor,tax_minor,discount_minor,amount_minor,shipping_method,items_snapshot,checkout_email,checkout_shipping,terms_version,terms_accepted_at,quote_hash,status)
  VALUES(p_request,'USD',q.subtotal_minor,q.shipping_minor,q.tax_minor,q.discount_minor,q.total_minor,q.shipping_method,grouped_items,lower(trim(p_checkout->>'email')),q.shipping_snapshot,p_checkout->>'termsVersion',now(),q.quote_hash,'pending') RETURNING id INTO created_order_id;
  INSERT INTO retail_order_lines(order_id,product_id,variant_id,product_sku,variant_sku,title_en,title_ar,title_zh,option_values,quantity,unit_amount_minor)
  SELECT created_order_id,v.product_id,v.id,x->>'productSku',x->>'variantSku',COALESCE(x->>'titleEn',x->>'productTitleEn'),COALESCE(x->>'titleAr',x->>'productTitleAr'),COALESCE(x->>'titleZh',x->>'productTitleZh'),COALESCE(x->'options','{}'::jsonb),(x->>'quantity')::bigint,(x->>'unitAmountMinor')::bigint FROM jsonb_array_elements(q.items_snapshot) x JOIN retail_product_variants v ON v.sku=x->>'variantSku';
  FOR r IN SELECT l.variant_id,l.variant_sku,l.product_id,l.product_sku,l.quantity FROM retail_order_lines l WHERE l.order_id=created_order_id ORDER BY l.variant_sku LOOP
    UPDATE retail_variant_inventory_balances SET reserved=reserved+r.quantity,updated_at=now() WHERE variant_id=r.variant_id AND on_hand-reserved>=r.quantity; IF NOT FOUND THEN RAISE EXCEPTION 'inventory changed during checkout'; END IF;
    INSERT INTO retail_variant_inventory_reservations(order_id,request_id,variant_id,quantity,status,expires_at,idempotency_key) VALUES(created_order_id,p_request,r.variant_id,r.quantity,'active',now()+interval '15 minutes',md5('v3:'||p_request::text||':'||r.variant_sku)::uuid);
    INSERT INTO retail_variant_inventory_ledger(variant_id,delta_reserved,reason,idempotency_key) VALUES(r.variant_id,r.quantity,'checkout_reservation',md5('v3-ledger:'||p_request::text||':'||r.variant_sku)::uuid);
  END LOOP;
  FOR r IN SELECT l.product_id,l.product_sku,sum(l.quantity) quantity FROM retail_order_lines l WHERE l.order_id=created_order_id GROUP BY l.product_id,l.product_sku ORDER BY l.product_sku LOOP
    UPDATE retail_inventory_balances SET reserved=reserved+r.quantity,updated_at=now() WHERE product_id=r.product_id AND on_hand-reserved>=r.quantity; IF NOT FOUND THEN RAISE EXCEPTION 'product inventory changed during checkout'; END IF;
    INSERT INTO retail_inventory_reservations(order_id,request_id,product_id,quantity,status,expires_at,idempotency_key) VALUES(created_order_id,p_request,r.product_id,r.quantity,'active',now()+interval '15 minutes',md5('v3-product:'||p_request::text||':'||r.product_sku)::uuid);
    INSERT INTO retail_inventory_ledger(product_id,delta_reserved,reason,idempotency_key) VALUES(r.product_id,r.quantity,'checkout_reservation_v3',md5('v3-product-ledger:'||p_request::text||':'||r.product_sku)::uuid);
  END LOOP;
  IF has_promotion THEN INSERT INTO retail_promotion_redemptions(promotion_id,order_id,request_id,customer_email,discount_minor,status,expires_at) VALUES(promo.id,created_order_id,p_request,lower(trim(p_checkout->>'email')),q.discount_minor,'reserved',now()+interval '15 minutes'); END IF;
  RETURN QUERY SELECT o.id,o.paypal_order_id,o.currency,o.subtotal_minor,o.shipping_minor,o.tax_minor,o.discount_minor,o.amount_minor,o.shipping_method,o.items_snapshot,o.checkout_shipping,o.status FROM retail_orders o WHERE o.id=created_order_id;
END $$;

CREATE OR REPLACE FUNCTION retail_sync_variant_order_lifecycle() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE r RECORD;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF NEW.status='captured' THEN
    FOR r IN SELECT * FROM retail_variant_inventory_reservations WHERE order_id=NEW.id AND status='active' ORDER BY variant_id,id FOR UPDATE LOOP
      UPDATE retail_variant_inventory_balances SET on_hand=on_hand-r.quantity,reserved=reserved-r.quantity,updated_at=now() WHERE variant_id=r.variant_id AND on_hand>=r.quantity AND reserved>=r.quantity;
      IF NOT FOUND THEN RAISE EXCEPTION 'variant inventory state invalid at capture'; END IF;
      UPDATE retail_variant_inventory_reservations SET status='consumed' WHERE id=r.id;
      INSERT INTO retail_variant_inventory_ledger(variant_id,delta_on_hand,delta_reserved,reason,idempotency_key,reference_id) VALUES(r.variant_id,-r.quantity,-r.quantity,'payment_capture',md5('variant-capture:'||COALESCE(NEW.capture_id,NEW.id::text)||':'||r.id::text)::uuid,r.id) ON CONFLICT(idempotency_key) DO NOTHING;
    END LOOP;
    UPDATE retail_promotion_redemptions SET status='committed',committed_at=now() WHERE order_id=NEW.id AND status='reserved';
  ELSIF NEW.status IN ('cancelled','expired','failed','denied') THEN
    FOR r IN SELECT * FROM retail_variant_inventory_reservations WHERE order_id=NEW.id AND status='active' ORDER BY variant_id,id FOR UPDATE LOOP
      UPDATE retail_variant_inventory_balances SET reserved=reserved-r.quantity,updated_at=now() WHERE variant_id=r.variant_id AND reserved>=r.quantity;
      IF NOT FOUND THEN RAISE EXCEPTION 'variant reservation balance invalid'; END IF;
      UPDATE retail_variant_inventory_reservations SET status=CASE WHEN NEW.status='expired' THEN 'expired' ELSE 'released' END WHERE id=r.id;
      INSERT INTO retail_variant_inventory_ledger(variant_id,delta_reserved,reason,idempotency_key,reference_id) VALUES(r.variant_id,-r.quantity,CASE WHEN NEW.status='expired' THEN 'reservation_expired' ELSE 'order_released' END,md5('variant-release:'||NEW.status||':'||NEW.id::text||':'||r.id::text)::uuid,r.id) ON CONFLICT(idempotency_key) DO NOTHING;
    END LOOP;
    UPDATE retail_promotion_redemptions SET status='released',released_at=now() WHERE order_id=NEW.id AND status='reserved';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS retail_variant_order_lifecycle ON retail_orders;
CREATE TRIGGER retail_variant_order_lifecycle AFTER UPDATE OF status ON retail_orders FOR EACH ROW EXECUTE FUNCTION retail_sync_variant_order_lifecycle();
