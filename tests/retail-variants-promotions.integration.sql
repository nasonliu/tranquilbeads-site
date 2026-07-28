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
    '{"email":"buyer@example.test","recipient":"Buyer","line1":"One Test Road","city":"Test","country":"VP","termsAccepted":true,"termsVersion":"v3","locale":"en"}',
    'tenoff'
  );
  IF quote.subtotal_minor<>200 OR quote.shipping_minor<>50 OR quote.discount_minor<>20 OR quote.total_minor<>230 THEN
    RAISE EXCEPTION 'V3 quote did not calculate promotion safely: %',row_to_json(quote);
  END IF;
  SELECT * INTO created FROM retail_create_checkout_v3(
    '30000000-0000-4000-8000-000000000010',
    '[{"variantSku":"VP-RED","quantity":2}]',
    '{"email":"buyer@example.test","recipient":"Buyer","line1":"One Test Road","city":"Test","country":"VP","termsAccepted":true,"termsVersion":"v3","locale":"zh"}',
    230,'TENOFF'
  );
  IF created.order_id IS NULL OR created.amount_minor<>230 THEN RAISE EXCEPTION 'V3 checkout did not create order'; END IF;
  SELECT checkout_locale INTO observed FROM retail_orders WHERE id=created.order_id;
  IF observed<>'zh' THEN RAISE EXCEPTION 'checkout locale was not persisted: %',observed; END IF;
  BEGIN
    PERFORM * FROM retail_create_checkout_v3(
      '30000000-0000-4000-8000-000000000010',
      '[{"variantSku":"VP-RED","quantity":2}]',
      '{"email":"buyer@example.test","recipient":"Buyer","line1":"One Test Road","city":"Test","country":"VP","termsAccepted":true,"termsVersion":"v3","locale":"en"}',
      230,'TENOFF'
    );
    RAISE EXCEPTION 'locale-only idempotency mismatch unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%idempotency conflict%' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM * FROM retail_create_checkout_v3(
      '30000000-0000-4000-8000-000000000009',
      '[{"variantSku":"VP-RED","quantity":1}]',
      '{"email":"invalid@example.test","recipient":"Invalid","line1":"Invalid Road","city":"Test","country":"VP","termsAccepted":true,"termsVersion":"v3"}',
      0,NULL
    );
    RAISE EXCEPTION 'missing checkout locale unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%invalid checkout%' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM * FROM retail_create_checkout_v3(
      '30000000-0000-4000-8000-000000000008',
      '[{"variantSku":"VP-RED","quantity":1}]',
      '{"email":"invalid@example.test","recipient":"Invalid","line1":"Invalid Road","city":"Test","country":"VP","termsAccepted":true,"termsVersion":"v3","locale":"fr"}',
      0,NULL
    );
    RAISE EXCEPTION 'invalid checkout locale unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%invalid checkout%' THEN RAISE; END IF;
  END;
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
      '{"email":"other@example.test","recipient":"Other","line1":"Two Test Road","city":"Test","country":"VP","termsAccepted":true,"termsVersion":"v3","locale":"en"}',
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
    '{"email":"cancel@example.test","recipient":"Cancel","line1":"Three Test Road","city":"Test","country":"VP","termsAccepted":true,"termsVersion":"v3","locale":"en"}',
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
      '{"email":"buyer@example.test","recipient":"Buyer","line1":"One Test Road","city":"Test","country":"VP","termsAccepted":true,"termsVersion":"v3","locale":"en"}',
      176,'TENOFF'
    );
    RAISE EXCEPTION 'per-customer promotion limit unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%promotion exhausted%' THEN RAISE; END IF;
  END;
END $$;

ROLLBACK;

-- 20260811 notification contracts: terminal messages are immutable per order,
-- and confirmation retries retain one portal-token mapping without reviving a
-- manually rotated credential.
BEGIN;

DO $$
DECLARE
  expired_order BIGINT;
  failed_order BIGINT;
  denied_order BIGINT;
  confirmation_order BIGINT;
  confirmation_notification UUID;
  terminal_notification UUID;
  terminal_count BIGINT;
  token_count BIGINT;
  mapping_count BIGINT;
  observed_kind TEXT;
  issued BOOLEAN;
