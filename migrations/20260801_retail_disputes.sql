-- PayPal disputes are not refunds. Keep an immutable, non-PII event trail and
-- make an unresolved dispute block fulfilment until an operator has reviewed it.
CREATE TABLE IF NOT EXISTS retail_paypal_disputes (
  paypal_dispute_id TEXT PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES retail_orders(id),
  paypal_order_id TEXT NOT NULL REFERENCES retail_orders(paypal_order_id),
  capture_id TEXT,
  state TEXT NOT NULL CHECK (state IN ('open','resolved')),
  opened_event_id TEXT NOT NULL,
  latest_event_id TEXT NOT NULL,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS retail_paypal_disputes_open_order_idx
  ON retail_paypal_disputes(order_id) WHERE state='open';

CREATE TABLE IF NOT EXISTS retail_paypal_dispute_events (
  paypal_event_id TEXT PRIMARY KEY,
  paypal_dispute_id TEXT NOT NULL REFERENCES retail_paypal_disputes(paypal_dispute_id),
  event_type TEXT NOT NULL CHECK (event_type IN ('CUSTOMER.DISPUTE.CREATED','CUSTOMER.DISPUTE.UPDATED','CUSTOMER.DISPUTE.RESOLVED')),
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION retail_apply_paypal_dispute(
  p_event_id TEXT,
  p_event_type TEXT,
  p_dispute_id TEXT,
  p_paypal_order_id TEXT,
  p_capture_id TEXT,
  p_summary JSONB
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
  target retail_orders%ROWTYPE;
  prior retail_paypal_disputes%ROWTYPE;
  next_state TEXT;
  prior_exists BOOLEAN := false;
  existing_dispute_id TEXT;
  existing_event_type TEXT;
BEGIN
  IF p_event_id IS NULL OR p_dispute_id IS NULL
    OR p_event_type NOT IN ('CUSTOMER.DISPUTE.CREATED','CUSTOMER.DISPUTE.UPDATED','CUSTOMER.DISPUTE.RESOLVED') THEN
    RETURN false;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_dispute_id,0));

  SELECT paypal_dispute_id,event_type INTO existing_dispute_id,existing_event_type
    FROM retail_paypal_dispute_events WHERE paypal_event_id=p_event_id FOR UPDATE;
  IF FOUND THEN
    RETURN existing_dispute_id=p_dispute_id AND existing_event_type=p_event_type;
  END IF;

  SELECT * INTO target FROM retail_orders
    WHERE (p_paypal_order_id IS NOT NULL AND paypal_order_id=p_paypal_order_id)
       OR (p_capture_id IS NOT NULL AND capture_id=p_capture_id)
    ORDER BY CASE WHEN p_paypal_order_id IS NOT NULL AND paypal_order_id=p_paypal_order_id THEN 0 ELSE 1 END
    LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  -- A verified event may arrive before capture. In that case an order id is
  -- sufficient to establish a fulfilment hold; a populated capture id must
  -- never contradict the order being linked.
  IF p_paypal_order_id IS NOT NULL AND target.paypal_order_id IS DISTINCT FROM p_paypal_order_id THEN RETURN false; END IF;
  IF p_capture_id IS NOT NULL AND target.capture_id IS NOT NULL AND target.capture_id IS DISTINCT FROM p_capture_id THEN RETURN false; END IF;

  SELECT * INTO prior FROM retail_paypal_disputes WHERE paypal_dispute_id=p_dispute_id FOR UPDATE;
  prior_exists := FOUND;
  IF FOUND THEN
    IF prior.order_id<>target.id OR prior.paypal_order_id<>target.paypal_order_id
       OR (prior.capture_id IS NOT NULL AND p_capture_id IS NOT NULL AND prior.capture_id<>p_capture_id) THEN
      RETURN false;
    END IF;
  END IF;

  next_state := CASE
    WHEN p_event_type='CUSTOMER.DISPUTE.RESOLVED' THEN 'resolved'
    WHEN prior_exists AND prior.state='resolved' THEN 'resolved'
    ELSE 'open'
  END;

  IF NOT prior_exists THEN
    INSERT INTO retail_paypal_disputes(paypal_dispute_id,order_id,paypal_order_id,capture_id,state,opened_event_id,latest_event_id,summary,resolved_at)
      VALUES(p_dispute_id,target.id,target.paypal_order_id,COALESCE(p_capture_id,target.capture_id),next_state,p_event_id,p_event_id,COALESCE(p_summary,'{}'::jsonb),CASE WHEN next_state='resolved' THEN now() ELSE NULL END);
  ELSE
    UPDATE retail_paypal_disputes
      SET capture_id=COALESCE(capture_id,p_capture_id,target.capture_id), state=next_state,
        latest_event_id=p_event_id, summary=COALESCE(p_summary,'{}'::jsonb),
        resolved_at=CASE WHEN next_state='resolved' THEN COALESCE(resolved_at,now()) ELSE NULL END,
        updated_at=now()
      WHERE paypal_dispute_id=p_dispute_id;
  END IF;

  INSERT INTO retail_paypal_dispute_events(paypal_event_id,paypal_dispute_id,event_type,summary)
    VALUES(p_event_id,p_dispute_id,p_event_type,COALESCE(p_summary,'{}'::jsonb));

  IF next_state='open' THEN
    UPDATE retail_payment_ledger
      SET reconciliation_status='disputed'
      WHERE order_id=target.id AND kind IN ('payment','net') AND reconciliation_status<>'disputed';
  END IF;
  INSERT INTO retail_order_audit(paypal_order_id,action,detail)
    VALUES(target.paypal_order_id,'paypal.dispute.'||lower(replace(p_event_type,'CUSTOMER.DISPUTE.','')),COALESCE(p_summary,'{}'::jsonb));
  INSERT INTO retail_notification_outbox(order_id,kind,recipient,payload,idempotency_key)
    VALUES(target.id,'payment_attention',NULL,jsonb_build_object('paypalDisputeId',p_dispute_id,'state',next_state,'eventType',p_event_type),'paypal-dispute:'||p_dispute_id||':'||next_state)
    ON CONFLICT(idempotency_key) DO NOTHING;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION retail_fulfil_order(p_order BIGINT,p_carrier TEXT,p_tracking TEXT,p_note TEXT,p_key UUID) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE o retail_orders%ROWTYPE; prior retail_admin_audit%ROWTYPE; payload JSONB;
BEGIN
  payload:=jsonb_build_object('carrier',p_carrier,'tracking',p_tracking,'note',p_note);
  SELECT * INTO o FROM retail_orders WHERE id=p_order FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order not found'; END IF;
  SELECT * INTO prior FROM retail_admin_audit WHERE idempotency_key=p_key FOR UPDATE;
  IF FOUND THEN
    IF prior.action<>'order.fulfil' OR prior.entity_type<>'order' OR prior.entity_id<>p_order::text OR prior.detail<>payload THEN RAISE EXCEPTION 'idempotency conflict'; END IF;
    RETURN;
  END IF;
  IF o.status<>'captured' OR o.fulfilment_status<>'unfulfilled'
     OR EXISTS(SELECT 1 FROM retail_refund_requests WHERE order_id=p_order AND status='pending')
     OR EXISTS(SELECT 1 FROM retail_paypal_disputes WHERE order_id=p_order AND state='open') THEN
    RAISE EXCEPTION 'order is not fulfilable';
  END IF;
  UPDATE retail_orders SET fulfilment_status='fulfilled',carrier=p_carrier,tracking_number=p_tracking,admin_note=p_note,updated_at=now()
    WHERE id=p_order AND status='captured' AND fulfilment_status='unfulfilled';
  IF NOT FOUND THEN RAISE EXCEPTION 'order state changed concurrently'; END IF;
  INSERT INTO retail_admin_audit(action,entity_type,entity_id,detail,idempotency_key) VALUES('order.fulfil','order',p_order::text,payload,p_key);
END $$;
