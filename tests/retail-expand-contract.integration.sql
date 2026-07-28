\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  checkout_definition TEXT;
  notification_definition TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='retail_orders'
      AND column_name='checkout_locale' AND column_default='''en''::text'
  ) THEN
    RAISE EXCEPTION 'expand did not add checkout_locale with the English default';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='retail_orders'::regclass AND conname='retail_orders_checkout_locale_check'
  ) THEN
    RAISE EXCEPTION 'expand did not add checkout_locale validation';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='retail_notification_outbox'::regclass
      AND conname='retail_notification_outbox_kind_check'
      AND pg_get_constraintdef(oid) LIKE '%checkout_expired%'
  ) THEN
    RAISE EXCEPTION 'expand did not extend notification kinds';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE oid='retail_customer_portal_notification_tokens'::regclass) THEN
    RAISE EXCEPTION 'expand did not add the notification portal mapping';
  END IF;
  IF to_regprocedure('retail_issue_notification_portal_token(bigint,uuid,text)') IS NULL THEN
    RAISE EXCEPTION 'expand did not add the notification portal function';
  END IF;
  SELECT pg_get_functiondef('retail_create_checkout_v3(uuid,jsonb,jsonb,bigint,text)'::regprocedure) INTO checkout_definition;
  IF position('checkout_locale:=lower' IN checkout_definition)<>0
     OR position('existing.checkout_locale<>checkout_locale' IN checkout_definition)<>0 THEN
    RAISE EXCEPTION 'expand unexpectedly contracted the V3 checkout function';
  END IF;
  SELECT pg_get_functiondef('retail_order_notification_trigger()'::regprocedure) INTO notification_definition;
  IF position('terminal:' IN notification_definition)<>0
     OR position('checkout_expired' IN notification_definition)<>0 THEN
    RAISE EXCEPTION 'expand unexpectedly replaced the compatible notification trigger';
  END IF;
END $$;

ROLLBACK;
