\set ON_ERROR_STOP on
BEGIN;
DO $$
DECLARE v_order_id BIGINT; import_row RECORD; observed BIGINT; exception_id UUID;
BEGIN
  INSERT INTO retail_orders(paypal_order_id,client_request_id,currency,amount_minor,subtotal_minor,status,capture_id,captured_at,items_snapshot)
    VALUES('SETTLEMENT-ORDER','40000000-0000-4000-8000-000000000001','USD',1000,1000,'captured','SETTLEMENT-CAPTURE',now(),'[]') RETURNING id INTO v_order_id;
  INSERT INTO retail_payment_ledger(order_id,kind,amount_minor,currency,paypal_reference,idempotency_key) VALUES
    (v_order_id,'payment',1000,'USD','SETTLEMENT-CAPTURE','40000000-0000-4000-8000-000000000002'),
    (v_order_id,'fee',-59,'USD','fee:SETTLEMENT-CAPTURE','40000000-0000-4000-8000-000000000003');
  SELECT * INTO import_row FROM retail_import_paypal_settlement_as_actor(
    repeat('a',64),'json','paypal-settlement.json','[{"transactionId":"SETTLEMENT-TX","transactionType":"Payment","transactionStatus":"Completed","currency":"USD","grossMinor":1000,"feeMinor":-59,"netMinor":941,"relatedCaptureId":"SETTLEMENT-CAPTURE","payoutId":"SETTLEMENT-PAYOUT","payoutItemId":"SETTLEMENT-ITEM","occurredAt":"2026-08-02T00:00:00.000Z"}]'::jsonb,
    '40000000-0000-4000-8000-000000000004','finance-1','Finance','finance',false);
  IF import_row.replayed OR import_row.matched_count<>2 OR import_row.exception_count<>0 THEN RAISE EXCEPTION 'settlement import did not match gross and fee'; END IF;
  SELECT count(*) INTO observed FROM retail_paypal_settlement_transactions t WHERE t.first_import_id=import_row.import_id AND NOT (t.normalized_payload ?| ARRAY['email','customer','shipping','raw_payload']); IF observed<>1 THEN RAISE EXCEPTION 'normalized settlement transaction is missing or contains non-allowlisted sensitive fields'; END IF;
  SELECT count(*) INTO observed FROM retail_paypal_payouts p WHERE p.first_import_id=import_row.import_id; IF observed<>1 THEN RAISE EXCEPTION 'settlement payout was not recorded'; END IF;
  SELECT count(*) INTO observed FROM retail_paypal_payout_items i JOIN retail_paypal_settlement_transactions t ON t.id=i.settlement_transaction_id WHERE t.first_import_id=import_row.import_id; IF observed<>1 THEN RAISE EXCEPTION 'settlement payout item was not recorded'; END IF;
  SELECT count(*) INTO observed FROM retail_paypal_settlement_matches m JOIN retail_paypal_settlement_transactions t ON t.id=m.settlement_transaction_id WHERE t.first_import_id=import_row.import_id; IF observed<>2 THEN RAISE EXCEPTION 'settlement match details were not recorded'; END IF;
  SELECT count(*) INTO observed FROM retail_payment_ledger l WHERE l.order_id=v_order_id AND l.reconciliation_status='reconciled'; IF observed<>2 THEN RAISE EXCEPTION 'settlement did not reconcile only matching ledger entries'; END IF;
  SELECT count(*) INTO observed FROM retail_orders WHERE id=v_order_id AND status='captured' AND capture_id='SETTLEMENT-CAPTURE'; IF observed<>1 THEN RAISE EXCEPTION 'settlement modified payment truth'; END IF;
  SELECT * INTO import_row FROM retail_import_paypal_settlement_as_actor(repeat('a',64),'json','copy.json','[]'::jsonb,'40000000-0000-4000-8000-000000000005','finance-1','Finance','finance',false);
  IF NOT import_row.replayed THEN RAISE EXCEPTION 'file hash retry was not idempotent'; END IF;
  SELECT * INTO import_row FROM retail_import_paypal_settlement_as_actor(repeat('b',64),'json','unmatched.json','[{"transactionId":"UNMATCHED-TX","transactionType":"Payment","transactionStatus":"Completed","currency":"USD","grossMinor":1}]'::jsonb,'40000000-0000-4000-8000-000000000006','finance-1','Finance','finance',false);
  SELECT id INTO exception_id FROM retail_paypal_settlement_exceptions WHERE import_id=import_row.import_id AND state='open';
  PERFORM retail_close_paypal_settlement_exception_as_actor(exception_id,'Verified outside PayPal report','40000000-0000-4000-8000-000000000007','finance-1','Finance','finance',false);
  SELECT count(*) INTO observed FROM retail_paypal_settlement_exceptions WHERE id=exception_id AND state='closed' AND closed_by='finance-1'; IF observed<>1 THEN RAISE EXCEPTION 'exception close failed'; END IF;
END $$;
ROLLBACK;
