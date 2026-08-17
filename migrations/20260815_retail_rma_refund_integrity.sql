-- Refund lifecycle states are payment facts, not generic RMA transitions.
CREATE OR REPLACE FUNCTION retail_admin_transition_return(
  p_public_id UUID,p_status TEXT,p_admin_note TEXT,p_restock_sellable BOOLEAN,p_key UUID,
  p_actor_id TEXT,p_actor_name TEXT,p_actor_role TEXT,p_legacy BOOLEAN
) RETURNS TABLE(public_id UUID,status TEXT,replayed BOOLEAN) LANGUAGE plpgsql AS $$
DECLARE rr retail_returns%ROWTYPE; existing retail_return_events%ROWTYPE; restock RECORD; allowed BOOLEAN:=false;
BEGIN
  PERFORM retail_assert_return_permissions(p_actor_id,p_actor_name,p_actor_role,p_legacy,p_restock_sellable,false);
  IF p_status IN ('refund_pending','refunded') THEN RAISE EXCEPTION 'refund lifecycle is driven by refund requests'; END IF;
  SELECT * INTO existing FROM retail_return_events WHERE idempotency_key=p_key FOR UPDATE;
  IF FOUND THEN SELECT * INTO rr FROM retail_returns WHERE id=existing.return_id; IF existing.to_status<>p_status THEN RAISE EXCEPTION 'idempotency conflict'; END IF; RETURN QUERY SELECT rr.public_id,rr.status,true; RETURN; END IF;
  SELECT * INTO rr FROM retail_returns r WHERE r.public_id=p_public_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'return not found'; END IF;
  allowed := (rr.status='requested' AND p_status IN ('authorized','rejected','cancelled')) OR (rr.status='authorized' AND p_status IN ('in_transit','cancelled')) OR (rr.status='in_transit' AND p_status IN ('received','cancelled')) OR (rr.status='received' AND p_status IN ('inspected','rejected')) OR (rr.status='inspected' AND p_status IN ('approved','rejected')) OR (rr.status='approved' AND p_status='closed') OR (rr.status='refunded' AND p_status='closed');
  IF NOT allowed THEN RAISE EXCEPTION 'invalid return transition'; END IF;
  IF p_restock_sellable AND NOT (rr.status='inspected' AND p_status='approved') THEN RAISE EXCEPTION 'sellable restock requires inspected approval'; END IF;
  IF p_restock_sellable AND rr.restocked_at IS NOT NULL THEN RAISE EXCEPTION 'return already restocked'; END IF;
  IF p_restock_sellable THEN
    PERFORM 1 FROM retail_return_lines rl JOIN retail_product_variants v ON v.id=rl.variant_id JOIN retail_variant_inventory_balances vb ON vb.variant_id=v.id WHERE rl.return_id=rr.id ORDER BY v.id FOR UPDATE OF v,vb;
    PERFORM 1 FROM (SELECT DISTINCT v.product_id FROM retail_return_lines rl JOIN retail_product_variants v ON v.id=rl.variant_id WHERE rl.return_id=rr.id) wanted JOIN retail_products p ON p.id=wanted.product_id JOIN retail_inventory_balances pb ON pb.product_id=p.id ORDER BY p.id FOR UPDATE OF p,pb;
    FOR restock IN SELECT * FROM retail_return_lines WHERE return_id=rr.id ORDER BY variant_id FOR UPDATE LOOP UPDATE retail_variant_inventory_balances SET on_hand=on_hand+restock.quantity,updated_at=now() WHERE variant_id=restock.variant_id; IF NOT FOUND THEN RAISE EXCEPTION 'variant inventory unavailable'; END IF; INSERT INTO retail_variant_inventory_ledger(variant_id,delta_on_hand,reason,idempotency_key,reference_id) VALUES(restock.variant_id,restock.quantity,'return_restock_sellable',md5('return-restock:'||rr.id::text||':'||restock.id::text)::uuid,restock.id); END LOOP;
    FOR restock IN SELECT v.product_id,sum(rl.quantity) quantity FROM retail_return_lines rl JOIN retail_product_variants v ON v.id=rl.variant_id WHERE rl.return_id=rr.id GROUP BY v.product_id ORDER BY v.product_id LOOP UPDATE retail_inventory_balances SET on_hand=on_hand+restock.quantity,updated_at=now() WHERE product_id=restock.product_id; INSERT INTO retail_inventory_ledger(product_id,delta_on_hand,reason,idempotency_key) VALUES(restock.product_id,restock.quantity,'return_restock_sellable',md5('return-product-restock:'||rr.id::text||':'||restock.product_id::text)::uuid); END LOOP;
  END IF;
  UPDATE retail_returns SET status=p_status,admin_note=COALESCE(p_admin_note,''),authorized_at=CASE WHEN p_status='authorized' THEN now() ELSE authorized_at END,received_at=CASE WHEN p_status='received' THEN now() ELSE received_at END,inspected_at=CASE WHEN p_status='inspected' THEN now() ELSE inspected_at END,resolved_at=CASE WHEN p_status IN ('rejected','closed','cancelled') THEN now() ELSE resolved_at END,restocked_at=CASE WHEN p_restock_sellable THEN now() ELSE restocked_at END,restocked_by=CASE WHEN p_restock_sellable THEN p_actor_id ELSE restocked_by END,updated_at=now() WHERE id=rr.id;
  INSERT INTO retail_return_events(return_id,from_status,to_status,detail,actor_id,actor_name,actor_role,idempotency_key) VALUES(rr.id,rr.status,p_status,jsonb_build_object('adminNote',COALESCE(p_admin_note,''),'sellableRestock',p_restock_sellable),p_actor_id,p_actor_name,p_actor_role,p_key);
  PERFORM retail_attribute_admin_audit(p_key,'return.transition','return',rr.public_id::text,jsonb_build_object('fromStatus',rr.status,'toStatus',p_status,'sellableRestock',p_restock_sellable),p_actor_id,p_actor_name,p_actor_role,p_legacy); RETURN QUERY SELECT rr.public_id,p_status,false;
