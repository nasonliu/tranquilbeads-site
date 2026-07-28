-- RMA notes are PII-bearing free text.  Keep list projections deliberately
-- metadata-only and require an audited, separate read for either note.
ALTER TABLE retail_returns
  ADD COLUMN IF NOT EXISTS refund_cap_minor BIGINT,
  ADD COLUMN IF NOT EXISTS refund_cap_calculation JSONB;

CREATE OR REPLACE FUNCTION retail_return_refund_cap(p_return UUID)
RETURNS TABLE(cap_minor BIGINT, calculation JSONB) LANGUAGE plpgsql STABLE AS $$
DECLARE
  order_row retail_orders%ROWTYPE;
  returned_subtotal NUMERIC := 0;
  product_discount NUMERIC := 0;
  allocated_discount NUMERIC := 0;
  net_returned NUMERIC := 0;
  allocated_tax NUMERIC := 0;
  denominator NUMERIC := 0;
  free_shipping BOOLEAN := false;
BEGIN
  SELECT ro.* INTO order_row FROM retail_returns rr JOIN retail_orders ro ON ro.id=rr.order_id WHERE rr.id=p_return;
  IF NOT FOUND THEN RAISE EXCEPTION 'return not found'; END IF;
  SELECT COALESCE(sum(rl.quantity::numeric * ol.unit_amount_minor::numeric),0) INTO returned_subtotal
    FROM retail_return_lines rl JOIN retail_order_lines ol ON ol.id=rl.order_line_id WHERE rl.return_id=p_return;
  -- Order-line discount_minor was not reliably persisted for this checkout
  -- generation.  Allocate the immutable order discount instead, except that a
  -- free-shipping promotion is not a merchandise discount.
  SELECT EXISTS(
    SELECT 1 FROM retail_promotion_redemptions pr JOIN retail_promotions p ON p.id=pr.promotion_id
    WHERE pr.order_id=order_row.id AND p.kind='free_shipping'
  ) INTO free_shipping;
  product_discount := CASE WHEN free_shipping THEN 0 ELSE LEAST(GREATEST(order_row.discount_minor,0),GREATEST(order_row.subtotal_minor,0)) END;
  IF order_row.subtotal_minor > 0 THEN
    allocated_discount := LEAST(returned_subtotal, (returned_subtotal * product_discount) / order_row.subtotal_minor);
  END IF;
  net_returned := GREATEST(returned_subtotal-allocated_discount,0);
  denominator := GREATEST(order_row.subtotal_minor-product_discount,0);
  IF denominator > 0 THEN allocated_tax := (net_returned * GREATEST(order_row.tax_minor,0)) / denominator; END IF;
  IF net_returned + allocated_tax > 9223372036854775807 THEN RAISE EXCEPTION 'return refund cap overflow'; END IF;
  cap_minor := (net_returned + allocated_tax)::BIGINT;
  calculation := jsonb_build_object(
    'returnedSubtotalMinor',returned_subtotal,'orderSubtotalMinor',order_row.subtotal_minor,
    'orderDiscountMinor',order_row.discount_minor,'productDiscountMinor',product_discount,
    'allocatedDiscountMinor',allocated_discount,'orderTaxMinor',order_row.tax_minor,
    'allocatedTaxMinor',allocated_tax,'shippingRefunded',false,
    'freeShippingPromotion',free_shipping
  );
  RETURN NEXT;
END $$;

-- Backfill historical RMAs once, then make the cap immutable for every RMA.
UPDATE retail_returns rr
  SET (refund_cap_minor,refund_cap_calculation)=(
    SELECT c.cap_minor,c.calculation FROM retail_return_refund_cap(rr.id) c
  )
  WHERE rr.refund_cap_minor IS NULL;
ALTER TABLE retail_returns ALTER COLUMN refund_cap_minor SET NOT NULL;
ALTER TABLE retail_returns ALTER COLUMN refund_cap_calculation SET NOT NULL;
ALTER TABLE retail_returns ADD CONSTRAINT retail_returns_refund_cap_nonnegative CHECK(refund_cap_minor >= 0);

