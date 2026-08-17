-- A return may only reserve its one-to-one refund link once the refund request
-- is still actionable.  In particular, a failed or cancelled generic refund
-- must not strand the RMA's unique refund_request_id.
ALTER TABLE retail_refund_requests
  DROP CONSTRAINT IF EXISTS retail_refund_requests_status_check;
ALTER TABLE retail_refund_requests
  ADD CONSTRAINT retail_refund_requests_status_check
  CHECK (status IN ('pending','completed','failed','cancelled'));

CREATE OR REPLACE FUNCTION retail_admin_link_return_refund(
  p_public_id UUID,p_refund UUID,p_key UUID,p_actor_id TEXT,p_actor_name TEXT,p_actor_role TEXT,p_legacy BOOLEAN
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
  rr retail_returns%ROWTYPE;
  fr retail_refund_requests%ROWTYPE;
  prior retail_return_events%ROWTYPE;
  target_status TEXT;
  detail JSONB;
BEGIN
  -- Check authority before looking at replay state, so a known idempotency key
  -- does not disclose or replay an authorized refund link to another actor.
  PERFORM retail_assert_return_permissions(p_actor_id,p_actor_name,p_actor_role,p_legacy,false,true);

  SELECT * INTO rr FROM retail_returns r WHERE r.public_id=p_public_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'return not found'; END IF;

  SELECT * INTO prior FROM retail_return_events
    WHERE idempotency_key=p_key FOR UPDATE;
  IF FOUND THEN
    IF prior.return_id<>rr.id
       OR prior.detail->>'refundRequestId' IS DISTINCT FROM p_refund::text
       OR NOT (prior.detail ? 'refundCapMinor') THEN
      RAISE EXCEPTION 'idempotency conflict';
    END IF;
    RETURN true;
  END IF;

  SELECT * INTO fr FROM retail_refund_requests
    WHERE id=p_refund AND order_id=rr.order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'refund request not found'; END IF;
  IF fr.amount_minor > rr.refund_cap_minor THEN
    RAISE EXCEPTION 'refund amount exceeds return cap';
  END IF;
  IF rr.refund_request_id IS NOT NULL AND rr.refund_request_id<>p_refund THEN
    RAISE EXCEPTION 'return already linked to refund';
  END IF;

  CASE fr.status
    WHEN 'pending' THEN target_status := 'refund_pending';
    WHEN 'completed' THEN target_status := 'refunded';
    WHEN 'failed', 'cancelled' THEN
      RAISE EXCEPTION 'refund request status is not linkable: %', fr.status;
    ELSE
      RAISE EXCEPTION 'refund request status is not linkable: %', fr.status;
  END CASE;

  IF (rr.status='approved' AND target_status NOT IN ('refund_pending','refunded'))
     OR (rr.status='refund_pending' AND target_status NOT IN ('refund_pending','refunded'))
     OR (rr.status='refunded' AND target_status<>'refunded')
     OR rr.status NOT IN ('approved','refund_pending','refunded') THEN
    RAISE EXCEPTION 'return is not refund ready for refund request status';
  END IF;

  detail := jsonb_build_object(
    'refundRequestId',p_refund,
    'refundCapMinor',rr.refund_cap_minor,
    'refundStatus',fr.status
  );
  UPDATE retail_returns
    SET refund_request_id=p_refund,
        status=target_status,
        resolved_at=CASE WHEN target_status='refunded' THEN COALESCE(resolved_at,now()) ELSE resolved_at END,
        updated_at=now()
    WHERE id=rr.id;
  INSERT INTO retail_return_events(
    return_id,from_status,to_status,detail,actor_id,actor_name,actor_role,idempotency_key
  ) VALUES(
    rr.id,rr.status,target_status,detail,p_actor_id,p_actor_name,p_actor_role,p_key
  );
  PERFORM retail_attribute_admin_audit(
    p_key,'return.refund.link','return',rr.public_id::text,detail,
    p_actor_id,p_actor_name,p_actor_role,p_legacy
  );
  RETURN true;
END $$;
