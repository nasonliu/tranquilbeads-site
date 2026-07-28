\set ON_ERROR_STOP on
BEGIN;
DO $$
DECLARE product_id UUID; v_id UUID; noneligible_v_id UUID; order_id BIGINT; line_id UUID; rma RECORD; quantity_after BIGINT; token_hash TEXT := repeat('b',64); payload JSONB; note RECORD; over_refund UUID := '40000000-0000-4000-8000-0000000000d7'; exact_refund UUID := '40000000-0000-4000-8000-0000000000f7'; cross_order_refund UUID := '40000000-0000-4000-8000-000000000114'; free_order BIGINT; free_line UUID; free_rma RECORD; free_promotion UUID; line_discount_order BIGINT; eligible_line UUID; noneligible_line UUID; noneligible_rma RECORD; eligible_one_rma RECORD; eligible_two_rma RECORD;
BEGIN
  INSERT INTO retail_products(sku,slug,title_en,title_ar,title_zh,description_en,description_ar,description_zh,status)
    VALUES('RMA-P','rma-product','Return product','منتج إرجاع','退货商品','','','','published') RETURNING id INTO product_id;
  INSERT INTO retail_inventory_balances(product_id,on_hand,reserved) VALUES(product_id,4,0);
  INSERT INTO retail_product_variants(product_id,sku,title_en,title_ar,title_zh,option_values) VALUES(product_id,'RMA-V','Return variant','نسخة إرجاع','退货规格','{}') RETURNING id INTO v_id;
  INSERT INTO retail_variant_inventory_balances(variant_id,on_hand,reserved) VALUES(v_id,4,0);
  INSERT INTO retail_product_variants(product_id,sku,title_en,title_ar,title_zh,option_values) VALUES(product_id,'RMA-V-OTHER','Other variant','نسخة أخرى','非优惠规格','{"kind":"other"}') RETURNING id INTO noneligible_v_id;
  INSERT INTO retail_orders(paypal_order_id,client_request_id,currency,amount_minor,subtotal_minor,shipping_minor,tax_minor,discount_minor,status,capture_id,captured_at,items_snapshot)
    VALUES('RMA-ORDER','40000000-0000-4000-8000-000000000001','USD',90,100,0,10,20,'captured','RMA-CAPTURE',now(),'[]') RETURNING id INTO order_id;
  INSERT INTO retail_order_lines(order_id,product_id,variant_id,product_sku,variant_sku,title_en,title_ar,title_zh,quantity,unit_amount_minor)
    VALUES(order_id,product_id,v_id,'RMA-P','RMA-V','Return variant','نسخة إرجاع','退货规格',2,50) RETURNING id INTO line_id;
  PERFORM retail_issue_customer_portal_token(order_id,token_hash,now()+interval '1 day');
  SELECT * INTO rma FROM retail_customer_create_return(token_hash,jsonb_build_array(jsonb_build_object('lineId',line_id,'quantity',2)),'Not suitable','', '40000000-0000-4000-8000-000000000002');
  IF rma.status<>'requested' THEN RAISE EXCEPTION 'RMA request was not created'; END IF;
  IF (SELECT refund_cap_minor FROM retail_returns WHERE public_id=rma.public_id)<>90 THEN RAISE EXCEPTION 'RMA cap did not allocate order discount and tax'; END IF;
  SELECT to_jsonb(x) INTO payload FROM retail_customer_list_returns(token_hash) x WHERE x.public_id=rma.public_id;
  IF payload ? 'admin_note' THEN RAISE EXCEPTION 'customer RMA list exposed admin_note'; END IF;
  BEGIN
    PERFORM * FROM retail_customer_create_return(token_hash,jsonb_build_array(jsonb_build_object('lineId',line_id,'quantity',1)),'Another','', '40000000-0000-4000-8000-000000000003');
    RAISE EXCEPTION 'historical return quantity bypassed entitlement';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%return quantity exceeds%' THEN RAISE; END IF; END;
  PERFORM * FROM retail_admin_transition_return(rma.public_id,'authorized','ok',false,'40000000-0000-4000-8000-000000000004','worker','Worker','warehouse',false);
  PERFORM * FROM retail_admin_transition_return(rma.public_id,'in_transit','',false,'40000000-0000-4000-8000-000000000005','worker','Worker','warehouse',false);
  PERFORM * FROM retail_admin_transition_return(rma.public_id,'received','',false,'40000000-0000-4000-8000-000000000006','worker','Worker','warehouse',false);
  PERFORM * FROM retail_admin_transition_return(rma.public_id,'inspected','',false,'40000000-0000-4000-8000-000000000007','worker','Worker','warehouse',false);
  BEGIN
    PERFORM * FROM retail_admin_transition_return(rma.public_id,'approved','',false,'40000000-0000-4000-8000-0000000000a7','finance','Finance','finance',false);
    RAISE EXCEPTION 'finance unexpectedly advanced a return';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%not permitted to manage returns%' THEN RAISE; END IF; END;
  BEGIN
    PERFORM * FROM retail_admin_transition_return(rma.public_id,'approved','',false,'40000000-0000-4000-8000-0000000000b7','viewer','Viewer','viewer',false);
    RAISE EXCEPTION 'viewer unexpectedly advanced a return';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%not permitted to manage returns%' THEN RAISE; END IF; END;
  BEGIN
    PERFORM * FROM retail_admin_transition_return(rma.public_id,'approved','sellable',true,'40000000-0000-4000-8000-0000000000c7','ops','Ops','operations',false);
    RAISE EXCEPTION 'operations unexpectedly restocked sellable inventory';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%not permitted to restock sellable inventory%' THEN RAISE; END IF; END;
  BEGIN
    PERFORM retail_admin_link_return_refund(rma.public_id,'40000000-0000-4000-8000-0000000000d7','40000000-0000-4000-8000-0000000000e7','finance','Finance','finance',false);
    RAISE EXCEPTION 'finance unexpectedly linked a return refund';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%not permitted to manage returns%' THEN RAISE; END IF; END;
  BEGIN
    PERFORM retail_admin_link_return_refund(rma.public_id,'40000000-0000-4000-8000-0000000000f7','40000000-0000-4000-8000-000000000107','worker','Worker','warehouse',false);
    RAISE EXCEPTION 'warehouse unexpectedly linked a return refund';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%not permitted to link return refunds%' THEN RAISE; END IF; END;
  PERFORM * FROM retail_admin_transition_return(rma.public_id,'approved','sellable',true,'40000000-0000-4000-8000-000000000008','worker','Worker','warehouse',false);
  BEGIN
    PERFORM * FROM retail_admin_list_returns(NULL,'finance','Finance','finance',false);
    RAISE EXCEPTION 'finance unexpectedly listed returns';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%not permitted to manage returns%' THEN RAISE; END IF; END;
  BEGIN
    PERFORM * FROM retail_admin_list_returns(NULL,'viewer','Viewer','viewer',false);
    RAISE EXCEPTION 'viewer unexpectedly listed returns';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%not permitted to manage returns%' THEN RAISE; END IF; END;
  SELECT to_jsonb(x) INTO payload FROM retail_admin_list_returns(NULL,'worker','Worker','warehouse',false) x WHERE x.public_id=rma.public_id;
  IF payload ? 'customer_note' OR payload ? 'admin_note' THEN RAISE EXCEPTION 'warehouse return list exposed notes'; END IF;
  BEGIN
    PERFORM retail_record_admin_return_notes_pii_view(rma.public_id,'worker','Worker','warehouse',false);
    RAISE EXCEPTION 'warehouse unexpectedly read return notes';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%not permitted to view return notes%' THEN RAISE; END IF; END;
  PERFORM retail_record_admin_return_notes_pii_view(rma.public_id,'owner','Owner','owner',false);
  SELECT * INTO note FROM retail_admin_get_return_notes(rma.public_id,'owner','Owner','owner',false);
  IF note.customer_note IS DISTINCT FROM '' THEN RAISE EXCEPTION 'owner note read failed'; END IF;
  IF NOT EXISTS(SELECT 1 FROM retail_admin_audit WHERE action='return.notes.pii.view' AND entity_id=rma.public_id::text AND actor_id='owner') THEN RAISE EXCEPTION 'return-note PII read was not audited'; END IF;
  INSERT INTO retail_refund_requests(id,idempotency_key,order_id,amount_minor,reason) VALUES(over_refund,'40000000-0000-4000-8000-0000000000e7',order_id,91,'over cap');
  BEGIN
    PERFORM retail_admin_link_return_refund(rma.public_id,over_refund,'40000000-0000-4000-8000-000000000108','ops','Ops','operations',false);
    RAISE EXCEPTION 'partial RMA linked an over-cap refund';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%refund amount exceeds return cap%' THEN RAISE; END IF; END;
  INSERT INTO retail_refund_requests(id,idempotency_key,order_id,amount_minor,reason) VALUES(exact_refund,'40000000-0000-4000-8000-000000000109',order_id,90,'exact cap');
  PERFORM retail_admin_link_return_refund(rma.public_id,exact_refund,'40000000-0000-4000-8000-000000000110','ops','Ops','operations',false);
  PERFORM retail_admin_link_return_refund(rma.public_id,exact_refund,'40000000-0000-4000-8000-000000000110','ops','Ops','operations',false);
  IF (SELECT refund_request_id FROM retail_returns WHERE public_id=rma.public_id)<>exact_refund THEN RAISE EXCEPTION 'exact cap refund did not link idempotently'; END IF;
  IF (SELECT status FROM retail_returns WHERE public_id=rma.public_id)<>'refund_pending' THEN RAISE EXCEPTION 'pending refund did not map RMA to refund_pending'; END IF;
  UPDATE retail_refund_requests SET status='completed',paypal_refund_id='RMA-EXACT-REFUND',completed_at=now() WHERE id=exact_refund;
  IF (SELECT status FROM retail_returns WHERE public_id=rma.public_id)<>'refunded' THEN RAISE EXCEPTION 'completed linked refund did not complete RMA'; END IF;
  IF (SELECT count(*) FROM retail_return_events WHERE return_id=(SELECT id FROM retail_returns WHERE public_id=rma.public_id) AND to_status='refunded')<>1 THEN RAISE EXCEPTION 'completed linked refund did not create exactly one RMA completion event'; END IF;
  SELECT b.on_hand INTO quantity_after FROM retail_variant_inventory_balances b WHERE b.variant_id=v_id;
  IF quantity_after<>6 THEN RAISE EXCEPTION 'sellable restock not applied exactly once: %',quantity_after; END IF;
  BEGIN
    PERFORM * FROM retail_admin_transition_return(rma.public_id,'refund_pending','',true,'40000000-0000-4000-8000-000000000009','worker','Worker','warehouse',false);
    RAISE EXCEPTION 'restock outside inspection approval unexpectedly worked';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%sellable restock requires%' AND SQLERRM NOT LIKE '%invalid return transition%' AND SQLERRM NOT LIKE '%refund lifecycle is driven by refund requests%' THEN RAISE; END IF; END;
  INSERT INTO retail_orders(paypal_order_id,client_request_id,currency,amount_minor,subtotal_minor,shipping_minor,tax_minor,discount_minor,status,capture_id,captured_at,items_snapshot)
    VALUES('RMA-FREE','40000000-0000-4000-8000-000000000111','USD',100,100,20,0,20,'captured','RMA-FREE-CAPTURE',now(),'[]') RETURNING id INTO free_order;
  INSERT INTO retail_order_lines(order_id,product_id,variant_id,product_sku,variant_sku,title_en,title_ar,title_zh,quantity,unit_amount_minor)
    VALUES(free_order,product_id,v_id,'RMA-P','RMA-V','Return variant','نسخة إرجاع','退货规格',2,50) RETURNING id INTO free_line;
  INSERT INTO retail_promotions(code,kind,amount) VALUES('FREERMA','free_shipping',0) RETURNING id INTO free_promotion;
  INSERT INTO retail_promotion_redemptions(promotion_id,order_id,request_id,customer_email,discount_minor,status,expires_at)
    VALUES(free_promotion,free_order,'40000000-0000-4000-8000-000000000112','rma@example.test',20,'committed',now()+interval '1 day');
  PERFORM retail_issue_customer_portal_token(free_order,repeat('c',64),now()+interval '1 day');
  SELECT * INTO free_rma FROM retail_customer_create_return(repeat('c',64),jsonb_build_array(jsonb_build_object('lineId',free_line,'quantity',1)),'Free shipping','', '40000000-0000-4000-8000-000000000113');
  IF (SELECT refund_cap_minor FROM retail_returns WHERE public_id=free_rma.public_id)<>50 OR NOT COALESCE((SELECT (refund_cap_calculation->>'freeShippingPromotion')::boolean FROM retail_returns WHERE public_id=free_rma.public_id),false) THEN RAISE EXCEPTION 'free shipping promotion reduced merchandise cap'; END IF;
  INSERT INTO retail_refund_requests(id,idempotency_key,order_id,amount_minor,reason) VALUES(cross_order_refund,'40000000-0000-4000-8000-000000000115',free_order,50,'other order');
  BEGIN
    PERFORM retail_admin_link_return_refund(rma.public_id,cross_order_refund,'40000000-0000-4000-8000-000000000116','ops','Ops','operations',false);
    RAISE EXCEPTION 'cross-order refund unexpectedly linked';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%refund request not found%' THEN RAISE; END IF; END;

  -- A failed/cancelled refund must never consume the RMA's one-to-one link.
  PERFORM * FROM retail_admin_transition_return(free_rma.public_id,'authorized','',false,'40000000-0000-4000-8000-000000000117','ops','Ops','operations',false);
  PERFORM * FROM retail_admin_transition_return(free_rma.public_id,'in_transit','',false,'40000000-0000-4000-8000-000000000118','ops','Ops','operations',false);
  PERFORM * FROM retail_admin_transition_return(free_rma.public_id,'received','',false,'40000000-0000-4000-8000-000000000119','ops','Ops','operations',false);
  PERFORM * FROM retail_admin_transition_return(free_rma.public_id,'inspected','',false,'40000000-0000-4000-8000-000000000120','ops','Ops','operations',false);
  PERFORM * FROM retail_admin_transition_return(free_rma.public_id,'approved','',false,'40000000-0000-4000-8000-000000000121','ops','Ops','operations',false);
  BEGIN
    PERFORM * FROM retail_admin_transition_return(free_rma.public_id,'refund_pending','',false,'40000000-0000-4000-8000-000000000131','ops','Ops','operations',false);
    RAISE EXCEPTION 'generic transition unexpectedly entered refund_pending';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%refund lifecycle is driven by refund requests%' THEN RAISE; END IF; END;
  BEGIN
    PERFORM * FROM retail_admin_transition_return(free_rma.public_id,'refunded','',false,'40000000-0000-4000-8000-000000000132','ops','Ops','operations',false);
    RAISE EXCEPTION 'generic transition unexpectedly entered refunded';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%refund lifecycle is driven by refund requests%' THEN RAISE; END IF; END;
  INSERT INTO retail_refund_requests(id,idempotency_key,order_id,amount_minor,reason,status)
    VALUES('40000000-0000-4000-8000-000000000122','40000000-0000-4000-8000-000000000123',free_order,50,'failed RMA refund','failed');
  BEGIN
    PERFORM retail_admin_link_return_refund(free_rma.public_id,'40000000-0000-4000-8000-000000000122','40000000-0000-4000-8000-000000000124','ops','Ops','operations',false);
    RAISE EXCEPTION 'failed refund unexpectedly linked';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%refund request status is not linkable: failed%' THEN RAISE; END IF; END;
  IF (SELECT refund_request_id FROM retail_returns WHERE public_id=free_rma.public_id) IS NOT NULL THEN RAISE EXCEPTION 'failed refund consumed unique RMA link'; END IF;
  INSERT INTO retail_refund_requests(id,idempotency_key,order_id,amount_minor,reason,status)
    VALUES('40000000-0000-4000-8000-000000000125','40000000-0000-4000-8000-000000000126',free_order,50,'cancelled RMA refund','cancelled');
  BEGIN
    PERFORM retail_admin_link_return_refund(free_rma.public_id,'40000000-0000-4000-8000-000000000125','40000000-0000-4000-8000-000000000127','ops','Ops','operations',false);
    RAISE EXCEPTION 'cancelled refund unexpectedly linked';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%refund request status is not linkable: cancelled%' THEN RAISE; END IF; END;
  IF (SELECT refund_request_id FROM retail_returns WHERE public_id=free_rma.public_id) IS NOT NULL THEN RAISE EXCEPTION 'cancelled refund consumed unique RMA link'; END IF;
  PERFORM * FROM retail_prepare_return_refund_as_actor(free_rma.public_id,50,'retryable RMA refund','40000000-0000-4000-8000-000000000134','ops','Ops','operations',false);
  IF (SELECT status FROM retail_returns WHERE public_id=free_rma.public_id)<>'refund_pending' THEN RAISE EXCEPTION 'pending linked refund did not enter refund_pending'; END IF;
  UPDATE retail_refund_requests SET status='failed',last_error='PayPal rejected refund' WHERE idempotency_key='40000000-0000-4000-8000-000000000134';
  IF (SELECT status FROM retail_returns WHERE public_id=free_rma.public_id)<>'approved' OR (SELECT refund_request_id FROM retail_returns WHERE public_id=free_rma.public_id) IS NOT NULL THEN RAISE EXCEPTION 'failed refund did not restore retryable approved RMA'; END IF;
  IF NOT EXISTS(SELECT 1 FROM retail_return_events WHERE return_id=(SELECT id FROM retail_returns WHERE public_id=free_rma.public_id) AND from_status='refund_pending' AND to_status='approved' AND detail->>'refundStatus'='failed') THEN RAISE EXCEPTION 'failed refund did not record RMA payment-fact event'; END IF;
  PERFORM * FROM retail_prepare_return_refund_as_actor(free_rma.public_id,50,'completed RMA refund','40000000-0000-4000-8000-000000000129','ops','Ops','operations',false);
  UPDATE retail_refund_requests SET status='completed',paypal_refund_id='RMA-DIRECT-COMPLETED',completed_at=now() WHERE idempotency_key='40000000-0000-4000-8000-000000000129';
  IF (SELECT status FROM retail_returns WHERE public_id=free_rma.public_id)<>'refunded' THEN RAISE EXCEPTION 'completed refund did not directly map RMA to refunded'; END IF;
  IF (SELECT count(*) FROM retail_return_events WHERE return_id=(SELECT id FROM retail_returns WHERE public_id=free_rma.public_id) AND to_status='refunded')<>1 THEN RAISE EXCEPTION 'completed refund replay generated contradictory RMA events'; END IF;
  IF NOT EXISTS(SELECT 1 FROM retail_admin_audit WHERE idempotency_key='40000000-0000-4000-8000-000000000129' AND detail->>'refundStatus'='completed' AND detail->>'paypalRefundId'='RMA-DIRECT-COMPLETED') THEN RAISE EXCEPTION 'completed refund did not finalize the RMA audit fact'; END IF;

  -- A scoped product promotion must follow the persisted order-line discount,
  -- never the old whole-order ratio.  The 100 discount across three units also
  -- exercises deterministic conservative partial-return rounding.
  INSERT INTO retail_orders(paypal_order_id,client_request_id,currency,amount_minor,subtotal_minor,shipping_minor,tax_minor,discount_minor,status,capture_id,captured_at,items_snapshot)
    VALUES('RMA-LINE-DISCOUNT','40000000-0000-4000-8000-000000000201','USD',344,403,0,41,100,'captured','RMA-LINE-DISCOUNT-CAPTURE',now(),'[]') RETURNING id INTO line_discount_order;
  INSERT INTO retail_order_lines(order_id,product_id,variant_id,product_sku,variant_sku,title_en,title_ar,title_zh,quantity,unit_amount_minor,discount_minor)
    VALUES(line_discount_order,product_id,v_id,'RMA-P','RMA-ELIGIBLE','Eligible variant','نسخة مؤهلة','优惠规格',3,101,100) RETURNING id INTO eligible_line;
  INSERT INTO retail_order_lines(order_id,product_id,variant_id,product_sku,variant_sku,title_en,title_ar,title_zh,quantity,unit_amount_minor,discount_minor)
    VALUES(line_discount_order,product_id,noneligible_v_id,'RMA-P','RMA-NONELIGIBLE','Other variant','نسخة أخرى','非优惠规格',1,100,0) RETURNING id INTO noneligible_line;
  PERFORM retail_issue_customer_portal_token(line_discount_order,repeat('d',64),now()+interval '1 day');
  SELECT * INTO noneligible_rma FROM retail_customer_create_return(repeat('d',64),jsonb_build_array(jsonb_build_object('lineId',noneligible_line,'quantity',1)),'Not discounted','', '40000000-0000-4000-8000-000000000202');
  IF (SELECT refund_cap_minor FROM retail_returns WHERE public_id=noneligible_rma.public_id)<>113
    OR (SELECT refund_cap_calculation->>'allocationSource' FROM retail_returns WHERE public_id=noneligible_rma.public_id)<>'order_lines' THEN RAISE EXCEPTION 'noneligible line used whole-order discount'; END IF;
  SELECT * INTO eligible_one_rma FROM retail_customer_create_return(repeat('d',64),jsonb_build_array(jsonb_build_object('lineId',eligible_line,'quantity',1)),'One discounted unit','', '40000000-0000-4000-8000-000000000203');
  IF (SELECT refund_cap_minor FROM retail_returns WHERE public_id=eligible_one_rma.public_id)<>76
    OR (SELECT (refund_cap_calculation->>'allocatedDiscountMinor')::BIGINT FROM retail_returns WHERE public_id=eligible_one_rma.public_id)<>34
    OR (SELECT (refund_cap_calculation->>'allocatedTaxMinor')::BIGINT FROM retail_returns WHERE public_id=eligible_one_rma.public_id)<>9 THEN RAISE EXCEPTION 'indivisible line discount partial cap was not conservative'; END IF;
  SELECT * INTO eligible_two_rma FROM retail_customer_create_return(repeat('d',64),jsonb_build_array(jsonb_build_object('lineId',eligible_line,'quantity',2)),'Remaining discounted units','', '40000000-0000-4000-8000-000000000204');
  IF (SELECT refund_cap_minor FROM retail_returns WHERE public_id=eligible_two_rma.public_id)<>153
    OR (SELECT sum((refund_cap_calculation->>'returnedSubtotalMinor')::BIGINT-(refund_cap_calculation->>'allocatedDiscountMinor')::BIGINT) FROM retail_returns WHERE public_id IN (eligible_one_rma.public_id,eligible_two_rma.public_id))>203 THEN RAISE EXCEPTION 'partial discounted returns exceeded line net'; END IF;
END $$;
ROLLBACK;