CREATE OR REPLACE FUNCTION retail_customer_create_return(
  p_token_sha256 TEXT, p_lines JSONB, p_reason TEXT, p_customer_note TEXT, p_key UUID
) RETURNS TABLE(public_id UUID, status TEXT) LANGUAGE plpgsql AS $$
DECLARE o_id BIGINT; prior retail_returns%ROWTYPE; r RECORD; created_return UUID; requested_count INT := 0; actual_count INT := 0; cap RECORD;
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
  INSERT INTO retail_returns(order_id,reason,customer_note,customer_idempotency_key,refund_cap_minor,refund_cap_calculation)
    VALUES(o_id,btrim(p_reason),COALESCE(p_customer_note,''),p_key,0,'{}'::jsonb) RETURNING id INTO created_return;
  FOR r IN
    SELECT l.id,l.variant_id,l.variant_sku,l.title_en,l.title_ar,l.title_zh,l.quantity,(x->>'quantity')::BIGINT requested_quantity
    FROM jsonb_array_elements(p_lines) x JOIN retail_order_lines l ON l.id=(x->>'lineId')::uuid
    WHERE l.order_id=o_id ORDER BY l.id FOR UPDATE
  LOOP
    actual_count := actual_count + 1;
    IF r.requested_quantity > r.quantity - COALESCE((SELECT sum(rl.quantity) FROM retail_return_lines rl JOIN retail_returns rr ON rr.id=rl.return_id WHERE rl.order_line_id=r.id AND rr.status NOT IN ('rejected','cancelled')),0) THEN RAISE EXCEPTION 'return quantity exceeds purchased quantity'; END IF;
    INSERT INTO retail_return_lines(return_id,order_line_id,variant_id,variant_sku,title_en,title_ar,title_zh,quantity)
      VALUES(created_return,r.id,r.variant_id,r.variant_sku,r.title_en,r.title_ar,r.title_zh,r.requested_quantity);
  END LOOP;
  IF actual_count <> requested_count THEN RAISE EXCEPTION 'return line not found'; END IF;
  SELECT * INTO cap FROM retail_return_refund_cap(created_return);
  UPDATE retail_returns SET refund_cap_minor=cap.cap_minor,refund_cap_calculation=cap.calculation WHERE id=created_return;
  INSERT INTO retail_return_events(return_id,to_status,detail,customer_action,idempotency_key)
    VALUES(created_return,'requested',jsonb_build_object('reason',btrim(p_reason),'refundCapMinor',cap.cap_minor),true,md5('return-request:'||p_key::text)::uuid);
  RETURN QUERY SELECT rr.public_id,rr.status FROM retail_returns rr WHERE rr.id=created_return;
END $$;

DROP FUNCTION IF EXISTS retail_customer_list_returns(TEXT);
CREATE FUNCTION retail_customer_list_returns(p_token_sha256 TEXT)
RETURNS TABLE(public_id UUID,status TEXT,reason TEXT,customer_note TEXT,refund_request_id UUID,requested_at TIMESTAMPTZ,updated_at TIMESTAMPTZ,lines JSONB) LANGUAGE plpgsql AS $$
DECLARE o_id BIGINT;
BEGIN
  o_id := retail_customer_return_order_id(p_token_sha256); IF o_id IS NULL THEN RETURN; END IF;
  RETURN QUERY SELECT rr.public_id,rr.status,rr.reason,rr.customer_note,rr.refund_request_id,rr.requested_at,rr.updated_at,
    COALESCE(jsonb_agg(jsonb_build_object('lineId',rl.order_line_id,'sku',rl.variant_sku,'titleEn',rl.title_en,'titleAr',rl.title_ar,'titleZh',rl.title_zh,'quantity',rl.quantity) ORDER BY rl.created_at) FILTER(WHERE rl.id IS NOT NULL),'[]'::jsonb)
  FROM retail_returns rr LEFT JOIN retail_return_lines rl ON rl.return_id=rr.id WHERE rr.order_id=o_id GROUP BY rr.id ORDER BY rr.requested_at DESC;
END $$;

DROP FUNCTION IF EXISTS retail_admin_list_returns(TEXT);
CREATE FUNCTION retail_admin_list_returns(p_status TEXT,p_actor_id TEXT,p_actor_name TEXT,p_actor_role TEXT,p_legacy BOOLEAN)
RETURNS TABLE(public_id UUID,order_id BIGINT,order_public_id UUID,status TEXT,reason TEXT,refund_request_id UUID,refund_status TEXT,restocked_at TIMESTAMPTZ,requested_at TIMESTAMPTZ,updated_at TIMESTAMPTZ,lines JSONB) LANGUAGE sql STABLE AS $$
  SELECT retail_assert_return_permissions(p_actor_id,p_actor_name,p_actor_role,p_legacy,false,false);
  SELECT rr.public_id,rr.order_id,o.public_id,rr.status,rr.reason,rr.refund_request_id,fr.status,rr.restocked_at,rr.requested_at,rr.updated_at,
  COALESCE(jsonb_agg(jsonb_build_object('lineId',rl.order_line_id,'sku',rl.variant_sku,'titleEn',rl.title_en,'titleAr',rl.title_ar,'titleZh',rl.title_zh,'quantity',rl.quantity) ORDER BY rl.created_at) FILTER(WHERE rl.id IS NOT NULL),'[]'::jsonb)
  FROM retail_returns rr JOIN retail_orders o ON o.id=rr.order_id LEFT JOIN retail_refund_requests fr ON fr.id=rr.refund_request_id LEFT JOIN retail_return_lines rl ON rl.return_id=rr.id
  WHERE p_status IS NULL OR rr.status=p_status GROUP BY rr.id,o.public_id,fr.status ORDER BY rr.updated_at DESC LIMIT 250
