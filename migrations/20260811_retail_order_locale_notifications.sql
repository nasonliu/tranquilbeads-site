-- Checkout locale is an order fact.  It must not be inferred from the
-- recipient address or the worker environment when an asynchronous message is
-- delivered.  Historical rows predate this field, so their safe fallback is
-- English.
ALTER TABLE retail_orders
  ADD COLUMN IF NOT EXISTS checkout_locale TEXT NOT NULL DEFAULT 'en';
UPDATE retail_orders SET checkout_locale='en' WHERE checkout_locale IS NULL OR checkout_locale NOT IN ('en','ar','zh');
ALTER TABLE retail_orders DROP CONSTRAINT IF EXISTS retail_orders_checkout_locale_check;
ALTER TABLE retail_orders ADD CONSTRAINT retail_orders_checkout_locale_check CHECK(checkout_locale IN ('en','ar','zh'));

-- Expand the outbox enum before deployed workers begin emitting the new
-- customer-facing terminal event snapshots in the contract migration.
ALTER TABLE retail_notification_outbox DROP CONSTRAINT IF EXISTS retail_notification_outbox_kind_check;
ALTER TABLE retail_notification_outbox ADD CONSTRAINT retail_notification_outbox_kind_check
  CHECK(kind IN ('order_confirmed','order_fulfilled','order_refunded','order_cancelled','payment_failed','checkout_expired','payment_attention','low_stock'));

CREATE TABLE IF NOT EXISTS retail_customer_portal_notification_tokens (
  notification_id UUID PRIMARY KEY REFERENCES retail_notification_outbox(id) ON DELETE CASCADE,
  order_id BIGINT NOT NULL REFERENCES retail_orders(id) ON DELETE CASCADE,
  token_id UUID NOT NULL REFERENCES retail_customer_portal_tokens(id) ON DELETE CASCADE,
  token_sha256 CHAR(64) NOT NULL CHECK(token_sha256 ~ '^[0-9a-f]{64}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION retail_issue_notification_portal_token(p_order BIGINT,p_notification UUID,p_token_sha256 TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE mapped retail_customer_portal_notification_tokens%ROWTYPE; token_row retail_customer_portal_tokens%ROWTYPE; issued UUID;
BEGIN
  IF p_token_sha256 !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'invalid customer portal token'; END IF;
  PERFORM 1 FROM retail_orders WHERE id=p_order FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order not found'; END IF;
  PERFORM 1 FROM retail_notification_outbox WHERE id=p_notification AND order_id=p_order AND kind='order_confirmed' FOR KEY SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'notification portal token is not a confirmation'; END IF;
  SELECT * INTO mapped FROM retail_customer_portal_notification_tokens WHERE notification_id=p_notification FOR UPDATE;
  IF FOUND THEN
    IF mapped.order_id<>p_order OR mapped.token_sha256<>p_token_sha256 THEN RAISE EXCEPTION 'notification portal token conflict'; END IF;
    SELECT * INTO token_row FROM retail_customer_portal_tokens WHERE id=mapped.token_id FOR UPDATE;
    -- A manual rotation revokes the original mapping.  Retry must never revive it.
    RETURN FOUND AND token_row.revoked_at IS NULL AND token_row.expires_at>now() AND token_row.token_sha256=mapped.token_sha256;
  END IF;
  IF EXISTS(SELECT 1 FROM retail_customer_portal_tokens WHERE order_id=p_order AND revoked_at IS NULL AND expires_at>now()) THEN RETURN false; END IF;
  INSERT INTO retail_customer_portal_tokens(order_id,token_sha256,expires_at)
    VALUES(p_order,p_token_sha256,now()+interval '30 days') RETURNING id INTO issued;
  INSERT INTO retail_customer_portal_notification_tokens(notification_id,order_id,token_id,token_sha256)
    VALUES(p_notification,p_order,issued,p_token_sha256);
  RETURN true;
END $$;
