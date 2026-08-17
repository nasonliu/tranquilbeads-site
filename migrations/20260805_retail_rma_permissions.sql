-- RMA mutation authorization must be enforced where state changes happen, not
-- merely in the HTTP handlers.  The configured operator registry remains an
-- application concern, while this function enforces the corresponding stable
-- role/permission policy for every direct database invocation as well.
CREATE OR REPLACE FUNCTION retail_assert_return_permissions(
  p_actor_id TEXT,p_actor_name TEXT,p_actor_role TEXT,p_legacy BOOLEAN,
  p_restock_sellable BOOLEAN DEFAULT false,p_link_refund BOOLEAN DEFAULT false
) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  IF COALESCE(btrim(p_actor_id),'')='' OR COALESCE(btrim(p_actor_name),'')='' OR p_actor_role NOT IN ('owner','operations','warehouse','finance','viewer') OR p_legacy IS NULL THEN
    RAISE EXCEPTION 'invalid admin actor';
  END IF;
  -- returns:manage: owner, operations, and warehouse only.
  IF p_actor_role NOT IN ('owner','operations','warehouse') THEN
    RAISE EXCEPTION 'actor is not permitted to manage returns';
  END IF;
  -- inventory:write: owner and warehouse only.  Operations may manage the
  -- case, but cannot make a sellable stock adjustment as a side effect.
  IF p_restock_sellable AND p_actor_role NOT IN ('owner','warehouse') THEN
    RAISE EXCEPTION 'actor is not permitted to restock sellable inventory';
  END IF;
  -- A refund link is part of the refund workflow and remains restricted to
  -- roles with orders:refund, even if they can otherwise manage returns.
  IF p_link_refund AND p_actor_role NOT IN ('owner','operations') THEN
    RAISE EXCEPTION 'actor is not permitted to link return refunds';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION retail_admin_transition_return(
  p_public_id UUID,p_status TEXT,p_admin_note TEXT,p_restock_sellable BOOLEAN,p_key UUID,
  p_actor_id TEXT,p_actor_name TEXT,p_actor_role TEXT,p_legacy BOOLEAN
) RETURNS TABLE(public_id UUID,status TEXT,replayed BOOLEAN) LANGUAGE plpgsql AS $$
DECLARE rr retail_returns%ROWTYPE; existing retail_return_events%ROWTYPE; line RECORD; allowed BOOLEAN := false;
BEGIN
  -- Run this before idempotency replay so an unauthorized actor cannot learn
  -- or replay a prior state transition via a known request key.
  PERFORM retail_assert_return_permissions(p_actor_id,p_actor_name,p_actor_role,p_legacy,p_restock_sellable,false);
  SELECT * INTO existing FROM retail_return_events WHERE idempotency_key=p_key FOR UPDATE;
  IF FOUND THEN
    SELECT * INTO rr FROM retail_returns WHERE id=existing.return_id;
    IF existing.to_status<>p_status THEN RAISE EXCEPTION 'idempotency conflict'; END IF;
    RETURN QUERY SELECT rr.public_id,rr.status,true; RETURN;
  END IF;
  SELECT * INTO rr FROM retail_returns r WHERE r.public_id=p_public_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'return not found'; END IF;
  allowed := (rr.status='requested' AND p_status IN ('authorized','rejected','cancelled'))
    OR (rr.status='authorized' AND p_status IN ('in_transit','cancelled'))
    OR (rr.status='in_transit' AND p_status IN ('received','cancelled'))
    OR (rr.status='received' AND p_status IN ('inspected','rejected'))
    OR (rr.status='inspected' AND p_status IN ('approved','rejected'))
    OR (rr.status='approved' AND p_status IN ('refund_pending','closed'))
    OR (rr.status='refund_pending' AND p_status='refunded')
    OR (rr.status='refunded' AND p_status='closed');
  IF NOT allowed THEN RAISE EXCEPTION 'invalid return transition'; END IF;
  IF p_restock_sellable AND NOT (rr.status='inspected' AND p_status='approved') THEN RAISE EXCEPTION 'sellable restock requires inspected approval'; END IF;
  IF p_restock_sellable AND rr.restocked_at IS NOT NULL THEN RAISE EXCEPTION 'return already restocked'; END IF;
  IF p_restock_sellable THEN
    FOR line IN SELECT * FROM retail_return_lines WHERE return_id=rr.id ORDER BY variant_id FOR UPDATE LOOP
      UPDATE retail_variant_inventory_balances SET on_hand=on_hand+line.quantity,updated_at=now() WHERE variant_id=line.variant_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'variant inventory unavailable'; END IF;
      UPDATE retail_inventory_balances b SET on_hand=b.on_hand+line.quantity,updated_at=now() FROM retail_product_variants v WHERE v.id=line.variant_id AND b.product_id=v.product_id;
      INSERT INTO retail_variant_inventory_ledger(variant_id,delta_on_hand,reason,idempotency_key,reference_id) VALUES(line.variant_id,line.quantity,'return_restock_sellable',md5('return-restock:'||rr.id::text||':'||line.id::text)::uuid,line.id);
      INSERT INTO retail_inventory_ledger(product_id,delta_on_hand,reason,idempotency_key) SELECT v.product_id,line.quantity,'return_restock_sellable',md5('return-product-restock:'||rr.id::text||':'||line.id::text)::uuid FROM retail_product_variants v WHERE v.id=line.variant_id;
    END LOOP;
  END IF;
  UPDATE retail_returns SET status=p_status,admin_note=COALESCE(p_admin_note,''),authorized_at=CASE WHEN p_status='authorized' THEN now() ELSE authorized_at END,received_at=CASE WHEN p_status='received' THEN now() ELSE received_at END,inspected_at=CASE WHEN p_status='inspected' THEN now() ELSE inspected_at END,resolved_at=CASE WHEN p_status IN ('rejected','refunded','closed','cancelled') THEN now() ELSE resolved_at END,restocked_at=CASE WHEN p_restock_sellable THEN now() ELSE restocked_at END,restocked_by=CASE WHEN p_restock_sellable THEN p_actor_id ELSE restocked_by END,updated_at=now() WHERE id=rr.id;
  INSERT INTO retail_return_events(return_id,from_status,to_status,detail,actor_id,actor_name,actor_role,idempotency_key) VALUES(rr.id,rr.status,p_status,jsonb_build_object('adminNote',COALESCE(p_admin_note,''),'sellableRestock',p_restock_sellable),p_actor_id,p_actor_name,p_actor_role,p_key);
  PERFORM retail_attribute_admin_audit(p_key,'return.transition','return',rr.public_id::text,jsonb_build_object('fromStatus',rr.status,'toStatus',p_status,'sellableRestock',p_restock_sellable),p_actor_id,p_actor_name,p_actor_role,p_legacy);
  RETURN QUERY SELECT rr.public_id,p_status,false;
