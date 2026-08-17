-- Replace the earlier source-text patch with an explicit authoritative quote
-- function. This keeps dynamic carrier input server-only and makes the
-- database contract deterministic across PostgreSQL formatting changes.
CREATE OR REPLACE FUNCTION retail_quote_checkout_v3(p_items JSONB,p_checkout JSONB,p_promo_code TEXT DEFAULT NULL)
RETURNS TABLE(currency CHAR(3),subtotal_minor BIGINT,shipping_minor BIGINT,tax_minor BIGINT,discount_minor BIGINT,total_minor BIGINT,shipping_method TEXT,items_snapshot JSONB,shipping_snapshot JSONB,quote_hash TEXT,promotion_code TEXT,promotion_id UUID)
LANGUAGE plpgsql STABLE AS $$
DECLARE
  r RECORD;
  z retail_shipping_zones%ROWTYPE;
  promo retail_promotions%ROWTYPE;
  requested_count INT;
  actual_count INT:=0;
  subtotal BIGINT:=0;
  shipping BIGINT;
  tax BIGINT;
  discount BIGINT:=0;
  item JSONB:='[]'::jsonb;
  normalized_items JSONB;
  normalized_shipping JSONB;
  country_code TEXT;
  email TEXT;
  terms_ok BOOLEAN;
  normalized_code TEXT:=NULLIF(upper(trim(COALESCE(p_promo_code,''))),'');
  sku_set JSONB;
  dynamic_shipping JSONB:=p_checkout->'_serverShipping';
