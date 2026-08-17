BEGIN;

CREATE TEMP TABLE saved_retail_finalize_definition(definition TEXT NOT NULL);
INSERT INTO saved_retail_finalize_definition(definition)
SELECT pg_get_functiondef('retail_finalize_customer_post_capture(text)'::regprocedure);

INSERT INTO retail_orders(
  paypal_order_id,
  client_request_id,
  currency,
  amount_minor,
  subtotal_minor,
  shipping_minor,
  tax_minor,
  discount_minor,
  status,
  items_snapshot,
  checkout_email,
  checkout_locale,
  account_intent,
  marketing_consent_requested,
  marketing_consent_source,
  marketing_consent_locale
) VALUES (
  'ATOMIC-CAPTURE-ORDER',
  '22000000-0000-4000-8000-000000000001',
  'USD',
  1250,
  1250,
  0,
  0,
  0,
  'created',
  '[]'::jsonb,
  'atomic-capture@example.test',
  'en',
  'create_or_access',
  true,
  'checkout',
  'en'
);

CREATE OR REPLACE FUNCTION retail_finalize_customer_post_capture(p_paypal_order TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'injected customer finalization failure';
END $$;

DO $$
DECLARE target_order_id BIGINT;
BEGIN
  SELECT id INTO target_order_id
  FROM retail_orders
  WHERE paypal_order_id='ATOMIC-CAPTURE-ORDER';

  BEGIN
    PERFORM retail_apply_paypal_capture_and_finalize(
      'ATOMIC-CAPTURE-ORDER',
      'ATOMIC-CAPTURE-ID',
      '{"email":"payer@example.test","name":"Payer"}'::jsonb,
      '{}'::jsonb,
      NULL,
      NULL
    );
    RAISE EXCEPTION 'expected injected customer finalization failure';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%injected customer finalization failure%' THEN RAISE; END IF;
  END;

  IF NOT EXISTS(
    SELECT 1 FROM retail_orders
    WHERE id=target_order_id AND status='created' AND capture_id IS NULL
  ) THEN RAISE EXCEPTION 'capture state was not rolled back'; END IF;
  IF EXISTS(SELECT 1 FROM retail_payment_ledger WHERE order_id=target_order_id) THEN
    RAISE EXCEPTION 'payment ledger was not rolled back';
  END IF;
  IF EXISTS(SELECT 1 FROM retail_notification_outbox WHERE order_id=target_order_id) THEN
    RAISE EXCEPTION 'notification outbox was not rolled back';
  END IF;
  IF EXISTS(SELECT 1 FROM retail_customer_marketing_consents WHERE order_id=target_order_id) THEN
    RAISE EXCEPTION 'marketing consent was not rolled back';
  END IF;
END $$;

DO $$
BEGIN
  EXECUTE (SELECT definition FROM saved_retail_finalize_definition);
END $$;

DO $$
DECLARE target_order_id BIGINT; observed INTEGER;
BEGIN
  IF NOT retail_apply_paypal_capture_and_finalize(
    'ATOMIC-CAPTURE-ORDER',
    'ATOMIC-CAPTURE-ID',
    '{"email":"payer@example.test","name":"Payer"}'::jsonb,
    '{}'::jsonb,
    NULL,
    NULL
  ) THEN RAISE EXCEPTION 'capture retry was rejected'; END IF;

  IF NOT retail_apply_paypal_capture_and_finalize(
    'ATOMIC-CAPTURE-ORDER',
    'ATOMIC-CAPTURE-ID',
    '{"email":"payer@example.test","name":"Payer"}'::jsonb,
    '{}'::jsonb,
    NULL,
    NULL
  ) THEN RAISE EXCEPTION 'capture idempotency replay was rejected'; END IF;

  SELECT id INTO target_order_id
  FROM retail_orders
  WHERE paypal_order_id='ATOMIC-CAPTURE-ORDER';

  IF NOT EXISTS(
    SELECT 1 FROM retail_orders
    WHERE id=target_order_id AND status='captured' AND capture_id='ATOMIC-CAPTURE-ID'
  ) THEN RAISE EXCEPTION 'capture retry did not commit'; END IF;

  SELECT count(*) INTO observed
  FROM retail_payment_ledger
  WHERE order_id=target_order_id AND kind='payment' AND paypal_reference='ATOMIC-CAPTURE-ID';
  IF observed<>1 THEN RAISE EXCEPTION 'expected one payment ledger row, found %', observed; END IF;

  SELECT count(*) INTO observed
  FROM retail_notification_outbox
  WHERE order_id=target_order_id AND kind='order_confirmed';
  IF observed<>1 THEN RAISE EXCEPTION 'expected one confirmation notification, found %', observed; END IF;

  SELECT count(*) INTO observed
  FROM retail_notification_outbox
  WHERE order_id=target_order_id AND kind='account_access';
  IF observed<>1 THEN RAISE EXCEPTION 'expected one account notification, found %', observed; END IF;

  SELECT count(*) INTO observed
  FROM retail_customer_marketing_consents
  WHERE order_id=target_order_id;
  IF observed<>1 THEN RAISE EXCEPTION 'expected one marketing consent, found %', observed; END IF;
END $$;

ROLLBACK;
