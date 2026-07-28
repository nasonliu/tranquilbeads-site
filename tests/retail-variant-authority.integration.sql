\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE product_public UUID; v_product_id UUID; default_variant UUID; quote RECORD; observed BIGINT;
BEGIN
  SELECT public_id INTO product_public FROM retail_create_admin_product_variant_authority_as_actor(
    'VA-DEFAULT','va-default','Variant authority','سلطة المتغير','变体权威',
    '','','','draft',125,7,'a4e00000-0000-4000-8000-000000000001',
    'owner-a','Owner A','owner',false
  );
  SELECT id INTO v_product_id FROM retail_products WHERE public_id=product_public;
  SELECT id INTO default_variant FROM retail_product_variants
    WHERE product_id=v_product_id AND sku='VA-DEFAULT' AND option_values='{}'::jsonb;
  IF default_variant IS NULL THEN RAISE EXCEPTION 'product creation did not atomically create the default variant'; END IF;
  SELECT on_hand INTO observed FROM retail_variant_inventory_balances WHERE variant_id=default_variant;
  IF observed<>7 THEN RAISE EXCEPTION 'default variant stock missing: %',observed; END IF;
  SELECT on_hand INTO observed FROM retail_inventory_balances WHERE product_id=v_product_id;
  IF observed<>7 THEN RAISE EXCEPTION 'product inventory mirror missing: %',observed; END IF;
  SELECT amount_minor INTO observed FROM retail_variant_price_history WHERE variant_id=default_variant AND active;
  IF observed<>125 THEN RAISE EXCEPTION 'default variant price missing: %',observed; END IF;

  INSERT INTO retail_product_images(product_id,blob_url,blob_key,mime_type,bytes,sha256,position)
    VALUES(v_product_id,'https://example.test/va-default.jpg','va-default.jpg','image/jpeg',1,'authority',0);
  PERFORM * FROM retail_update_admin_product_as_actor(product_public,NULL,NULL,NULL,NULL,NULL,NULL,NULL,false,false,'published',
    'a4e00000-0000-4000-8000-000000000002','owner-a','Owner A','owner',false);
  INSERT INTO retail_shipping_zones(country,name_en,name_ar,name_zh,shipping_minor,tax_rate_bps,active)
    VALUES('VA','Variant Authority','سلطة المتغير','变体权威区',25,0,true);

  SELECT * INTO quote FROM retail_quote_checkout_v3(
    '[{"variantSku":"VA-DEFAULT","quantity":2}]',
    '{"email":"authority@example.test","recipient":"Authority","line1":"1 Variant Way","city":"Test","country":"VA","termsAccepted":true,"termsVersion":"v3"}'
  );
  IF quote.subtotal_minor<>250 OR quote.total_minor<>275 THEN
    RAISE EXCEPTION 'new admin product cannot quote through V3: %',row_to_json(quote);
  END IF;

  IF NOT retail_change_product_price_as_actor(product_public,140,'a4e00000-0000-4000-8000-000000000003','price test','owner-a','Owner A','owner',false) THEN
    RAISE EXCEPTION 'default variant price change did not apply';
  END IF;
  SELECT amount_minor INTO observed FROM retail_variant_price_history WHERE variant_id=default_variant AND active;
  IF observed<>140 THEN RAISE EXCEPTION 'legacy price endpoint did not map to default variant: %',observed; END IF;
  -- Catalog variant edits call this helper directly; it must safely update the
  -- legacy read mirror only for the default variant.
  PERFORM retail_sync_product_default_variant_price(default_variant,'catalog test');
  SELECT amount_minor INTO observed FROM retail_price_history WHERE product_id=v_product_id AND active;
  IF observed<>140 THEN RAISE EXCEPTION 'catalog price helper did not maintain the product mirror: %',observed; END IF;
  SELECT * INTO quote FROM retail_quote_checkout_v3(
    '[{"variantSku":"VA-DEFAULT","quantity":2}]',
    '{"email":"authority@example.test","recipient":"Authority","line1":"1 Variant Way","city":"Test","country":"VA","termsAccepted":true,"termsVersion":"v3"}'
  );
  IF quote.subtotal_minor<>280 OR quote.total_minor<>305 THEN RAISE EXCEPTION 'V3 quote did not use authoritative variant price: %',row_to_json(quote); END IF;

  IF NOT retail_adjust_inventory_as_actor(product_public,3,'stock test','a4e00000-0000-4000-8000-000000000004','owner-a','Owner A','owner',false) THEN
    RAISE EXCEPTION 'default variant stock adjustment did not apply';
  END IF;
  SELECT on_hand INTO observed FROM retail_variant_inventory_balances WHERE variant_id=default_variant;
  IF observed<>10 THEN RAISE EXCEPTION 'default variant stock was not adjusted: %',observed; END IF;
  SELECT on_hand INTO observed FROM retail_inventory_balances WHERE product_id=v_product_id;
  IF observed<>10 THEN RAISE EXCEPTION 'product inventory mirror did not follow variant: %',observed; END IF;
END $$;

ROLLBACK;
