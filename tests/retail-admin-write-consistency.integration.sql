\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  product_public UUID;
  customer_public UUID;
  captured_order_id BIGINT;
  refund_order_id BIGINT;
  cancel_order_id BIGINT;
  approved_order_id BIGINT;
  checkout_order_id BIGINT;
  ledger_id UUID;
  row_result RECORD;
  observed BIGINT;
BEGIN
  SELECT * INTO row_result FROM retail_create_admin_product(
    'INTEGRATION-SKU','integration-sku','Integration product','منتج اختبار','','','draft',100,
    '10000000-0000-4000-8000-000000000001'
  );
  product_public:=row_result.public_id;
  IF row_result.replayed THEN RAISE EXCEPTION 'first product write reported replay'; END IF;

  SELECT * INTO row_result FROM retail_create_admin_product(
    'INTEGRATION-SKU','integration-sku','Integration product','منتج اختبار','','','draft',100,
    '10000000-0000-4000-8000-000000000001'
  );
  IF NOT row_result.replayed OR row_result.public_id<>product_public THEN RAISE EXCEPTION 'product replay mismatch'; END IF;

  SELECT * INTO row_result FROM retail_update_admin_product(
    product_public,NULL,'Updated product',NULL,NULL,NULL,NULL,
    '10000000-0000-4000-8000-000000000002'
  );
  SELECT * INTO row_result FROM retail_update_admin_product(
    product_public,NULL,'Updated product',NULL,NULL,NULL,NULL,
    '10000000-0000-4000-8000-000000000002'
  );
  IF NOT row_result.replayed THEN RAISE EXCEPTION 'product update replay was not recognized'; END IF;
  BEGIN
    PERFORM * FROM retail_update_admin_product(
      product_public,NULL,'Changed payload',NULL,NULL,NULL,NULL,
      '10000000-0000-4000-8000-000000000002'
    );
    RAISE EXCEPTION 'expected product idempotency conflict';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%idempotency conflict%' THEN RAISE; END IF;
  END;

  INSERT INTO retail_customers(email,name) VALUES('integration@example.test','Buyer') RETURNING public_id INTO customer_public;
  SELECT * INTO row_result FROM retail_update_admin_customer(
    customer_public,'Buyer updated',NULL,'Recipient','Line 1',NULL,'Dubai',NULL,NULL,'AE',NULL,true,false,true,
    '10000000-0000-4000-8000-000000000003'
  );
  SELECT * INTO row_result FROM retail_update_admin_customer(
    customer_public,'Buyer updated',NULL,'Recipient','Line 1',NULL,'Dubai',NULL,NULL,'AE',NULL,true,false,true,
    '10000000-0000-4000-8000-000000000003'
  );
  SELECT count(*) INTO observed FROM retail_addresses a JOIN retail_customers c ON c.id=a.customer_id WHERE c.public_id=customer_public;
  IF observed<>1 THEN RAISE EXCEPTION 'customer retry created % addresses',observed; END IF;

  SELECT * INTO row_result FROM retail_attach_product_image_idempotent(
    product_public,'https://example.test/integration.webp','retail/integration.webp','image/webp',10,'abc','','',
    '10000000-0000-4000-8000-000000000004'
  );
  SELECT * INTO row_result FROM retail_attach_product_image_idempotent(
    product_public,'https://example.test/integration.webp','retail/integration.webp','image/webp',10,'abc','','',
    '10000000-0000-4000-8000-000000000004'
  );
  IF NOT row_result.replayed THEN RAISE EXCEPTION 'image replay was not recognized'; END IF;
  SELECT count(*) INTO observed FROM retail_product_images WHERE product_id=(SELECT id FROM retail_products WHERE public_id=product_public);
  IF observed<>1 THEN RAISE EXCEPTION 'image retry created % rows',observed; END IF;

  PERFORM retail_change_product_price_with_audit(product_public,125,'10000000-0000-4000-8000-000000000005','integration');
  PERFORM retail_change_product_price_with_audit(product_public,125,'10000000-0000-4000-8000-000000000005','integration');
  PERFORM retail_adjust_inventory_with_audit(product_public,5,'integration','10000000-0000-4000-8000-000000000006');
  PERFORM retail_adjust_inventory_with_audit(product_public,5,'integration','10000000-0000-4000-8000-000000000006');
  SELECT on_hand INTO observed FROM retail_inventory_balances WHERE product_id=(SELECT id FROM retail_products WHERE public_id=product_public);
  IF observed<>5 THEN RAISE EXCEPTION 'inventory retry changed stock to %',observed; END IF;
  SELECT count(*) INTO observed FROM retail_admin_audit WHERE idempotency_key IN (
    '10000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000006'
  );
  IF observed<>2 THEN RAISE EXCEPTION 'business retry created % audit rows',observed; END IF;

  PERFORM * FROM retail_upsert_admin_shipping_zone(
    'AE','United Arab Emirates','الإمارات',250,NULL,0,true,
    '10000000-0000-4000-8000-000000000007'
  );
  SELECT * INTO row_result FROM retail_upsert_admin_shipping_zone(
    'AE','United Arab Emirates','الإمارات',250,NULL,0,true,
    '10000000-0000-4000-8000-000000000007'
  );
  IF NOT row_result.replayed THEN RAISE EXCEPTION 'shipping replay was not recognized'; END IF;

  UPDATE retail_products SET status='published' WHERE public_id=product_public;
  SELECT c.order_id INTO checkout_order_id FROM retail_create_checkout_v2(
    '10000000-0000-4000-8000-000000000020',
    '[{"sku":"INTEGRATION-SKU","quantity":1}]'::jsonb,
    '{"email":"checkout@example.test","recipient":"Buyer","line1":"Line 1","city":"Dubai","country":"AE","termsAccepted":true,"termsVersion":"integration"}'::jsonb,
    375
  ) c;
  IF checkout_order_id IS NULL OR NOT EXISTS(SELECT 1 FROM retail_orders WHERE id=checkout_order_id AND status='pending') THEN
    RAISE EXCEPTION 'checkout creation did not return its inserted order';
  END IF;
  SELECT c.order_id INTO observed FROM retail_create_checkout_v2(
    '10000000-0000-4000-8000-000000000020',
    '[{"sku":"INTEGRATION-SKU","quantity":1}]'::jsonb,
    '{"email":"checkout@example.test","recipient":"Buyer","line1":"Line 1","city":"Dubai","country":"AE","termsAccepted":true,"termsVersion":"integration"}'::jsonb,
    375
  ) c;
  IF observed<>checkout_order_id THEN RAISE EXCEPTION 'checkout replay returned order % instead of %',observed,checkout_order_id; END IF;
  PERFORM retail_cancel_order(checkout_order_id,'integration cleanup','10000000-0000-4000-8000-000000000021');
  PERFORM retail_disable_admin_shipping_zone('AE','10000000-0000-4000-8000-000000000008');
  PERFORM retail_disable_admin_shipping_zone('AE','10000000-0000-4000-8000-000000000008');

  INSERT INTO retail_orders(paypal_order_id,client_request_id,currency,amount_minor,subtotal_minor,status,capture_id,captured_at,items_snapshot)
    VALUES('INTEGRATION-ORDER','10000000-0000-4000-8000-000000000009','USD',100,100,'captured','INTEGRATION-CAPTURE',now(),'[]') RETURNING id INTO captured_order_id;
  PERFORM retail_fulfil_order(captured_order_id,'Carrier','TRACK','Note','10000000-0000-4000-8000-000000000010');
  PERFORM retail_fulfil_order(captured_order_id,'Carrier','TRACK','Note','10000000-0000-4000-8000-000000000010');
  SELECT count(*) INTO observed FROM retail_admin_audit WHERE idempotency_key='10000000-0000-4000-8000-000000000010';
  IF observed<>1 THEN RAISE EXCEPTION 'fulfil retry created % audits',observed; END IF;

  INSERT INTO retail_orders(paypal_order_id,client_request_id,currency,amount_minor,subtotal_minor,status,capture_id,captured_at,items_snapshot)
    VALUES('INTEGRATION-REFUND','10000000-0000-4000-8000-000000000011','USD',100,100,'captured','INTEGRATION-REFUND-CAPTURE',now(),'[]') RETURNING id INTO refund_order_id;
  PERFORM * FROM retail_prepare_refund(refund_order_id,50,'integration','10000000-0000-4000-8000-000000000012');
  BEGIN
    PERFORM * FROM retail_prepare_refund(refund_order_id,50,'changed reason','10000000-0000-4000-8000-000000000012');
    RAISE EXCEPTION 'expected refund reason idempotency conflict';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%idempotency conflict%' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM retail_fulfil_order(refund_order_id,'Carrier','TRACK','Note','10000000-0000-4000-8000-000000000013');
    RAISE EXCEPTION 'expected pending refund to block fulfilment';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%not fulfilable%' THEN RAISE; END IF;
  END;
  PERFORM * FROM retail_apply_paypal_refund(true,'INTEGRATION-REFUND-ID','INTEGRATION-REFUND-CAPTURE','USD',50);
  SELECT count(*) INTO observed FROM retail_refund_requests
    WHERE idempotency_key='10000000-0000-4000-8000-000000000012' AND status='pending' AND paypal_refund_id IS NULL;
  IF observed<>1 THEN RAISE EXCEPTION 'refund webhook guessed an admin refund request'; END IF;
  SELECT refunded_minor INTO observed FROM retail_orders WHERE id=refund_order_id;
  IF observed<>50 THEN RAISE EXCEPTION 'refund webhook recorded % refunded minor units',observed; END IF;
  PERFORM retail_complete_refund('10000000-0000-4000-8000-000000000012','INTEGRATION-REFUND-ID');
  PERFORM * FROM retail_prepare_refund(refund_order_id,50,'second integration refund','10000000-0000-4000-8000-000000000030');
  PERFORM * FROM retail_apply_paypal_refund(true,'INTEGRATION-REFUND-ID','INTEGRATION-REFUND-CAPTURE','USD',50);
  SELECT count(*) INTO observed FROM retail_refund_requests
    WHERE idempotency_key='10000000-0000-4000-8000-000000000030' AND status='pending' AND paypal_refund_id IS NULL;
  IF observed<>1 THEN RAISE EXCEPTION 'duplicate refund webhook completed a different same-amount request'; END IF;

  INSERT INTO retail_payment_ledger(order_id,kind,amount_minor,currency,paypal_reference,idempotency_key)
    VALUES(captured_order_id,'payment',100,'USD','INTEGRATION-LEDGER','10000000-0000-4000-8000-000000000014') RETURNING id INTO ledger_id;
  PERFORM retail_reconcile_with_audit(ledger_id,'reconciled','checked','10000000-0000-4000-8000-000000000015');
  PERFORM retail_reconcile_with_audit(ledger_id,'reconciled','checked','10000000-0000-4000-8000-000000000015');
  SELECT count(*) INTO observed FROM retail_admin_audit WHERE idempotency_key='10000000-0000-4000-8000-000000000015';
  IF observed<>1 THEN RAISE EXCEPTION 'reconciliation retry created % audits',observed; END IF;

  INSERT INTO retail_orders(paypal_order_id,client_request_id,currency,amount_minor,subtotal_minor,status,items_snapshot)
    VALUES(NULL,'10000000-0000-4000-8000-000000000016','USD',100,100,'pending','[]') RETURNING id INTO cancel_order_id;
  PERFORM retail_cancel_order(cancel_order_id,'integration','10000000-0000-4000-8000-000000000017');
  PERFORM retail_cancel_order(cancel_order_id,'integration','10000000-0000-4000-8000-000000000017');
  BEGIN
    PERFORM retail_cancel_order(cancel_order_id,'changed reason','10000000-0000-4000-8000-000000000017');
    RAISE EXCEPTION 'expected cancellation reason idempotency conflict';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%idempotency conflict%' THEN RAISE; END IF;
  END;

  INSERT INTO retail_orders(paypal_order_id,client_request_id,currency,amount_minor,subtotal_minor,status,items_snapshot)
    VALUES('INTEGRATION-APPROVED','10000000-0000-4000-8000-000000000018','USD',100,100,'approved','[]') RETURNING id INTO approved_order_id;
  BEGIN
    PERFORM retail_cancel_order(approved_order_id,'unsafe','10000000-0000-4000-8000-000000000019');
    RAISE EXCEPTION 'expected approved cancellation to require payment reconciliation';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%requires payment reconciliation%' THEN RAISE; END IF;
  END;
  UPDATE retail_orders SET status='created' WHERE id=approved_order_id;
  BEGIN
    PERFORM retail_cancel_order(approved_order_id,'unsafe','10000000-0000-4000-8000-000000000031');
    RAISE EXCEPTION 'expected PayPal-created cancellation to require payment reconciliation';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%requires payment reconciliation%' THEN RAISE; END IF;
  END;

  PERFORM retail_apply_paypal_capture('INTEGRATION-ORDER','INTEGRATION-CAPTURE','{}'::jsonb,'{}'::jsonb,5,95);
  SELECT count(*) INTO observed FROM retail_payment_ledger ledger
    WHERE ledger.order_id=captured_order_id AND ledger.kind='fee' AND ledger.amount_minor=-5 AND ledger.paypal_reference='fee:INTEGRATION-CAPTURE';
  IF observed<>1 THEN RAISE EXCEPTION 'capture accounting retry did not backfill the fee'; END IF;
END $$;

ROLLBACK;