END $$;

CREATE OR REPLACE FUNCTION retail_prepare_return_refund_as_actor(
  p_public_id UUID,p_amount BIGINT,p_reason TEXT,p_key UUID,p_actor_id TEXT,p_actor_name TEXT,p_actor_role TEXT,p_legacy BOOLEAN
) RETURNS TABLE(capture_id TEXT,currency CHAR(3),amount_minor BIGINT,status TEXT,paypal_refund_id TEXT,refund_request_id UUID) LANGUAGE plpgsql AS $$
DECLARE rr retail_returns%ROWTYPE; fr retail_refund_requests%ROWTYPE; prepared RECORD; detail JSONB; target_status TEXT;
BEGIN
  PERFORM retail_assert_return_permissions(p_actor_id,p_actor_name,p_actor_role,p_legacy,false,true);
  SELECT * INTO rr FROM retail_returns r WHERE r.public_id=p_public_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'return not found'; END IF;
  IF rr.status NOT IN ('approved','refund_pending','refunded') THEN RAISE EXCEPTION 'return is not refund ready'; END IF;
  IF p_amount > rr.refund_cap_minor THEN RAISE EXCEPTION 'refund amount exceeds return cap'; END IF;
  SELECT * INTO prepared FROM retail_prepare_refund(rr.order_id,p_amount,p_reason,p_key);
  SELECT * INTO fr FROM retail_refund_requests WHERE idempotency_key=p_key FOR UPDATE; IF NOT FOUND OR fr.order_id<>rr.order_id OR fr.amount_minor<>p_amount THEN RAISE EXCEPTION 'refund request integrity failure'; END IF;
  IF rr.refund_request_id IS NOT NULL AND rr.refund_request_id<>fr.id THEN RAISE EXCEPTION 'return already linked to refund'; END IF;
  IF fr.status NOT IN ('pending','completed') THEN RAISE EXCEPTION 'refund request status is not linkable: %',fr.status; END IF;
  target_status := CASE WHEN fr.status='completed' THEN 'refunded' ELSE 'refund_pending' END;
  IF rr.status='refunded' AND target_status<>'refunded' THEN RAISE EXCEPTION 'return refund fact cannot be reversed'; END IF;
  detail := jsonb_build_object('refundRequestId',fr.id,'refundCapMinor',rr.refund_cap_minor,'refundStatus',fr.status,'amountMinor',fr.amount_minor);
  UPDATE retail_returns SET refund_request_id=fr.id,status=target_status,resolved_at=CASE WHEN target_status='refunded' THEN COALESCE(resolved_at,now()) ELSE resolved_at END,updated_at=now() WHERE id=rr.id;
  INSERT INTO retail_return_events(return_id,from_status,to_status,detail,actor_id,actor_name,actor_role,idempotency_key) VALUES(rr.id,rr.status,target_status,detail,p_actor_id,p_actor_name,p_actor_role,p_key) ON CONFLICT(idempotency_key) DO NOTHING;
  PERFORM retail_attribute_admin_audit(p_key,'return.refund.request','return',rr.public_id::text,detail,p_actor_id,p_actor_name,p_actor_role,p_legacy);
  RETURN QUERY SELECT prepared.capture_id,prepared.currency,prepared.amount_minor,prepared.status,prepared.paypal_refund_id,fr.id;
