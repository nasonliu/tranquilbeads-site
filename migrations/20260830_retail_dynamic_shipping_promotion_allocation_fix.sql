-- The authoritative dynamic-shipping quote introduced in 20260828 replaced
-- the quote function after the 20260813 line-allocation migration had run.
-- Restore that allocation and the active-style sellability guard on top of
-- the dynamic-shipping implementation. A scoped promotion must never discount
-- unrelated lines (or ordinary shipping), and an archived SKC must not quote.
DO $$
DECLARE
  definition TEXT;
BEGIN
  SELECT pg_get_functiondef('retail_quote_checkout_v3(jsonb,jsonb,text)'::regprocedure) INTO definition;
  IF definition IS NULL
     OR position('dynamic_shipping JSONB' IN definition)=0
     OR position('discount:=retail_promotion_discount(promo,subtotal,shipping,sku_set);' IN definition)=0
     OR position('JOIN retail_product_variants v ON v.sku=COALESCE(x->>''variantSku'',x->>''sku'') AND v.status=''active'' JOIN retail_products p' IN definition)=0 THEN
    RAISE EXCEPTION 'dynamic shipping promotion allocation source mismatch';
  END IF;

  definition:=replace(
    definition,
    'sku_set JSONB;',
    'sku_set JSONB; allocation JSONB:=''{}''::jsonb;'
  );
  definition:=replace(
    definition,
    'discount:=retail_promotion_discount(promo,subtotal,shipping,sku_set);',
    'allocation:=retail_promotion_line_allocation(promo,shipping,item); discount:=COALESCE((allocation->>''discountMinor'')::bigint,0);'
  );
  definition:=replace(
    definition,
    '  tax:=((subtotal+shipping-discount)*z.tax_rate_bps+5000)/10000;',
    E'  item:=(SELECT jsonb_agg(x || jsonb_build_object(''discountMinor'',COALESCE((allocation->''lineDiscounts''->>(x->>''variantSku''))::bigint,0)) ORDER BY x->>''variantSku'') FROM jsonb_array_elements(item) x);\n  tax:=((subtotal+shipping-discount)*z.tax_rate_bps+5000)/10000;'
  );
  definition:=replace(
    definition,
    'JOIN retail_product_variants v ON v.sku=COALESCE(x->>''variantSku'',x->>''sku'') AND v.status=''active'' JOIN retail_products p',
    'JOIN retail_product_variants v ON v.sku=COALESCE(x->>''variantSku'',x->>''sku'') AND v.status=''active'' JOIN retail_product_styles style ON style.id=v.style_id AND style.status=''active'' JOIN retail_products p'
  );

  IF position('allocation JSONB' IN definition)=0
     OR position('retail_promotion_line_allocation' IN definition)=0
     OR position('discountMinor' IN definition)=0
     OR position('style.status=''active''' IN definition)=0
     OR position('dynamic_shipping JSONB' IN definition)=0 THEN
    RAISE EXCEPTION 'dynamic shipping promotion allocation patch did not apply';
  END IF;
  EXECUTE definition;
END $$;

DO $$
DECLARE definition TEXT;
BEGIN
  SELECT pg_get_functiondef('retail_quote_checkout_v3(jsonb,jsonb,text)'::regprocedure) INTO definition;
  IF definition IS NULL
     OR position('retail_promotion_line_allocation' IN definition)=0
     OR position('discountMinor' IN definition)=0
     OR position('style.status=''active''' IN definition)=0
     OR position('dynamic_shipping JSONB' IN definition)=0
     OR position('''yunexpress:''||(dynamic_shipping->>''serviceCode'')' IN definition)=0 THEN
    RAISE EXCEPTION 'dynamic shipping promotion allocation contract is unavailable';
  END IF;
END $$;
