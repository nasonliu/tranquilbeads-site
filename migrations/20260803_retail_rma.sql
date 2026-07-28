-- Stage 3F: return merchandise authorizations (RMA).  Returns are tied to
-- immutable order lines, not to the mutable catalogue, so a later SKU/title
-- edit cannot change what a buyer is entitled to return.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS retail_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  order_id BIGINT NOT NULL REFERENCES retail_orders(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','authorized','in_transit','received','inspected','approved','rejected','refund_pending','refunded','closed','cancelled')),
  reason TEXT NOT NULL CHECK (length(btrim(reason)) BETWEEN 1 AND 1000),
  customer_note TEXT NOT NULL DEFAULT '' CHECK (length(customer_note) <= 2000),
  admin_note TEXT NOT NULL DEFAULT '' CHECK (length(admin_note) <= 2000),
  refund_request_id UUID UNIQUE REFERENCES retail_refund_requests(id) ON DELETE RESTRICT,
  restocked_at TIMESTAMPTZ,
  restocked_by TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  authorized_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  inspected_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  customer_idempotency_key UUID NOT NULL UNIQUE
);
CREATE INDEX IF NOT EXISTS retail_returns_order_idx ON retail_returns(order_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS retail_returns_status_idx ON retail_returns(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS retail_return_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES retail_returns(id) ON DELETE CASCADE,
  order_line_id UUID NOT NULL REFERENCES retail_order_lines(id) ON DELETE RESTRICT,
  variant_id UUID NOT NULL REFERENCES retail_product_variants(id) ON DELETE RESTRICT,
  variant_sku TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  title_zh TEXT NOT NULL,
  quantity BIGINT NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(return_id, order_line_id)
);
CREATE INDEX IF NOT EXISTS retail_return_lines_order_line_idx ON retail_return_lines(order_line_id);

CREATE TABLE IF NOT EXISTS retail_return_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES retail_returns(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(detail) = 'object'),
  actor_id TEXT,
  actor_name TEXT,
  actor_role TEXT,
  customer_action BOOLEAN NOT NULL DEFAULT false,
  idempotency_key UUID NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS retail_return_events_return_idx ON retail_return_events(return_id, created_at);

CREATE OR REPLACE FUNCTION retail_customer_return_order_id(p_token_sha256 TEXT) RETURNS BIGINT
LANGUAGE plpgsql AS $$
DECLARE output_order BIGINT;
BEGIN
  IF p_token_sha256 !~ '^[0-9a-f]{64}$' THEN RETURN NULL; END IF;
  UPDATE retail_customer_portal_tokens t SET last_used_at=now()
  WHERE t.token_sha256=p_token_sha256 AND t.revoked_at IS NULL AND t.expires_at>now()
  RETURNING t.order_id INTO output_order;
  RETURN output_order;
END $$;

CREATE OR REPLACE FUNCTION retail_customer_create_return(
  p_token_sha256 TEXT, p_lines JSONB, p_reason TEXT, p_customer_note TEXT, p_key UUID
) RETURNS TABLE(public_id UUID, status TEXT) LANGUAGE plpgsql AS $$
DECLARE o_id BIGINT; prior retail_returns%ROWTYPE; r RECORD; requested_count INT := 0; actual_count INT := 0;
BEGIN
  o_id := retail_customer_return_order_id(p_token_sha256);
  IF o_id IS NULL THEN RAISE EXCEPTION 'portal unavailable'; END IF;
  IF jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0 OR jsonb_array_length(p_lines) > 20 THEN RAISE EXCEPTION 'invalid return lines'; END IF;
  IF length(btrim(COALESCE(p_reason,''))) NOT BETWEEN 1 AND 1000 OR length(COALESCE(p_customer_note,'')) > 2000 THEN RAISE EXCEPTION 'invalid return reason'; END IF;
  SELECT * INTO prior FROM retail_returns WHERE customer_idempotency_key=p_key FOR UPDATE;
  IF FOUND THEN
    IF prior.order_id <> o_id OR prior.reason <> btrim(p_reason) OR prior.customer_note <> COALESCE(p_customer_note,'') THEN RAISE EXCEPTION 'idempotency conflict'; END IF;
    RETURN QUERY SELECT prior.public_id, prior.status; RETURN;
  END IF;
  IF EXISTS(SELECT 1 FROM retail_orders o WHERE o.id=o_id AND o.status NOT IN ('captured','refunded')) THEN RAISE EXCEPTION 'order is not returnable'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_lines) x WHERE jsonb_typeof(x) <> 'object' OR COALESCE(x->>'lineId','') !~ '^[0-9a-f-]{36}$' OR COALESCE(x->>'quantity','') !~ '^[1-9][0-9]*$') THEN RAISE EXCEPTION 'invalid return lines'; END IF;
  IF EXISTS(SELECT x->>'lineId' FROM jsonb_array_elements(p_lines) x GROUP BY x->>'lineId' HAVING count(*) > 1) THEN RAISE EXCEPTION 'duplicate return line'; END IF;
  SELECT count(*) INTO requested_count FROM jsonb_array_elements(p_lines);
  INSERT INTO retail_returns(order_id,reason,customer_note,customer_idempotency_key) VALUES(o_id,btrim(p_reason),COALESCE(p_customer_note,''),p_key) RETURNING retail_returns.id,retail_returns.public_id,retail_returns.status INTO r;
  FOR r IN
    SELECT l.id,l.variant_id,l.variant_sku,l.title_en,l.title_ar,l.title_zh,l.quantity,(x->>'quantity')::BIGINT requested_quantity
    FROM jsonb_array_elements(p_lines) x JOIN retail_order_lines l ON l.id=(x->>'lineId')::uuid
    WHERE l.order_id=o_id ORDER BY l.id FOR UPDATE
  LOOP
    actual_count := actual_count + 1;
    IF r.requested_quantity > r.quantity - COALESCE((
      SELECT sum(rl.quantity) FROM retail_return_lines rl JOIN retail_returns rr ON rr.id=rl.return_id
      WHERE rl.order_line_id=r.id AND rr.status NOT IN ('rejected','cancelled')
    ),0) THEN RAISE EXCEPTION 'return quantity exceeds purchased quantity'; END IF;
    INSERT INTO retail_return_lines(return_id,order_line_id,variant_id,variant_sku,title_en,title_ar,title_zh,quantity)
      VALUES((SELECT id FROM retail_returns WHERE customer_idempotency_key=p_key),r.id,r.variant_id,r.variant_sku,r.title_en,r.title_ar,r.title_zh,r.requested_quantity);
  END LOOP;
  IF actual_count <> requested_count THEN RAISE EXCEPTION 'return line not found'; END IF;
  INSERT INTO retail_return_events(return_id,to_status,detail,customer_action,idempotency_key)
    VALUES((SELECT id FROM retail_returns WHERE customer_idempotency_key=p_key),'requested',jsonb_build_object('reason',btrim(p_reason)),true,md5('return-request:'||p_key::text)::uuid);
  RETURN QUERY SELECT rr.public_id,rr.status FROM retail_returns rr WHERE rr.customer_idempotency_key=p_key;
