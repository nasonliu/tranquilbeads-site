-- PayPal reporting exports are evidence for reconciliation only.  They must
-- never create, capture, refund, reverse, or otherwise alter an order.
CREATE TABLE IF NOT EXISTS retail_paypal_settlement_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_sha256 CHAR(64) NOT NULL UNIQUE CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
  source_format TEXT NOT NULL CHECK (source_format IN ('csv','json')),
  source_name TEXT NOT NULL CHECK (length(source_name) BETWEEN 1 AND 160),
  row_count INTEGER NOT NULL CHECK (row_count >= 0 AND row_count <= 10000),
  imported_by TEXT NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  closed_by TEXT,
  close_note TEXT
);
CREATE TABLE IF NOT EXISTS retail_paypal_payouts (
  paypal_payout_id TEXT PRIMARY KEY CHECK (paypal_payout_id ~ '^[A-Za-z0-9_-]{1,127}$'),
  status TEXT NOT NULL CHECK (length(status) <= 80),
  currency CHAR(3) NOT NULL CHECK (currency='USD'),
  amount_minor BIGINT,
  occurred_at TIMESTAMPTZ,
  first_import_id UUID NOT NULL REFERENCES retail_paypal_settlement_imports(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS retail_paypal_settlement_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paypal_transaction_id TEXT NOT NULL UNIQUE CHECK (paypal_transaction_id ~ '^[A-Za-z0-9_-]{1,127}$'),
  first_import_id UUID NOT NULL REFERENCES retail_paypal_settlement_imports(id),
  transaction_type TEXT NOT NULL CHECK (length(transaction_type) BETWEEN 1 AND 80),
  transaction_status TEXT NOT NULL CHECK (length(transaction_status) BETWEEN 1 AND 80),
  currency CHAR(3) NOT NULL CHECK (currency='USD'),
  gross_minor BIGINT,
  fee_minor BIGINT,
  net_minor BIGINT,
  related_capture_id TEXT CHECK (related_capture_id IS NULL OR related_capture_id ~ '^[A-Za-z0-9_-]{1,127}$'),
  payout_id TEXT REFERENCES retail_paypal_payouts(paypal_payout_id),
  payout_item_id TEXT CHECK (payout_item_id IS NULL OR payout_item_id ~ '^[A-Za-z0-9_-]{1,127}$'),
  occurred_at TIMESTAMPTZ,
  normalized_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT retail_paypal_settlement_amounts CHECK (
    gross_minor IS NOT NULL OR fee_minor IS NOT NULL OR net_minor IS NOT NULL
  ),
  CONSTRAINT retail_paypal_settlement_net CHECK (
    gross_minor IS NULL OR fee_minor IS NULL OR net_minor IS NULL OR gross_minor + fee_minor = net_minor
  )
);
CREATE TABLE IF NOT EXISTS retail_paypal_payout_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paypal_payout_id TEXT NOT NULL REFERENCES retail_paypal_payouts(paypal_payout_id),
  settlement_transaction_id UUID NOT NULL UNIQUE REFERENCES retail_paypal_settlement_transactions(id),
  paypal_payout_item_id TEXT CHECK (paypal_payout_item_id IS NULL OR paypal_payout_item_id ~ '^[A-Za-z0-9_-]{1,127}$'),
  amount_minor BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(paypal_payout_id,paypal_payout_item_id)
);
CREATE TABLE IF NOT EXISTS retail_paypal_settlement_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_transaction_id UUID NOT NULL REFERENCES retail_paypal_settlement_transactions(id),
  ledger_id UUID NOT NULL REFERENCES retail_payment_ledger(id),
  match_kind TEXT NOT NULL CHECK (match_kind IN ('gross','fee','refund')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(settlement_transaction_id,ledger_id),
  UNIQUE(ledger_id,match_kind)
);
CREATE TABLE IF NOT EXISTS retail_paypal_settlement_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES retail_paypal_settlement_imports(id),
  settlement_transaction_id UUID REFERENCES retail_paypal_settlement_transactions(id),
  code TEXT NOT NULL CHECK (code IN ('unmatched_transaction','amount_mismatch','duplicate_transaction','invalid_reference')),
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  state TEXT NOT NULL DEFAULT 'open' CHECK (state IN ('open','closed')),
  closed_at TIMESTAMPTZ,
  closed_by TEXT,
  close_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(import_id,settlement_transaction_id,code)
);
CREATE INDEX IF NOT EXISTS retail_paypal_settlement_exceptions_open_idx ON retail_paypal_settlement_exceptions(state,created_at DESC);

