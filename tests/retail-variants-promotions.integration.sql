\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  product_uuid UUID;
  variant_one UUID;
  variant_two UUID;
  quote RECORD;
  created RECORD;
  cancelled RECORD;
  captured RECORD;
  held BIGINT;
  observed TEXT;
BEGIN
  INSERT INTO retail_products(sku,slug,title_en,title_ar,title_zh,description_en,description_ar,description_zh,status)
    VALUES('VP-BASE','vp-base','Base','أساس','基础','','','','published') RETURNING id INTO product_uuid;
  INSERT INTO retail_inventory_balances(product_id,on_hand,reserved) VALUES(product_uuid,10,0);
  INSERT INTO retail_product_variants(product_id,sku,title_en,title_ar,title_zh,option_values)
    VALUES(product_uuid,'VP-RED','Red','أحمر','红色','{"colour":"red"}') RETURNING id INTO variant_one;
  INSERT INTO retail_product_variants(product_id,sku,title_en,title_ar,title_zh,option_values)
    VALUES(product_uuid,'VP-BLUE','Blue','أزرق','蓝色','{"colour":"blue"}') RETURNING id INTO variant_two;
  INSERT INTO retail_variant_inventory_balances(variant_id,on_hand,reserved) VALUES(variant_one,5,0),(variant_two,5,0);
  INSERT INTO retail_variant_price_history(variant_id,amount_minor,active,idempotency_key,changed_by)
    VALUES(variant_one,100,true,'30000000-0000-4000-8000-000000000001','test'),(variant_two,120,true,'30000000-0000-4000-8000-000000000002','test');
  INSERT INTO retail_shipping_zones(country,name_en,name_ar,name_zh,shipping_minor,tax_rate_bps,active)
    VALUES('VP','Variant place','مكان المتغير','变体测试区',50,0,true);
  INSERT INTO retail_promotions(code,kind,amount,minimum_subtotal_minor,scope,max_redemptions,max_per_customer)
    VALUES('TENOFF','percent',1000,100,'{"all":true}',2,1);

  SELECT * INTO quote FROM retail_quote_checkout_v3(
    '[{"variantSku":"VP-RED","quantity":2}]',
    '{"email":"buyer@example.test","recipient":"Buyer","line1":"One Test Road","city":"Test","country":"VP","termsAccepted":true,"termsVersion":"v3"}',
    'tenoff'
  );
  IF quote.subtotal_minor<>200 OR quote.shipping_minor<>50 OR quote.discount_minor<>20 OR quote.total_minor<>230 THEN
    RAISE EXCEPTION 'V3 quote did not calculate promotion safely: %',row_to_json(quote);
  END IF;
  SELECT * INTO created FROM retail_create_checkout_v3(
    '30000000-0000-4000-8000-000000000010',
    '[{"variantSku":"VP-RED","quantity":2}]',
    '{"email":"buyer@example.test","recipient":"Buyer","line1":"One Test Road","city":"Test","country":"VP","termsAccepted":true,"termsVersion":"v3"}',
    230,'TENOFF'
  );
  IF created.order_id IS NULL OR created.amount_minor<>230 THEN RAISE EXCEPTION 'V3 checkout did not create order'; END IF;
  SELECT reserved INTO held FROM retail_variant_inventory_balances WHERE variant_id=variant_one;
  IF held<>2 THEN RAISE EXCEPTION 'variant hold mismatch: %',held; END IF;
  SELECT b.reserved INTO held FROM retail_inventory_balances b WHERE b.product_id=product_uuid;
  IF held<>2 THEN RAISE EXCEPTION 'product compatibility hold mismatch: %',held; END IF;
  SELECT status INTO observed FROM retail_promotion_redemptions WHERE order_id=created.order_id;
  IF observed<>'reserved' THEN RAISE EXCEPTION 'promotion was not reserved'; END IF;

  -- A concurrent price change makes the old client total unusable; the server
  -- recalculates under locks and rejects it rather than accepting a stale quote.
  UPDATE retail_variant_price_history SET active=false WHERE variant_id=variant_two AND active;
  INSERT INTO retail_variant_price_history(variant_id,amount_minor,active,idempotency_key,changed_by)
    VALUES(variant_two,140,true,'30000000-0000-4000-8000-000000000003','test');
  BEGIN
    PERFORM * FROM retail_create_checkout_v3(
      '30000000-0000-4000-8000-000000000011',
      '[{"variantSku":"VP-BLUE","quantity":1}]',
      '{"email":"other@example.test","recipient":"Other","line1":"Two Test Road","city":"Test","country":"VP","termsAccepted":true,"termsVersion":"v3"}',
      170,NULL
    );
    RAISE EXCEPTION 'stale price quote unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%quote changed%' THEN RAISE; END IF;
  END;

  -- Cancellation releases both inventory representations and the promotion.
  SELECT * INTO cancelled FROM retail_create_checkout_v3(
    '30000000-0000-4000-8000-000000000012',
    '[{"variantSku":"VP-BLUE","quantity":1}]',
    '{"email":"cancel@example.test","recipient":"Cancel","line1":"Three Test Road","city":"Test","country":"VP","termsAccepted":true,"termsVersion":"v3"}',
    190,NULL
  );
  PERFORM retail_cancel_order(cancelled.order_id,'test cancellation','30000000-0000-4000-8000-000000000013');
  SELECT reserved INTO held FROM retail_variant_inventory_balances WHERE variant_id=variant_two;
  IF held<>0 THEN RAISE EXCEPTION 'cancellation did not release variant hold: %',held; END IF;

  -- Existing capture function consumes product reservations.  The V3 lifecycle
  -- trigger commits the matching variant reservation and promotion atomically.
  UPDATE retail_orders SET paypal_order_id='VP-CAPTURE-ORDER',status='created' WHERE id=created.order_id;
  IF NOT retail_apply_paypal_capture('VP-CAPTURE-ORDER','VP-CAPTURE-001','{}','{}',NULL,NULL) THEN RAISE EXCEPTION 'capture rejected V3 order'; END IF;
  SELECT on_hand,reserved INTO quote FROM retail_variant_inventory_balances WHERE variant_id=variant_one;
  IF quote.on_hand<>3 OR quote.reserved<>0 THEN RAISE EXCEPTION 'capture did not consume variant inventory'; END IF;
  SELECT status INTO observed FROM retail_promotion_redemptions WHERE order_id=created.order_id;
  IF observed<>'committed' THEN RAISE EXCEPTION 'capture did not commit promotion redemption'; END IF;

  -- Per-customer redemption constraints are checked while the promotion row is locked.
  BEGIN
    PERFORM * FROM retail_create_checkout_v3(
      '30000000-0000-4000-8000-000000000014',
      '[{"variantSku":"VP-BLUE","quantity":1}]',
      '{"email":"buyer@example.test","recipient":"Buyer","line1":"One Test Road","city":"Test","country":"VP","termsAccepted":true,"termsVersion":"v3"}',
      176,'TENOFF'
    );
    RAISE EXCEPTION 'per-customer promotion limit unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%promotion exhausted%' THEN RAISE; END IF;
  END;
END $$;

ROLLBACK;
