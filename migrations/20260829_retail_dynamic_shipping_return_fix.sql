-- PostgreSQL overloads || for both text and jsonb. Parenthesize the jsonb
-- extraction so the shipping method is always assembled as text.
DO $$
DECLARE definition TEXT; corrected TEXT;
BEGIN
  SELECT pg_get_functiondef('retail_quote_checkout_v3(jsonb,jsonb,text)'::regprocedure) INTO definition;
  IF definition IS NULL THEN RAISE EXCEPTION 'dynamic shipping quote function is unavailable'; END IF;
  corrected:=replace(
    definition,
    '''yunexpress:''||dynamic_shipping->>''serviceCode''',
    '''yunexpress:''||(dynamic_shipping->>''serviceCode'')'
  );
  IF corrected=definition THEN RAISE EXCEPTION 'dynamic shipping return expression did not match'; END IF;
  EXECUTE corrected;
END $$;

DO $$
DECLARE definition TEXT;
BEGIN
  SELECT pg_get_functiondef('retail_quote_checkout_v3(jsonb,jsonb,text)'::regprocedure) INTO definition;
  IF definition IS NULL OR position('''yunexpress:''||(dynamic_shipping->>''serviceCode'')' IN definition)=0 THEN
    RAISE EXCEPTION 'dynamic shipping return expression is unavailable';
  END IF;
END $$;