CREATE OR REPLACE FUNCTION retail_import_paypal_settlement_as_actor(
  p_hash TEXT,p_format TEXT,p_name TEXT,p_rows JSONB,p_key UUID,
  p_actor_id TEXT,p_actor_name TEXT,p_actor_role TEXT,p_legacy BOOLEAN
) RETURNS TABLE(import_id UUID,replayed BOOLEAN,matched_count INTEGER,exception_count INTEGER) LANGUAGE plpgsql AS $$
DECLARE existing retail_paypal_settlement_imports%ROWTYPE; row JSONB; tx_id UUID; candidate UUID; matched INTEGER:=0; exceptions INTEGER:=0; import_row UUID;
BEGIN
  IF p_hash !~ '^[0-9a-f]{64}$' OR p_format NOT IN ('csv','json') OR COALESCE(btrim(p_name),'')='' OR jsonb_typeof(p_rows)<>'array' OR jsonb_array_length(p_rows)>10000 THEN RAISE EXCEPTION 'invalid settlement import'; END IF;
  IF COALESCE(btrim(p_actor_id),'')='' OR COALESCE(btrim(p_actor_name),'')='' OR p_actor_role NOT IN ('owner','operations','warehouse','finance','viewer') OR p_legacy IS NULL THEN RAISE EXCEPTION 'invalid admin actor'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('paypal-settlement:'||p_hash,0));
  SELECT * INTO existing FROM retail_paypal_settlement_imports WHERE content_sha256=p_hash FOR UPDATE;
  IF FOUND THEN
    PERFORM retail_attribute_admin_audit(p_key,'paypal.settlement.import','paypal_settlement_import',existing.id::text,jsonb_build_object('sha256',p_hash,'rows',existing.row_count,'replayed',true),p_actor_id,p_actor_name,p_actor_role,p_legacy);
    RETURN QUERY SELECT existing.id,true,0,0; RETURN;
  END IF;
  INSERT INTO retail_paypal_settlement_imports(content_sha256,source_format,source_name,row_count,imported_by)
    VALUES(p_hash,p_format,p_name,jsonb_array_length(p_rows),p_actor_id) RETURNING id INTO import_row;
  FOR row IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
    IF jsonb_typeof(row)<>'object' OR COALESCE(row->>'transactionId','') !~ '^[A-Za-z0-9_-]{1,127}$' OR COALESCE(row->>'transactionType','')='' OR COALESCE(row->>'transactionStatus','')='' OR COALESCE(row->>'currency','')<>'USD' THEN RAISE EXCEPTION 'invalid normalized settlement row'; END IF;
    IF NULLIF(row->>'payoutId','') IS NOT NULL THEN
      INSERT INTO retail_paypal_payouts(paypal_payout_id,status,currency,amount_minor,occurred_at,first_import_id)
        VALUES(row->>'payoutId',COALESCE(NULLIF(row->>'transactionStatus',''),'reported'),'USD',NULLIF(row->>'netMinor','')::BIGINT,NULLIF(row->>'occurredAt','')::timestamptz,import_row)
        ON CONFLICT(paypal_payout_id) DO NOTHING;
    END IF;
    BEGIN
      INSERT INTO retail_paypal_settlement_transactions(paypal_transaction_id,first_import_id,transaction_type,transaction_status,currency,gross_minor,fee_minor,net_minor,related_capture_id,payout_id,payout_item_id,occurred_at,normalized_payload)
      VALUES(row->>'transactionId',import_row,left(row->>'transactionType',80),left(row->>'transactionStatus',80),'USD',
        NULLIF(row->>'grossMinor','')::BIGINT,NULLIF(row->>'feeMinor','')::BIGINT,NULLIF(row->>'netMinor','')::BIGINT,
        NULLIF(row->>'relatedCaptureId',''),NULLIF(row->>'payoutId',''),NULLIF(row->>'payoutItemId',''),NULLIF(row->>'occurredAt','')::timestamptz,
        jsonb_build_object('transactionId',row->>'transactionId','transactionType',row->>'transactionType','transactionStatus',row->>'transactionStatus','currency','USD','grossMinor',row->'grossMinor','feeMinor',row->'feeMinor','netMinor',row->'netMinor','relatedCaptureId',row->'relatedCaptureId','payoutId',row->'payoutId','payoutItemId',row->'payoutItemId','occurredAt',row->'occurredAt'))
      RETURNING id INTO tx_id;
    EXCEPTION WHEN unique_violation THEN
      INSERT INTO retail_paypal_settlement_exceptions(import_id,code,detail) VALUES(import_row,'duplicate_transaction',jsonb_build_object('transactionId',row->>'transactionId')) ON CONFLICT DO NOTHING;
      exceptions:=exceptions+1; CONTINUE;
    END;
    IF NULLIF(row->>'payoutId','') IS NOT NULL THEN
      INSERT INTO retail_paypal_payout_items(paypal_payout_id,settlement_transaction_id,paypal_payout_item_id,amount_minor)
        VALUES(row->>'payoutId',tx_id,NULLIF(row->>'payoutItemId',''),NULLIF(row->>'netMinor','')::BIGINT) ON CONFLICT DO NOTHING;
    END IF;
    candidate:=NULL;
    IF NULLIF(row->>'relatedCaptureId','') IS NOT NULL AND NULLIF(row->>'grossMinor','') IS NOT NULL THEN
      SELECT l.id INTO candidate FROM retail_payment_ledger l WHERE l.paypal_reference=row->>'relatedCaptureId' AND l.kind='payment' AND l.currency='USD' AND l.amount_minor=(row->>'grossMinor')::BIGINT LIMIT 1;
      IF candidate IS NOT NULL THEN INSERT INTO retail_paypal_settlement_matches(settlement_transaction_id,ledger_id,match_kind) VALUES(tx_id,candidate,'gross') ON CONFLICT DO NOTHING; UPDATE retail_payment_ledger SET reconciliation_status='reconciled' WHERE id=candidate AND reconciliation_status='pending'; matched:=matched+1; END IF;
    ELSIF NULLIF(row->>'transactionId','') IS NOT NULL AND NULLIF(row->>'grossMinor','') IS NOT NULL THEN
      SELECT l.id INTO candidate FROM retail_payment_ledger l WHERE l.paypal_reference=row->>'transactionId' AND l.kind='refund' AND l.currency='USD' AND l.amount_minor=(row->>'grossMinor')::BIGINT LIMIT 1;
      IF candidate IS NOT NULL THEN INSERT INTO retail_paypal_settlement_matches(settlement_transaction_id,ledger_id,match_kind) VALUES(tx_id,candidate,'refund') ON CONFLICT DO NOTHING; UPDATE retail_payment_ledger SET reconciliation_status='reconciled' WHERE id=candidate AND reconciliation_status='pending'; matched:=matched+1; END IF;
    END IF;
    IF NULLIF(row->>'relatedCaptureId','') IS NOT NULL AND NULLIF(row->>'feeMinor','') IS NOT NULL THEN
      SELECT l.id INTO candidate FROM retail_payment_ledger l WHERE l.paypal_reference='fee:'||(row->>'relatedCaptureId') AND l.kind='fee' AND l.currency='USD' AND l.amount_minor=(row->>'feeMinor')::BIGINT LIMIT 1;
      IF candidate IS NOT NULL THEN INSERT INTO retail_paypal_settlement_matches(settlement_transaction_id,ledger_id,match_kind) VALUES(tx_id,candidate,'fee') ON CONFLICT DO NOTHING; UPDATE retail_payment_ledger SET reconciliation_status='reconciled' WHERE id=candidate AND reconciliation_status='pending'; matched:=matched+1; END IF;
    END IF;
    IF NOT EXISTS(SELECT 1 FROM retail_paypal_settlement_matches WHERE settlement_transaction_id=tx_id) THEN
      INSERT INTO retail_paypal_settlement_exceptions(import_id,settlement_transaction_id,code,detail) VALUES(import_row,tx_id,'unmatched_transaction',jsonb_build_object('transactionId',row->>'transactionId','relatedCaptureId',row->'relatedCaptureId')) ON CONFLICT DO NOTHING; exceptions:=exceptions+1;
    END IF;
  END LOOP;
  PERFORM retail_attribute_admin_audit(p_key,'paypal.settlement.import','paypal_settlement_import',import_row::text,jsonb_build_object('sha256',p_hash,'rows',jsonb_array_length(p_rows),'replayed',false),p_actor_id,p_actor_name,p_actor_role,p_legacy);
  RETURN QUERY SELECT import_row,false,matched,exceptions;
END $$;

CREATE OR REPLACE FUNCTION retail_close_paypal_settlement_exception_as_actor(
  p_exception UUID,p_note TEXT,p_key UUID,p_actor_id TEXT,p_actor_name TEXT,p_actor_role TEXT,p_legacy BOOLEAN
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE prior retail_paypal_settlement_exceptions%ROWTYPE;
BEGIN
  SELECT * INTO prior FROM retail_paypal_settlement_exceptions WHERE id=p_exception FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'settlement exception not found'; END IF;
  IF prior.state='open' THEN UPDATE retail_paypal_settlement_exceptions SET state='closed',closed_at=now(),closed_by=p_actor_id,close_note=p_note WHERE id=p_exception; END IF;
  PERFORM retail_attribute_admin_audit(p_key,'paypal.settlement.exception.close','paypal_settlement_exception',p_exception::text,jsonb_build_object('note',p_note),p_actor_id,p_actor_name,p_actor_role,p_legacy);
  RETURN true;
END $$;