END $$;

CREATE OR REPLACE FUNCTION retail_admin_link_return_refund(p_public_id UUID,p_refund UUID,p_key UUID,p_actor_id TEXT,p_actor_name TEXT,p_actor_role TEXT,p_legacy BOOLEAN)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE rr retail_returns%ROWTYPE; fr retail_refund_requests%ROWTYPE;
BEGIN
  PERFORM retail_assert_return_permissions(p_actor_id,p_actor_name,p_actor_role,p_legacy,false,true);
  SELECT * INTO rr FROM retail_returns r WHERE r.public_id=p_public_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'return not found'; END IF;
  SELECT * INTO fr FROM retail_refund_requests WHERE id=p_refund AND order_id=rr.order_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'refund request not found'; END IF;
  IF rr.status NOT IN ('approved','refund_pending','refunded') THEN RAISE EXCEPTION 'return is not refund ready'; END IF;
  IF rr.refund_request_id IS NOT NULL AND rr.refund_request_id<>p_refund THEN RAISE EXCEPTION 'return already linked to refund'; END IF;
  UPDATE retail_returns SET refund_request_id=p_refund,status=CASE WHEN rr.status='approved' THEN 'refund_pending' ELSE rr.status END,updated_at=now() WHERE id=rr.id;
  INSERT INTO retail_return_events(return_id,from_status,to_status,detail,actor_id,actor_name,actor_role,idempotency_key) VALUES(rr.id,rr.status,CASE WHEN rr.status='approved' THEN 'refund_pending' ELSE rr.status END,jsonb_build_object('refundRequestId',p_refund),p_actor_id,p_actor_name,p_actor_role,p_key) ON CONFLICT(idempotency_key) DO NOTHING;
  PERFORM retail_attribute_admin_audit(p_key,'return.refund.link','return',rr.public_id::text,jsonb_build_object('refundRequestId',p_refund),p_actor_id,p_actor_name,p_actor_role,p_legacy);
  RETURN true;
END $$;