END $$;

CREATE OR REPLACE FUNCTION retail_sync_return_refund_completion() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status='completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    UPDATE retail_returns SET status='refunded',resolved_at=COALESCE(resolved_at,now()),updated_at=now() WHERE refund_request_id=NEW.id AND status='refund_pending';
    INSERT INTO retail_return_events(return_id,from_status,to_status,detail,idempotency_key)
      SELECT rr.id,'refund_pending','refunded',jsonb_build_object('refundRequestId',NEW.id,'refundStatus','completed','paypalRefundId',NEW.paypal_refund_id),md5('return-refunded:'||rr.id::text||':'||NEW.id::text)::uuid FROM retail_returns rr WHERE rr.refund_request_id=NEW.id AND rr.status='refunded' ON CONFLICT(idempotency_key) DO NOTHING;
    UPDATE retail_admin_audit SET detail=detail||jsonb_build_object('refundStatus','completed','paypalRefundId',NEW.paypal_refund_id)
      WHERE idempotency_key=NEW.idempotency_key AND action='return.refund.request';
  ELSIF NEW.status='failed' AND OLD.status='pending' THEN
    WITH restored AS (
      UPDATE retail_returns SET status='approved',refund_request_id=NULL,updated_at=now()
        WHERE refund_request_id=NEW.id AND status='refund_pending' RETURNING id
    ) INSERT INTO retail_return_events(return_id,from_status,to_status,detail,idempotency_key)
      SELECT id,'refund_pending','approved',jsonb_build_object('refundRequestId',NEW.id,'refundStatus','failed','error',NEW.last_error),md5('return-refund-failed:'||id::text||':'||NEW.id::text)::uuid FROM restored
      ON CONFLICT(idempotency_key) DO NOTHING;
    UPDATE retail_admin_audit SET detail=detail||jsonb_build_object('refundStatus','failed','error',NEW.last_error)
      WHERE idempotency_key=NEW.idempotency_key AND action='return.refund.request';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS retail_return_refund_completion ON retail_refund_requests;
CREATE TRIGGER retail_return_refund_completion AFTER UPDATE OF status ON retail_refund_requests
  FOR EACH ROW EXECUTE FUNCTION retail_sync_return_refund_completion();