END $$;

CREATE OR REPLACE FUNCTION retail_customer_list_returns(p_token_sha256 TEXT)
RETURNS TABLE(public_id UUID,status TEXT,reason TEXT,customer_note TEXT,admin_note TEXT,refund_request_id UUID,requested_at TIMESTAMPTZ,updated_at TIMESTAMPTZ,lines JSONB) LANGUAGE plpgsql AS $$
DECLARE o_id BIGINT;
BEGIN
  o_id := retail_customer_return_order_id(p_token_sha256); IF o_id IS NULL THEN RETURN; END IF;
  RETURN QUERY SELECT rr.public_id,rr.status,rr.reason,rr.customer_note,rr.admin_note,rr.refund_request_id,rr.requested_at,rr.updated_at,
    COALESCE(jsonb_agg(jsonb_build_object('lineId',rl.order_line_id,'sku',rl.variant_sku,'titleEn',rl.title_en,'titleAr',rl.title_ar,'titleZh',rl.title_zh,'quantity',rl.quantity) ORDER BY rl.created_at) FILTER(WHERE rl.id IS NOT NULL),'[]'::jsonb)
  FROM retail_returns rr LEFT JOIN retail_return_lines rl ON rl.return_id=rr.id WHERE rr.order_id=o_id
  GROUP BY rr.id ORDER BY rr.requested_at DESC;
END $$;

CREATE OR REPLACE FUNCTION retail_customer_returnable_lines(p_token_sha256 TEXT)
RETURNS TABLE(line_id UUID,variant_sku TEXT,title_en TEXT,title_ar TEXT,title_zh TEXT,purchased_quantity BIGINT,remaining_quantity BIGINT) LANGUAGE plpgsql AS $$
DECLARE o_id BIGINT;
BEGIN
  o_id := retail_customer_return_order_id(p_token_sha256); IF o_id IS NULL THEN RETURN; END IF;
  RETURN QUERY SELECT l.id,l.variant_sku,l.title_en,l.title_ar,l.title_zh,l.quantity,
    l.quantity-COALESCE((SELECT sum(rl.quantity) FROM retail_return_lines rl JOIN retail_returns rr ON rr.id=rl.return_id WHERE rl.order_line_id=l.id AND rr.status NOT IN ('rejected','cancelled')),0)
  FROM retail_order_lines l JOIN retail_orders o ON o.id=l.order_id
  WHERE l.order_id=o_id AND o.status IN ('captured','refunded') ORDER BY l.created_at;
END $$;