$$;

CREATE OR REPLACE FUNCTION retail_assert_return_notes_permission(p_actor_id TEXT,p_actor_name TEXT,p_actor_role TEXT,p_legacy BOOLEAN) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  PERFORM retail_assert_return_permissions(p_actor_id,p_actor_name,p_actor_role,p_legacy,false,false);
  IF p_actor_role NOT IN ('owner','operations') THEN RAISE EXCEPTION 'actor is not permitted to view return notes'; END IF;
END $$;

CREATE OR REPLACE FUNCTION retail_record_admin_return_notes_pii_view(p_public_id UUID,p_actor_id TEXT,p_actor_name TEXT,p_actor_role TEXT,p_legacy BOOLEAN) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  PERFORM retail_assert_return_notes_permission(p_actor_id,p_actor_name,p_actor_role,p_legacy);
  PERFORM 1 FROM retail_returns WHERE public_id=p_public_id; IF NOT FOUND THEN RAISE EXCEPTION 'return not found'; END IF;
  INSERT INTO retail_admin_audit(action,entity_type,entity_id,detail,actor_id,actor_name,actor_role,legacy_actor,actor_attributed)
    VALUES('return.notes.pii.view','return',p_public_id::text,jsonb_build_object('fields',jsonb_build_array('customer_note','admin_note'),'purpose','on_demand_return_management'),p_actor_id,p_actor_name,p_actor_role,p_legacy,true);
END $$;

CREATE OR REPLACE FUNCTION retail_admin_get_return_notes(p_public_id UUID,p_actor_id TEXT,p_actor_name TEXT,p_actor_role TEXT,p_legacy BOOLEAN)
RETURNS TABLE(customer_note TEXT,admin_note TEXT) LANGUAGE plpgsql STABLE AS $$
BEGIN
  PERFORM retail_assert_return_notes_permission(p_actor_id,p_actor_name,p_actor_role,p_legacy);
  RETURN QUERY SELECT rr.customer_note,rr.admin_note FROM retail_returns rr WHERE rr.public_id=p_public_id;
END $$;

CREATE OR REPLACE FUNCTION retail_admin_link_return_refund(p_public_id UUID,p_refund UUID,p_key UUID,p_actor_id TEXT,p_actor_name TEXT,p_actor_role TEXT,p_legacy BOOLEAN)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE rr retail_returns%ROWTYPE; fr retail_refund_requests%ROWTYPE;
BEGIN
  PERFORM retail_assert_return_permissions(p_actor_id,p_actor_name,p_actor_role,p_legacy,false,true);
  SELECT * INTO rr FROM retail_returns r WHERE r.public_id=p_public_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'return not found'; END IF;
  SELECT * INTO fr FROM retail_refund_requests WHERE id=p_refund AND order_id=rr.order_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'refund request not found'; END IF;
  IF fr.amount_minor > rr.refund_cap_minor THEN RAISE EXCEPTION 'refund amount exceeds return cap'; END IF;
  IF rr.status NOT IN ('approved','refund_pending','refunded') THEN RAISE EXCEPTION 'return is not refund ready'; END IF;
  IF rr.refund_request_id IS NOT NULL AND rr.refund_request_id<>p_refund THEN RAISE EXCEPTION 'return already linked to refund'; END IF;
  UPDATE retail_returns SET refund_request_id=p_refund,status=CASE WHEN rr.status='approved' THEN 'refund_pending' ELSE rr.status END,updated_at=now() WHERE id=rr.id;
  INSERT INTO retail_return_events(return_id,from_status,to_status,detail,actor_id,actor_name,actor_role,idempotency_key) VALUES(rr.id,rr.status,CASE WHEN rr.status='approved' THEN 'refund_pending' ELSE rr.status END,jsonb_build_object('refundRequestId',p_refund,'refundCapMinor',rr.refund_cap_minor),p_actor_id,p_actor_name,p_actor_role,p_key) ON CONFLICT(idempotency_key) DO NOTHING;
  PERFORM retail_attribute_admin_audit(p_key,'return.refund.link','return',rr.public_id::text,jsonb_build_object('refundRequestId',p_refund,'refundCapMinor',rr.refund_cap_minor),p_actor_id,p_actor_name,p_actor_role,p_legacy);
  RETURN true;
END $$;