BEGIN
  INSERT INTO retail_orders(client_request_id,currency,amount_minor,subtotal_minor,shipping_minor,tax_minor,discount_minor,status,items_snapshot,checkout_email)
    VALUES
      ('30000000-0000-4000-8000-000000000101','USD',100,100,0,0,0,'created','[]','expired@example.test'),
      ('30000000-0000-4000-8000-000000000102','USD',100,100,0,0,0,'created','[]','failed@example.test'),
      ('30000000-0000-4000-8000-000000000103','USD',100,100,0,0,0,'created','[]','denied@example.test');
  SELECT id INTO expired_order FROM retail_orders WHERE client_request_id='30000000-0000-4000-8000-000000000101';
  SELECT id INTO failed_order FROM retail_orders WHERE client_request_id='30000000-0000-4000-8000-000000000102';
  SELECT id INTO denied_order FROM retail_orders WHERE client_request_id='30000000-0000-4000-8000-000000000103';

  UPDATE retail_orders SET status='expired' WHERE id=expired_order;
  PERFORM retail_cancel_order(expired_order,'terminal contract','30000000-0000-4000-8000-000000000111');
  UPDATE retail_orders SET status='failed' WHERE id=failed_order;
  PERFORM retail_cancel_order(failed_order,'terminal contract','30000000-0000-4000-8000-000000000112');
  UPDATE retail_orders SET status='denied' WHERE id=denied_order;
  PERFORM retail_cancel_order(denied_order,'terminal contract','30000000-0000-4000-8000-000000000113');

  SELECT count(*),min(kind) INTO terminal_count,observed_kind FROM retail_notification_outbox WHERE order_id=expired_order AND idempotency_key='terminal:'||expired_order;
  IF terminal_count<>1 OR observed_kind<>'checkout_expired' THEN RAISE EXCEPTION 'expired terminal notification was not retained: %, %',terminal_count,observed_kind; END IF;
  SELECT count(*),min(kind) INTO terminal_count,observed_kind FROM retail_notification_outbox WHERE order_id=failed_order AND idempotency_key='terminal:'||failed_order;
  IF terminal_count<>1 OR observed_kind<>'payment_failed' THEN RAISE EXCEPTION 'failed terminal notification was not retained: %, %',terminal_count,observed_kind; END IF;
  SELECT count(*),min(kind) INTO terminal_count,observed_kind FROM retail_notification_outbox WHERE order_id=denied_order AND idempotency_key='terminal:'||denied_order;
  IF terminal_count<>1 OR observed_kind<>'payment_failed' THEN RAISE EXCEPTION 'denied terminal notification was not retained: %, %',terminal_count,observed_kind; END IF;

  INSERT INTO retail_orders(client_request_id,currency,amount_minor,subtotal_minor,shipping_minor,tax_minor,discount_minor,status,items_snapshot,checkout_email)
    VALUES('30000000-0000-4000-8000-000000000104','USD',100,100,0,0,0,'created','[]','confirm@example.test')
    RETURNING id INTO confirmation_order;
  UPDATE retail_orders SET status='captured',capture_id='NOTIFICATION-CONTRACT-CAPTURE',captured_at=now() WHERE id=confirmation_order;
  SELECT id INTO confirmation_notification FROM retail_notification_outbox WHERE order_id=confirmation_order AND kind='order_confirmed' AND idempotency_key='confirmed:'||confirmation_order;
  IF confirmation_notification IS NULL THEN RAISE EXCEPTION 'confirmation notification was not enqueued'; END IF;

  SELECT retail_issue_notification_portal_token(confirmation_order,confirmation_notification,repeat('a',64)) INTO issued;
  IF issued IS DISTINCT FROM true THEN RAISE EXCEPTION 'initial confirmation portal token was not issued'; END IF;
  SELECT retail_issue_notification_portal_token(confirmation_order,confirmation_notification,repeat('a',64)) INTO issued;
  IF issued IS DISTINCT FROM true THEN RAISE EXCEPTION 'same confirmation portal token retry was not reusable'; END IF;
  SELECT count(*) INTO mapping_count FROM retail_customer_portal_notification_tokens WHERE notification_id=confirmation_notification;
  SELECT count(*) INTO token_count FROM retail_customer_portal_tokens WHERE order_id=confirmation_order;
  IF mapping_count<>1 OR token_count<>1 THEN RAISE EXCEPTION 'confirmation retry created duplicate mapping/token: %, %',mapping_count,token_count; END IF;
  BEGIN
    PERFORM retail_issue_notification_portal_token(confirmation_order,confirmation_notification,repeat('b',64));
    RAISE EXCEPTION 'different confirmation token hash unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%notification portal token conflict%' THEN RAISE; END IF;
  END;
  PERFORM retail_issue_customer_portal_token(confirmation_order,repeat('c',64),now()+interval '30 days');
  SELECT retail_issue_notification_portal_token(confirmation_order,confirmation_notification,repeat('a',64)) INTO issued;
  IF issued IS DISTINCT FROM false THEN RAISE EXCEPTION 'manually rotated token was revived by notification retry'; END IF;

  SELECT id INTO terminal_notification FROM retail_notification_outbox WHERE order_id=expired_order AND idempotency_key='terminal:'||expired_order;
  BEGIN
    PERFORM retail_issue_notification_portal_token(expired_order,terminal_notification,repeat('d',64));
    RAISE EXCEPTION 'non-confirmation notification unexpectedly issued a portal token';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%not a confirmation%' THEN RAISE; END IF;
  END;
END $$;

ROLLBACK;
