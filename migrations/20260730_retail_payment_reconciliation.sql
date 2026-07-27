-- Payment reconciliation hardening.  Keep earlier migrations immutable: this
-- migration only tightens transitions and makes delayed PayPal deliveries safe.

CREATE TABLE IF NOT EXISTS retail_runtime_environment (
  singleton BOOLEAN PRIMARY KEY DEFAULT true CHECK(singleton),
  identity TEXT NOT NULL UNIQUE CHECK(length(identity) BETWEEN 16 AND 128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION retail_cancel_order(p_order BIGINT,p_reason TEXT,p_key UUID) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE o retail_orders%ROWTYPE; r RECORD; prior retail_admin_audit%ROWTYPE;
BEGIN
  SELECT * INTO o FROM retail_orders WHERE id=p_order FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order not found'; END IF;
  SELECT * INTO prior FROM retail_admin_audit WHERE idempotency_key=p_key FOR UPDATE;
  IF FOUND THEN
    IF prior.action<>'order.cancel' OR prior.entity_type<>'order' OR prior.entity_id<>p_order::text OR prior.detail->>'reason' IS DISTINCT FROM p_reason THEN RAISE EXCEPTION 'idempotency conflict'; END IF;
    RETURN true;
  END IF;
  IF o.status='cancelled' THEN RAISE EXCEPTION 'order already cancelled'; END IF;
  -- An approved or capturing order may still be captured by PayPal.  Its
  -- reservation must remain intact until the remote payment is reconciled.
  IF o.status NOT IN ('pending','created','expired','failed','denied') OR (o.status='created' AND o.paypal_order_id IS NOT NULL) THEN RAISE EXCEPTION 'order requires payment reconciliation'; END IF;
  FOR r IN SELECT * FROM retail_inventory_reservations WHERE order_id=o.id AND status='active' ORDER BY product_id,id FOR UPDATE LOOP
    UPDATE retail_inventory_balances SET reserved=reserved-r.quantity,updated_at=now() WHERE product_id=r.product_id AND reserved>=r.quantity;
    IF NOT FOUND THEN RAISE EXCEPTION 'reservation balance invalid'; END IF;
    UPDATE retail_inventory_reservations SET status='released' WHERE id=r.id;
    INSERT INTO retail_inventory_ledger(product_id,delta_reserved,reason,idempotency_key,reference_id) VALUES(r.product_id,-r.quantity,'order_cancelled',md5('cancel:'||p_key::text||':'||r.id::text)::uuid,r.id) ON CONFLICT(idempotency_key) DO NOTHING;
  END LOOP;
  UPDATE retail_orders SET status='cancelled',capturing_started_at=NULL,updated_at=now() WHERE id=o.id;
  INSERT INTO retail_admin_audit(action,entity_type,entity_id,detail,idempotency_key) VALUES('order.cancel','order',p_order::text,jsonb_build_object('reason',p_reason),p_key);
  RETURN true;
END $$;

-- A webhook has no admin idempotency key, so it must never guess which admin
-- refund request caused an event.  It records PayPal's financial truth only;
-- the cron retries each pending request with its stable PayPal-Request-Id and
-- retail_complete_refund links the proven response to that exact request.
CREATE OR REPLACE FUNCTION retail_apply_paypal_refund(should_process BOOLEAN,refund_id TEXT,related_capture_id TEXT,refund_currency TEXT,refund_amount_minor BIGINT)
RETURNS TABLE (paypal_order_id TEXT, outcome TEXT) LANGUAGE plpgsql AS $$
DECLARE target retail_orders%ROWTYPE; existing retail_refunds%ROWTYPE;
BEGIN
  IF NOT should_process OR refund_id IS NULL OR related_capture_id IS NULL OR refund_currency IS NULL OR refund_amount_minor IS NULL OR refund_amount_minor<=0 THEN RETURN; END IF;
  SELECT * INTO existing FROM retail_refunds WHERE paypal_refund_id=refund_id;
  IF FOUND THEN
    IF existing.capture_id=related_capture_id AND existing.currency=refund_currency AND existing.amount_minor=refund_amount_minor THEN
      RETURN QUERY SELECT existing.paypal_order_id,'duplicate'::TEXT;
    END IF;
    RETURN;
  END IF;
  SELECT * INTO target FROM retail_orders WHERE capture_id=related_capture_id AND currency=refund_currency FOR UPDATE;
  IF NOT FOUND OR target.refunded_minor+refund_amount_minor>target.amount_minor THEN RETURN; END IF;
  INSERT INTO retail_refunds(paypal_refund_id,paypal_order_id,capture_id,currency,amount_minor) VALUES(refund_id,target.paypal_order_id,related_capture_id,refund_currency,refund_amount_minor);
  UPDATE retail_orders SET refunded_minor=refunded_minor+refund_amount_minor,status=CASE WHEN refunded_minor+refund_amount_minor=amount_minor THEN 'refunded' ELSE status END,updated_at=now() WHERE id=target.id;
  INSERT INTO retail_payment_ledger(order_id,kind,amount_minor,currency,paypal_reference,idempotency_key) VALUES(target.id,'refund',-refund_amount_minor,refund_currency,refund_id,md5('refund:'||refund_id)::uuid) ON CONFLICT(idempotency_key) DO NOTHING;
  RETURN QUERY SELECT target.paypal_order_id,'processed'::TEXT;
END $$;
