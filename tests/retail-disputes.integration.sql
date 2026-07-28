\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  disputed_order BIGINT;
  observed TEXT;
  observed_count BIGINT;
BEGIN
  INSERT INTO retail_orders(paypal_order_id,client_request_id,currency,amount_minor,subtotal_minor,status,capture_id,captured_at,items_snapshot)
    VALUES('DISPUTE-ORDER','20000000-0000-4000-8000-000000000001','USD',100,100,'captured','DISPUTE-CAPTURE',now(),'[]')
    RETURNING id INTO disputed_order;
  INSERT INTO retail_payment_ledger(order_id,kind,amount_minor,currency,paypal_reference,idempotency_key)
    VALUES(disputed_order,'payment',100,'USD','DISPUTE-CAPTURE','20000000-0000-4000-8000-000000000002');

  IF NOT retail_apply_paypal_dispute('DISPUTE-EVENT-1','CUSTOMER.DISPUTE.CREATED','DISPUTE-1','DISPUTE-ORDER','DISPUTE-CAPTURE',
    '{"paypalEventId":"DISPUTE-EVENT-1","eventType":"CUSTOMER.DISPUTE.CREATED","resourceId":"DISPUTE-1"}'::jsonb) THEN
    RAISE EXCEPTION 'created dispute was not applied';
  END IF;
  SELECT state INTO observed FROM retail_paypal_disputes WHERE paypal_dispute_id='DISPUTE-1';
  IF observed<>'open' THEN RAISE EXCEPTION 'created dispute state was %',observed; END IF;
  SELECT reconciliation_status INTO observed FROM retail_payment_ledger WHERE paypal_reference='DISPUTE-CAPTURE';
  IF observed<>'disputed' THEN RAISE EXCEPTION 'payment reconciliation state was %',observed; END IF;
  BEGIN
    PERFORM retail_fulfil_order(disputed_order,'Carrier','TRACK','blocked','20000000-0000-4000-8000-000000000003');
    RAISE EXCEPTION 'open dispute did not block fulfilment';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%not fulfilable%' THEN RAISE; END IF;
  END;
  SELECT count(*) INTO observed_count FROM retail_notification_outbox WHERE idempotency_key='paypal-dispute:DISPUTE-1:open';
  IF observed_count<>1 THEN RAISE EXCEPTION 'open dispute did not create one manual task'; END IF;

  IF NOT retail_apply_paypal_dispute('DISPUTE-EVENT-2','CUSTOMER.DISPUTE.RESOLVED','DISPUTE-1','DISPUTE-ORDER','DISPUTE-CAPTURE',
    '{"paypalEventId":"DISPUTE-EVENT-2","eventType":"CUSTOMER.DISPUTE.RESOLVED","resourceId":"DISPUTE-1"}'::jsonb) THEN
    RAISE EXCEPTION 'resolved dispute was not applied';
  END IF;
  IF NOT retail_apply_paypal_dispute('DISPUTE-EVENT-3','CUSTOMER.DISPUTE.CREATED','DISPUTE-1','DISPUTE-ORDER','DISPUTE-CAPTURE',
    '{"paypalEventId":"DISPUTE-EVENT-3","eventType":"CUSTOMER.DISPUTE.CREATED","resourceId":"DISPUTE-1"}'::jsonb) THEN
    RAISE EXCEPTION 'replayed stale created event was not recorded';
  END IF;
  SELECT state INTO observed FROM retail_paypal_disputes WHERE paypal_dispute_id='DISPUTE-1';
  IF observed<>'resolved' THEN RAISE EXCEPTION 'stale created event reopened dispute as %',observed; END IF;
  SELECT count(*) INTO observed_count FROM retail_paypal_dispute_events WHERE paypal_dispute_id='DISPUTE-1';
  IF observed_count<>3 THEN RAISE EXCEPTION 'event history has % rows',observed_count; END IF;
  IF NOT retail_apply_paypal_dispute('DISPUTE-EVENT-3','CUSTOMER.DISPUTE.CREATED','DISPUTE-1','DISPUTE-ORDER','DISPUTE-CAPTURE',
    '{"paypalEventId":"DISPUTE-EVENT-3","eventType":"CUSTOMER.DISPUTE.CREATED","resourceId":"DISPUTE-1"}'::jsonb) THEN
    RAISE EXCEPTION 'same event replay was not idempotent';
  END IF;
  SELECT count(*) INTO observed_count FROM retail_paypal_dispute_events WHERE paypal_dispute_id='DISPUTE-1';
  IF observed_count<>3 THEN RAISE EXCEPTION 'event replay created % rows',observed_count; END IF;
END $$;

ROLLBACK;
