CREATE TABLE IF NOT EXISTS retail_orders (
  id BIGSERIAL PRIMARY KEY,
  paypal_order_id TEXT UNIQUE,
  client_request_id UUID NOT NULL UNIQUE,
  currency CHAR(3) NOT NULL,
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  status TEXT NOT NULL CHECK (status IN ('pending', 'created', 'approved', 'capturing', 'captured', 'refunded', 'reversed', 'denied', 'failed')),
  capture_id TEXT UNIQUE,
  refunded_minor BIGINT NOT NULL DEFAULT 0,
  items_snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  captured_at TIMESTAMPTZ,
  capturing_started_at TIMESTAMPTZ,
  CONSTRAINT retail_orders_capture_state CHECK (status NOT IN ('captured', 'refunded', 'reversed') OR (capture_id IS NOT NULL AND captured_at IS NOT NULL)),
  CONSTRAINT retail_orders_refund_total CHECK (refunded_minor >= 0 AND refunded_minor <= amount_minor)
);
CREATE TABLE IF NOT EXISTS retail_webhook_events (
  id BIGSERIAL PRIMARY KEY,
  paypal_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  raw_payload TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processed', 'rejected', 'ignored')),
  reason TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS retail_refunds (
  id BIGSERIAL PRIMARY KEY,
  paypal_refund_id TEXT NOT NULL UNIQUE,
  paypal_order_id TEXT NOT NULL REFERENCES retail_orders(paypal_order_id),
  capture_id TEXT NOT NULL,
  currency CHAR(3) NOT NULL,
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS retail_order_audit (
  id BIGSERIAL PRIMARY KEY,
  paypal_order_id TEXT REFERENCES retail_orders(paypal_order_id),
  action TEXT NOT NULL,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS retail_orders_status_created_idx ON retail_orders (status, created_at);

CREATE OR REPLACE FUNCTION retail_apply_paypal_refund(
  should_process BOOLEAN,
  refund_id TEXT,
  related_capture_id TEXT,
  refund_currency TEXT,
  refund_amount_minor BIGINT
) RETURNS TABLE (paypal_order_id TEXT, outcome TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  target retail_orders%ROWTYPE;
  existing retail_refunds%ROWTYPE;
BEGIN
  IF NOT should_process OR refund_id IS NULL OR related_capture_id IS NULL
    OR refund_currency IS NULL OR refund_amount_minor IS NULL OR refund_amount_minor <= 0 THEN
    RETURN;
  END IF;

  SELECT * INTO existing FROM retail_refunds WHERE paypal_refund_id = refund_id;
  IF FOUND THEN
    IF existing.capture_id = related_capture_id
      AND existing.currency = refund_currency
      AND existing.amount_minor = refund_amount_minor THEN
      RETURN QUERY SELECT existing.paypal_order_id, 'duplicate'::TEXT;
    END IF;
    RETURN;
  END IF;

  SELECT * INTO target FROM retail_orders
    WHERE capture_id = related_capture_id AND currency = refund_currency
    FOR UPDATE;
  IF NOT FOUND OR target.refunded_minor + refund_amount_minor > target.amount_minor THEN
    RETURN;
  END IF;

  INSERT INTO retail_refunds (paypal_refund_id, paypal_order_id, capture_id, currency, amount_minor)
    VALUES (refund_id, target.paypal_order_id, related_capture_id, refund_currency, refund_amount_minor);
  UPDATE retail_orders
    SET refunded_minor = refunded_minor + refund_amount_minor,
      status = CASE WHEN refunded_minor + refund_amount_minor = amount_minor THEN 'refunded' ELSE status END,
      updated_at = NOW()
    WHERE id = target.id;
  RETURN QUERY SELECT target.paypal_order_id, 'processed'::TEXT;
END;
$$;
