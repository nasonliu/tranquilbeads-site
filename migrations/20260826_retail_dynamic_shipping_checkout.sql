-- Server-verified carrier quotes are injected only after the public DTO has
-- been parsed. The database still validates their shape and expiry before the
-- amount can enter the authoritative quote hash or an order reservation.
DO $$
DECLARE definition TEXT;
BEGIN
  SELECT pg_get_functiondef('retail_quote_checkout_v3(jsonb,jsonb,text)'::regprocedure) INTO definition;
  IF definition IS NULL
     OR position('SELECT * INTO z FROM retail_shipping_zones WHERE country=country_code AND active;' IN definition)=0
     OR position('shipping:=CASE WHEN z.free_shipping_threshold_minor IS NOT NULL' IN definition)=0
     OR position('allocation JSONB' IN definition)=0 THEN
    RAISE EXCEPTION 'retail_quote_checkout_v3 dynamic shipping source mismatch';
  END IF;

  definition:=replace(definition,
    'sku_set JSONB;',
    'sku_set JSONB; dynamic_shipping JSONB:=p_checkout->''_serverShipping'';');

  definition:=replace(definition,
    'SELECT * INTO z FROM retail_shipping_zones WHERE country=country_code AND active; IF NOT FOUND THEN RAISE EXCEPTION ''unsupported shipping country''; END IF;',
    'IF dynamic_shipping IS NOT NULL THEN
      IF jsonb_typeof(dynamic_shipping)<>''object''
        OR COALESCE(dynamic_shipping->>''carrier'','''')<>''YunExpress''
        OR COALESCE(dynamic_shipping->>''rateSource'','''')<>''provider_api''
        OR COALESCE(dynamic_shipping->>''serviceCode'','''')=''''
        OR COALESCE(dynamic_shipping->>''dutiesMode'','''') NOT IN (''DAP'',''DDP'')
        OR COALESCE(dynamic_shipping->>''amountMinor'','''') !~ ''^[0-9]+$''
        OR (dynamic_shipping->>''amountMinor'')::numeric>900000000000000
        OR COALESCE(dynamic_shipping->>''taxRateBps'','''') !~ ''^[0-9]+$''
        OR (dynamic_shipping->>''taxRateBps'')::int NOT BETWEEN 0 AND 10000
        OR COALESCE(dynamic_shipping->>''expiresAt'','''') !~ ''^20[0-9]{2}-''
        OR (dynamic_shipping->>''expiresAt'')::timestamptz<=now() THEN
        RAISE EXCEPTION ''invalid shipping quote'';
      END IF;
      SELECT * INTO z FROM retail_shipping_zones WHERE country=country_code AND active;
      IF NOT FOUND THEN SELECT * INTO z FROM retail_shipping_zones WHERE active ORDER BY country LIMIT 1; END IF;
      IF NOT FOUND THEN RAISE EXCEPTION ''shipping configuration unavailable''; END IF;
      z.shipping_minor:=(dynamic_shipping->>''amountMinor'')::bigint;
      z.free_shipping_threshold_minor:=NULL;
      IF trim(z.country)<>country_code THEN z.tax_rate_bps:=(dynamic_shipping->>''taxRateBps'')::int; END IF;
    ELSE
      SELECT * INTO z FROM retail_shipping_zones WHERE country=country_code AND active;
      IF NOT FOUND THEN RAISE EXCEPTION ''unsupported shipping country''; END IF;
    END IF;');

  definition:=replace(definition,
    'SELECT jsonb_agg(jsonb_build_object(''variantSku'',COALESCE(x->>''variantSku'',x->>''sku''),''quantity'',(x->>''quantity'')::bigint) ORDER BY COALESCE(x->>''variantSku'',x->>''sku'')) INTO normalized_items FROM jsonb_array_elements(p_items) x;',
    'IF dynamic_shipping IS NOT NULL THEN normalized_shipping:=normalized_shipping||jsonb_build_object(''delivery'',dynamic_shipping-''amountMinor''-''taxRateBps''-''fx''); END IF;
  SELECT jsonb_agg(jsonb_build_object(''variantSku'',COALESCE(x->>''variantSku'',x->>''sku''),''quantity'',(x->>''quantity'')::bigint) ORDER BY COALESCE(x->>''variantSku'',x->>''sku'')) INTO normalized_items FROM jsonb_array_elements(p_items) x;');

  definition:=replace(definition,
    '''standard''::text,item,normalized_shipping',
    'CASE WHEN dynamic_shipping IS NULL THEN ''standard'' ELSE ''yunexpress:''||dynamic_shipping->>''serviceCode'' END,item,normalized_shipping');

  IF position('invalid shipping quote' IN definition)=0
     OR position('dynamic_shipping-''amountMinor''-''taxRateBps''-''fx''' IN definition)=0
     OR position('yunexpress:' IN definition)=0 THEN
    RAISE EXCEPTION 'retail_quote_checkout_v3 dynamic shipping patch did not apply';
  END IF;
  EXECUTE definition;
END $$;

DO $$
BEGIN
  IF to_regprocedure('retail_quote_checkout_v3(jsonb,jsonb,text)') IS NULL
     OR to_regprocedure('retail_create_checkout_v3(uuid,jsonb,jsonb,bigint,text)') IS NULL THEN
    RAISE EXCEPTION 'dynamic shipping checkout contracts are unavailable';
  END IF;
END $$;