BEGIN
  IF jsonb_typeof(p_items)<>'array' OR jsonb_array_length(p_items)=0 OR jsonb_array_length(p_items)>10 OR jsonb_typeof(p_checkout)<>'object' THEN RAISE EXCEPTION 'invalid checkout'; END IF;
  SELECT count(*) INTO requested_count FROM jsonb_array_elements(p_items);
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_items) x WHERE jsonb_typeof(x)<>'object' OR COALESCE(x->>'variantSku',x->>'sku','')='' OR COALESCE(x->>'quantity','') !~ '^(?:[1-9]|10)$') THEN RAISE EXCEPTION 'invalid cart'; END IF;
  IF EXISTS(SELECT sku FROM (SELECT COALESCE(x->>'variantSku',x->>'sku') sku FROM jsonb_array_elements(p_items) x) d GROUP BY sku HAVING count(*)>1) THEN RAISE EXCEPTION 'duplicate sku'; END IF;
  email:=lower(trim(COALESCE(p_checkout->>'email','')));
  country_code:=upper(trim(COALESCE(p_checkout->>'country','')));
  terms_ok:=COALESCE((p_checkout->>'termsAccepted')::boolean,false) AND length(COALESCE(p_checkout->>'termsVersion','')) BETWEEN 1 AND 50;
  IF email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' OR country_code !~ '^[A-Z]{2}$' OR NOT terms_ok OR length(trim(COALESCE(p_checkout->>'recipient','')))=0 OR length(trim(COALESCE(p_checkout->>'line1','')))=0 OR length(trim(COALESCE(p_checkout->>'city','')))=0 THEN RAISE EXCEPTION 'invalid checkout'; END IF;

  IF dynamic_shipping IS NOT NULL THEN
    IF jsonb_typeof(dynamic_shipping)<>'object'
      OR COALESCE(dynamic_shipping->>'carrier','')<>'YunExpress'
      OR COALESCE(dynamic_shipping->>'rateSource','')<>'provider_api'
      OR COALESCE(dynamic_shipping->>'serviceCode','')=''
      OR COALESCE(dynamic_shipping->>'dutiesMode','') NOT IN ('DAP','DDP')
      OR COALESCE(dynamic_shipping->>'amountMinor','') !~ '^[0-9]+$'
      OR (dynamic_shipping->>'amountMinor')::numeric>900000000000000
      OR COALESCE(dynamic_shipping->>'taxRateBps','') !~ '^[0-9]+$'
      OR (dynamic_shipping->>'taxRateBps')::int NOT BETWEEN 0 AND 10000
      OR COALESCE(dynamic_shipping->>'expiresAt','') !~ '^20[0-9]{2}-'
      OR (dynamic_shipping->>'expiresAt')::timestamptz<=now() THEN
      RAISE EXCEPTION 'invalid shipping quote';
    END IF;
    SELECT * INTO z FROM retail_shipping_zones WHERE country=country_code AND active;
    IF NOT FOUND THEN SELECT * INTO z FROM retail_shipping_zones WHERE active ORDER BY country LIMIT 1; END IF;
    IF NOT FOUND THEN RAISE EXCEPTION 'shipping configuration unavailable'; END IF;
    z.shipping_minor:=(dynamic_shipping->>'amountMinor')::bigint;
    z.free_shipping_threshold_minor:=NULL;
    IF trim(z.country)<>country_code THEN z.tax_rate_bps:=(dynamic_shipping->>'taxRateBps')::int; END IF;
  ELSE
    SELECT * INTO z FROM retail_shipping_zones WHERE country=country_code AND active;
    IF NOT FOUND THEN RAISE EXCEPTION 'unsupported shipping country'; END IF;
  END IF;

  FOR r IN SELECT v.id,v.sku variant_sku,p.sku product_sku,p.slug,p.title_en product_title_en,p.title_ar product_title_ar,COALESCE(p.title_zh,p.title_en) product_title_zh,v.title_en,v.title_ar,v.title_zh,v.option_values,vb.on_hand variant_on_hand,vb.reserved variant_reserved,pb.on_hand product_on_hand,pb.reserved product_reserved,h.amount_minor,(x->>'quantity')::bigint quantity
    FROM jsonb_array_elements(p_items) x JOIN retail_product_variants v ON v.sku=COALESCE(x->>'variantSku',x->>'sku') AND v.status='active' JOIN retail_products p ON p.id=v.product_id AND p.status='published' JOIN retail_variant_inventory_balances vb ON vb.variant_id=v.id JOIN retail_inventory_balances pb ON pb.product_id=p.id JOIN LATERAL(SELECT amount_minor FROM retail_variant_price_history WHERE variant_id=v.id AND active ORDER BY created_at DESC LIMIT 1) h ON true ORDER BY v.sku
  LOOP
    actual_count:=actual_count+1;
    IF r.variant_on_hand-r.variant_reserved<r.quantity OR r.product_on_hand-r.product_reserved<r.quantity THEN RAISE EXCEPTION 'unavailable sku'; END IF;
    IF r.quantity*r.amount_minor>900000000000000-subtotal THEN RAISE EXCEPTION 'invalid cart total'; END IF;
    subtotal:=subtotal+r.quantity*r.amount_minor;
    item:=item||jsonb_build_array(jsonb_build_object('sku',r.variant_sku,'variantSku',r.variant_sku,'productSku',r.product_sku,'slug',r.slug,'titleEn',NULLIF(r.title_en,''),'titleAr',NULLIF(r.title_ar,''),'titleZh',NULLIF(r.title_zh,''),'productTitleEn',r.product_title_en,'productTitleAr',r.product_title_ar,'productTitleZh',r.product_title_zh,'options',r.option_values,'quantity',r.quantity,'unitAmountMinor',r.amount_minor));
  END LOOP;
  IF actual_count<>requested_count OR subtotal<=0 THEN RAISE EXCEPTION 'unknown sku'; END IF;
  shipping:=CASE WHEN z.free_shipping_threshold_minor IS NOT NULL AND subtotal>=z.free_shipping_threshold_minor THEN 0 ELSE z.shipping_minor END;
  SELECT jsonb_object_agg(x->>'variantSku',true) INTO sku_set FROM jsonb_array_elements(item) x;
  IF normalized_code IS NOT NULL THEN
    SELECT * INTO promo FROM retail_promotions WHERE lower(code)=lower(normalized_code);
    IF NOT FOUND THEN RAISE EXCEPTION 'invalid promotion'; END IF;
    discount:=retail_promotion_discount(promo,subtotal,shipping,sku_set);
    IF discount=0 AND promo.kind<>'free_shipping' THEN RAISE EXCEPTION 'promotion unavailable'; END IF;
    promotion_code:=promo.code;
    promotion_id:=promo.id;
  END IF;
  tax:=((subtotal+shipping-discount)*z.tax_rate_bps+5000)/10000;
  normalized_shipping:=jsonb_build_object('email',email,'recipient',trim(p_checkout->>'recipient'),'line1',trim(p_checkout->>'line1'),'line2',trim(COALESCE(p_checkout->>'line2','')),'city',trim(p_checkout->>'city'),'region',trim(COALESCE(p_checkout->>'region','')),'postalCode',trim(COALESCE(p_checkout->>'postalCode','')),'country',country_code,'phone',trim(COALESCE(p_checkout->>'phone','')));
  IF dynamic_shipping IS NOT NULL THEN normalized_shipping:=normalized_shipping||jsonb_build_object('delivery',dynamic_shipping-'amountMinor'-'taxRateBps'-'fx'); END IF;
  SELECT jsonb_agg(jsonb_build_object('variantSku',COALESCE(x->>'variantSku',x->>'sku'),'quantity',(x->>'quantity')::bigint) ORDER BY COALESCE(x->>'variantSku',x->>'sku')) INTO normalized_items FROM jsonb_array_elements(p_items) x;
  RETURN QUERY SELECT 'USD'::char(3),subtotal,shipping,tax,discount,subtotal+shipping+tax-discount,
    CASE WHEN dynamic_shipping IS NULL THEN 'standard' ELSE 'yunexpress:'||(dynamic_shipping->>'serviceCode') END,
    item,normalized_shipping,encode(digest(normalized_items::text||normalized_shipping::text||subtotal::text||':'||shipping::text||':'||tax::text||':'||discount::text||':'||COALESCE(promotion_id::text,''),'sha256'),'hex'),promotion_code,promotion_id;
END $$;

DO $$
DECLARE definition TEXT;
BEGIN
  SELECT pg_get_functiondef('retail_quote_checkout_v3(jsonb,jsonb,text)'::regprocedure) INTO definition;
  IF definition IS NULL OR position('dynamic_shipping jsonb' IN lower(definition))=0 OR position('yunexpress:' IN lower(definition))=0 THEN
    RAISE EXCEPTION 'explicit dynamic shipping quote contract is unavailable';
  END IF;
END $$;
