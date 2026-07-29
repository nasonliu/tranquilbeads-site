\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  first_public UUID;
  second_public UUID;
  first_product UUID;
  second_product UUID;
  first_style UUID;
  second_style UUID;
  first_image UUID;
  default_variant UUID;
  second_variant UUID;
  amount BIGINT;
  observed_on_hand BIGINT;
  rejected BOOLEAN;
BEGIN
  SELECT public_id INTO first_public FROM retail_create_admin_product_variant_authority_as_actor(
    'STYLE-SPU-A','style-spu-a','Style product A','منتج النمط أ','款式商品甲',
    '','','','draft',1200,5,'b8e00000-0000-4000-8000-000000000001',
    'owner-style','Style Owner','owner',false
  );
  SELECT public_id INTO second_public FROM retail_create_admin_product_variant_authority_as_actor(
    'STYLE-SPU-B','style-spu-b','Style product B','منتج النمط ب','款式商品乙',
    '','','','draft',1300,4,'b8e00000-0000-4000-8000-000000000002',
    'owner-style','Style Owner','owner',false
  );
  SELECT id INTO first_product FROM retail_products WHERE public_id=first_public;
  SELECT id INTO second_product FROM retail_products WHERE public_id=second_public;

  SELECT style.id INTO first_style
  FROM retail_product_styles style
  JOIN retail_product_variants variant ON variant.style_id=style.id
  WHERE style.product_id=first_product AND variant.sku='STYLE-SPU-A';
  IF first_style IS NULL THEN RAISE EXCEPTION 'new product did not receive a default SKC'; END IF;
  SELECT id INTO default_variant FROM retail_product_variants WHERE product_id=first_product AND sku='STYLE-SPU-A';
  INSERT INTO retail_product_variants(product_id,sku,title_en,title_ar,title_zh,option_values,status)
  VALUES(first_product,'STYLE-SPU-A-LEGACY','Legacy size','حجم قديم','旧尺寸','{"size":"42"}','active');
  IF (SELECT style_id FROM retail_product_variants WHERE sku='STYLE-SPU-A-LEGACY')<>first_style THEN RAISE EXCEPTION 'omitted style did not use the default SKC'; END IF;
  rejected:=false;
  BEGIN
    UPDATE retail_product_styles SET code='STYLE-SPU-A-RENAMED' WHERE id=first_style;
  EXCEPTION WHEN others THEN rejected:=true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'default SKC code was mutable'; END IF;
  rejected:=false;
  BEGIN
    UPDATE retail_product_variants SET style_id=gen_random_uuid() WHERE id=default_variant;
  EXCEPTION WHEN others THEN rejected:=true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'default SKU style assignment was mutable'; END IF;
  rejected:=false;
  BEGIN
    UPDATE retail_product_variants SET option_values='{"size":"99"}' WHERE id=default_variant;
  EXCEPTION WHEN others THEN rejected:=true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'default SKU options were mutable'; END IF;

  INSERT INTO retail_product_images(product_id,blob_url,blob_key,mime_type,bytes,sha256,position)
  VALUES(first_product,'https://example.test/style-a.jpg','style-a.jpg','image/jpeg',1,'style-a',0)
  RETURNING id INTO first_image;

  INSERT INTO retail_product_styles(product_id,code,title_en,title_ar,title_zh,option_values,primary_image_id,position)
  VALUES(first_product,'STYLE-RED','Red','أحمر','红色',
    '{"en":{"Color":"Red"},"ar":{"اللون":"أحمر"},"zh":{"颜色":"红色"}}',first_image,1)
  RETURNING id INTO second_style;

  INSERT INTO retail_product_variants(product_id,style_id,sku,title_en,title_ar,title_zh,option_values,status)
  VALUES(first_product,second_style,'STYLE-RED-33','Red 33','أحمر 33','红色 33','{}','active')
  RETURNING id INTO second_variant;
  INSERT INTO retail_variant_price_history(variant_id,amount_minor,idempotency_key,changed_by)
  VALUES(second_variant,1300,'b8e00000-0000-4000-8000-000000000003','owner-style');
  INSERT INTO retail_variant_inventory_balances(variant_id,on_hand,reserved) VALUES(second_variant,4,0);
  IF second_variant IS NULL THEN RAISE EXCEPTION 'second SKC could not own a sellable SKU'; END IF;

  -- The same SKU option tuple may exist in two different SKCs.
  IF (SELECT count(*) FROM retail_product_variants WHERE product_id=first_product AND option_values='{}') <> 2 THEN
    RAISE EXCEPTION 'variant uniqueness is not scoped to SKC';
  END IF;
  IF (SELECT option_values->'zh'->>'颜色' FROM retail_product_styles WHERE id=second_style) <> '红色' THEN
    RAISE EXCEPTION 'localized SKC option values were not persisted';
  END IF;
  IF (SELECT primary_image_id FROM retail_product_styles WHERE id=second_style) <> first_image THEN
    RAISE EXCEPTION 'SKC primary image was not persisted';
  END IF;

  rejected:=false;
  BEGIN
    UPDATE retail_product_variants SET style_id=second_style WHERE product_id=second_product;
  EXCEPTION WHEN others THEN rejected:=true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'cross-product SKC assignment was accepted'; END IF;

  rejected:=false;
  BEGIN
    INSERT INTO retail_product_styles(product_id,code,title_en,title_ar,title_zh,primary_image_id)
    VALUES(second_product,'STYLE-WRONG-IMAGE','Wrong','خطأ','错误',first_image);
  EXCEPTION WHEN others THEN rejected:=true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'cross-product SKC image was accepted'; END IF;

  -- A style is part of sellability, not presentation only: archiving it must
  -- reject both quote and checkout before any order rows are created.
  UPDATE retail_products SET status='published' WHERE id=first_product;
  INSERT INTO retail_shipping_zones(country,name_en,name_ar,name_zh,shipping_minor,tax_rate_bps,active)
  VALUES('ST','Style Test','اختبار النمط','款式测试',0,0,true);
  UPDATE retail_product_styles SET status='archived' WHERE id=second_style;
  rejected:=false;
  BEGIN
    PERFORM * FROM retail_quote_checkout_v3(
      '[{"variantSku":"STYLE-RED-33","quantity":1}]',
      '{"email":"style@example.test","recipient":"Style","line1":"1 Style Way","city":"Test","country":"ST","termsAccepted":true,"termsVersion":"v3"}'
    );
  EXCEPTION WHEN others THEN rejected:=true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'archived SKC remained quotable'; END IF;
  rejected:=false;
  BEGIN
    PERFORM * FROM retail_create_checkout_v3(
      'b8e00000-0000-4000-8000-000000000004',
      '[{"variantSku":"STYLE-RED-33","quantity":1}]',
      '{"email":"style@example.test","recipient":"Style","line1":"1 Style Way","city":"Test","country":"ST","termsAccepted":true,"termsVersion":"v3","locale":"zh"}',
      1300
    );
  EXCEPTION WHEN others THEN rejected:=true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'archived SKC remained checkoutable'; END IF;
  IF EXISTS(SELECT 1 FROM retail_orders WHERE client_request_id='b8e00000-0000-4000-8000-000000000004') THEN RAISE EXCEPTION 'archived SKC created an order'; END IF;

  -- Both SKCs deliberately use {}.  Legacy product price/inventory commands
  -- must deterministically select the SKU under the SKU-named default SKC.
  SELECT id INTO default_variant FROM retail_product_variants
  WHERE product_id=first_product AND style_id=retail_default_product_style_id(first_product) AND option_values='{}'::jsonb;
  IF default_variant IS NULL OR default_variant=second_variant THEN RAISE EXCEPTION 'default SKC selection is not deterministic'; END IF;
  PERFORM retail_change_product_price_as_actor(first_public,1500,'b8e00000-0000-4000-8000-000000000005','default style only','owner-style','Style Owner','owner',false);
  SELECT amount_minor INTO amount FROM retail_variant_price_history WHERE variant_id=default_variant AND active;
  IF amount<>1500 THEN RAISE EXCEPTION 'legacy price did not change default SKU'; END IF;
  SELECT amount_minor INTO amount FROM retail_variant_price_history WHERE variant_id=second_variant AND active;
  IF amount<>1300 THEN RAISE EXCEPTION 'legacy price changed non-default SKC SKU'; END IF;
  PERFORM retail_adjust_inventory_as_actor(first_public,2,'default style only','b8e00000-0000-4000-8000-000000000006','owner-style','Style Owner','owner',false);
  SELECT balance.on_hand INTO observed_on_hand FROM retail_variant_inventory_balances balance WHERE variant_id=default_variant;
  IF observed_on_hand<>7 THEN RAISE EXCEPTION 'legacy inventory did not change default SKU'; END IF;
  SELECT balance.on_hand INTO observed_on_hand FROM retail_variant_inventory_balances balance WHERE variant_id=second_variant;
  IF observed_on_hand<>4 THEN RAISE EXCEPTION 'legacy inventory changed non-default SKC SKU'; END IF;
END $$;

ROLLBACK;