CREATE OR REPLACE FUNCTION retail_admin_transition_return(
  p_public_id UUID,p_status TEXT,p_admin_note TEXT,p_restock_sellable BOOLEAN,p_key UUID,
  p_actor_id TEXT,p_actor_name TEXT,p_actor_role TEXT,p_legacy BOOLEAN
) RETURNS TABLE(public_id UUID,status TEXT,replayed BOOLEAN) LANGUAGE plpgsql AS $$
DECLARE rr retail_returns%ROWTYPE; existing retail_return_events%ROWTYPE; line RECORD; allowed BOOLEAN := false;
BEGIN
  IF p_actor_role NOT IN ('owner','operations','warehouse','finance','viewer') OR COALESCE(btrim(p_actor_id),'')='' OR COALESCE(btrim(p_actor_name),'')='' THEN RAISE EXCEPTION 'invalid admin actor'; END IF;
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
  SELECT * INTO rr FROM retail_returns r WHERE r.public_id=p_public_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'return not found'; END IF;
  SELECT * INTO fr FROM retail_refund_requests WHERE id=p_refund AND order_id=rr.order_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'refund request not found'; END IF;
  IF rr.status NOT IN ('approved','refund_pending','refunded') THEN RAISE EXCEPTION 'return is not refund ready'; END IF;
  IF rr.refund_request_id IS NOT NULL AND rr.refund_request_id<>p_refund THEN RAISE EXCEPTION 'return already linked to refund'; END IF;
  UPDATE retail_returns SET refund_request_id=p_refund,status=CASE WHEN rr.status='approved' THEN 'refund_pending' ELSE rr.status END,updated_at=now() WHERE id=rr.id;
  INSERT INTO retail_return_events(return_id,from_status,to_status,detail,actor_id,actor_name,actor_role,idempotency_key) VALUES(rr.id,rr.status,CASE WHEN rr.status='approved' THEN 'refund_pending' ELSE rr.status END,jsonb_build_object('refundRequestId',p_refund),p_actor_id,p_actor_name,p_actor_role,p_key) ON CONFLICT(idempotency_key) DO NOTHING;
  PERFORM retail_attribute_admin_audit(p_key,'return.refund.link','return',rr.public_id::text,jsonb_build_object('refundRequestId',p_refund),p_actor_id,p_actor_name,p_actor_role,p_legacy);
  RETURN true;
END $$;

-- The PayPal completion path remains the sole authority for money movement.
-- Once its existing refund request becomes completed, reflect that fact on an
-- already-linked RMA without ever touching inventory.
CREATE OR REPLACE FUNCTION retail_sync_return_refund_completion() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status='completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    UPDATE retail_returns SET status='refunded',resolved_at=now(),updated_at=now()
      WHERE refund_request_id=NEW.id AND status='refund_pending';
    INSERT INTO retail_return_events(return_id,from_status,to_status,detail,idempotency_key)
      SELECT rr.id,'refund_pending','refunded',jsonb_build_object('refundRequestId',NEW.id),md5('return-refunded:'||rr.id::text||':'||NEW.id::text)::uuid
      FROM retail_returns rr WHERE rr.refund_request_id=NEW.id AND rr.status='refunded'
      ON CONFLICT(idempotency_key) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS retail_return_refund_completion ON retail_refund_requests;
CREATE TRIGGER retail_return_refund_completion AFTER UPDATE OF status ON retail_refund_requests
  FOR EACH ROW EXECUTE FUNCTION retail_sync_return_refund_completion();

CREATE OR REPLACE FUNCTION retail_admin_list_returns(p_status TEXT DEFAULT NULL)
RETURNS TABLE(public_id UUID,order_id BIGINT,order_public_id UUID,status TEXT,reason TEXT,customer_note TEXT,admin_note TEXT,refund_request_id UUID,refund_status TEXT,restocked_at TIMESTAMPTZ,requested_at TIMESTAMPTZ,updated_at TIMESTAMPTZ,lines JSONB) LANGUAGE sql STABLE AS $$
  SELECT rr.public_id,rr.order_id,o.public_id,rr.status,rr.reason,rr.customer_note,rr.admin_note,rr.refund_request_id,fr.status,rr.restocked_at,rr.requested_at,rr.updated_at,
  COALESCE(jsonb_agg(jsonb_build_object('lineId',rl.order_line_id,'sku',rl.variant_sku,'titleEn',rl.title_en,'titleAr',rl.title_ar,'titleZh',rl.title_zh,'quantity',rl.quantity) ORDER BY rl.created_at) FILTER(WHERE rl.id IS NOT NULL),'[]'::jsonb)
  FROM retail_returns rr JOIN retail_orders o ON o.id=rr.order_id LEFT JOIN retail_refund_requests fr ON fr.id=rr.refund_request_id LEFT JOIN retail_return_lines rl ON rl.return_id=rr.id
  WHERE p_status IS NULL OR rr.status=p_status GROUP BY rr.id,o.public_id,fr.status ORDER BY rr.updated_at DESC LIMIT 250
$$;
