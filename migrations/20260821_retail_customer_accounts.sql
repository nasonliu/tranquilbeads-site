-- Passwordless customer accounts.  Plaintext credentials never enter this
-- schema: browser bearer values are SHA-256 hashed before persistence.
CREATE TABLE IF NOT EXISTS retail_customer_login_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES retail_customers(id) ON DELETE CASCADE,
  token_sha256 CHAR(64) NOT NULL UNIQUE CHECK (token_sha256 ~ '^[0-9a-f]{64}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS retail_customer_login_tokens_customer_idx ON retail_customer_login_tokens(customer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS retail_customer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES retail_customers(id) ON DELETE CASCADE,
  session_sha256 CHAR(64) NOT NULL UNIQUE CHECK (session_sha256 ~ '^[0-9a-f]{64}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS retail_customer_sessions_customer_idx ON retail_customer_sessions(customer_id, created_at DESC);

-- Marketing permission is separate from transactional email and is recorded
-- only after a captured order.  A declined checkbox has no consent row.
ALTER TABLE retail_orders ADD COLUMN IF NOT EXISTS marketing_consent_requested BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE retail_orders ADD COLUMN IF NOT EXISTS marketing_consent_locale TEXT;
ALTER TABLE retail_orders ADD COLUMN IF NOT EXISTS marketing_consent_source TEXT;
ALTER TABLE retail_orders ADD COLUMN IF NOT EXISTS account_intent TEXT NOT NULL DEFAULT 'guest' CHECK (account_intent IN ('guest','create_or_access'));
ALTER TABLE retail_orders ADD COLUMN IF NOT EXISTS account_intent_recorded BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE retail_notification_outbox DROP CONSTRAINT IF EXISTS retail_notification_outbox_kind_check;
ALTER TABLE retail_notification_outbox ADD CONSTRAINT retail_notification_outbox_kind_check CHECK(kind IN ('order_confirmed','order_fulfilled','order_refunded','order_cancelled','payment_failed','checkout_expired','payment_attention','low_stock','account_access'));
CREATE TABLE IF NOT EXISTS retail_customer_marketing_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES retail_customers(id) ON DELETE CASCADE,
  order_id BIGINT NOT NULL REFERENCES retail_orders(id) ON DELETE RESTRICT,
  consented_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  withdrawn_at TIMESTAMPTZ,
  source TEXT NOT NULL CHECK (source IN ('checkout')),
  locale TEXT NOT NULL CHECK (locale IN ('en','ar','zh')),
  UNIQUE(order_id)
);
CREATE INDEX IF NOT EXISTS retail_customer_marketing_consents_customer_idx ON retail_customer_marketing_consents(customer_id, consented_at DESC);

CREATE OR REPLACE FUNCTION retail_set_checkout_marketing_intent(p_request UUID,p_consent BOOLEAN,p_locale TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE o retail_orders%ROWTYPE;
BEGIN
  IF p_locale NOT IN ('en','ar','zh') THEN RAISE EXCEPTION 'invalid marketing locale'; END IF;
  SELECT * INTO o FROM retail_orders WHERE client_request_id=p_request FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'checkout unavailable'; END IF;
  IF o.marketing_consent_source IS NOT NULL AND (o.marketing_consent_requested IS DISTINCT FROM COALESCE(p_consent,false) OR o.marketing_consent_locale IS DISTINCT FROM p_locale) THEN RAISE EXCEPTION 'idempotency conflict'; END IF;
  UPDATE retail_orders SET marketing_consent_requested=COALESCE(p_consent,false),marketing_consent_locale=p_locale,marketing_consent_source='checkout' WHERE id=o.id AND marketing_consent_source IS NULL;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION retail_set_checkout_account_intent(p_request UUID,p_intent TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE o retail_orders%ROWTYPE;
BEGIN
  IF p_intent NOT IN ('guest','create_or_access') THEN RAISE EXCEPTION 'invalid account intent'; END IF;
  SELECT * INTO o FROM retail_orders WHERE client_request_id=p_request FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'checkout unavailable'; END IF;
  IF o.account_intent_recorded AND o.account_intent IS DISTINCT FROM p_intent THEN RAISE EXCEPTION 'idempotency conflict'; END IF;
  UPDATE retail_orders SET account_intent=p_intent,account_intent_recorded=true WHERE id=o.id AND NOT o.account_intent_recorded;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION retail_record_customer_marketing_consent(p_paypal_order TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE target_order retail_orders%ROWTYPE; target_customer UUID;
BEGIN
  SELECT * INTO target_order FROM retail_orders WHERE paypal_order_id=p_paypal_order FOR UPDATE;
  IF NOT FOUND OR target_order.status<>'captured' OR NOT target_order.marketing_consent_requested THEN RETURN false; END IF;
  INSERT INTO retail_customers(email,name) VALUES(lower(target_order.checkout_email),'Retail customer') ON CONFLICT(email) DO NOTHING;
  SELECT id INTO target_customer FROM retail_customers WHERE email=lower(target_order.checkout_email) FOR UPDATE;
  INSERT INTO retail_customer_marketing_consents(customer_id,order_id,source,locale)
    VALUES(target_customer,target_order.id,COALESCE(target_order.marketing_consent_source,'checkout'),COALESCE(target_order.marketing_consent_locale,'en'))
    ON CONFLICT(order_id) DO NOTHING;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION retail_queue_customer_account_access(p_paypal_order TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE target_order retail_orders%ROWTYPE;
BEGIN
  SELECT * INTO target_order FROM retail_orders WHERE paypal_order_id=p_paypal_order FOR UPDATE;
  IF NOT FOUND OR target_order.status<>'captured' OR target_order.account_intent<>'create_or_access' OR target_order.checkout_email IS NULL THEN RETURN false; END IF;
  -- The checkout address is the account identity. PayPal can return a
  -- different payer email, so create the checkout customer before queuing the
  -- access email rather than silently dropping an explicit account request.
  INSERT INTO retail_customers(email,name) VALUES(lower(target_order.checkout_email),'Retail customer') ON CONFLICT(email) DO NOTHING;
  INSERT INTO retail_notification_outbox(order_id,kind,recipient,payload,idempotency_key)
    VALUES(target_order.id,'account_access',target_order.checkout_email,jsonb_build_object('locale',COALESCE(target_order.checkout_locale,'en')),'account-access:'||target_order.id)
    ON CONFLICT(idempotency_key) DO NOTHING;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION retail_finalize_customer_post_capture(p_paypal_order TEXT) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
BEGIN
  PERFORM retail_record_customer_marketing_consent(p_paypal_order);
  PERFORM retail_queue_customer_account_access(p_paypal_order);
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION retail_issue_customer_login_token(p_email TEXT,p_token_sha256 TEXT,p_expires_at TIMESTAMPTZ)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE target UUID;
BEGIN
  IF p_token_sha256 !~ '^[0-9a-f]{64}$' OR p_expires_at IS NULL OR p_expires_at<=now() THEN RAISE EXCEPTION 'invalid customer login token'; END IF;
  SELECT id INTO target FROM retail_customers WHERE email=lower(trim(p_email)) FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE retail_customer_login_tokens SET revoked_at=now() WHERE customer_id=target AND used_at IS NULL AND revoked_at IS NULL;
  INSERT INTO retail_customer_login_tokens(customer_id,token_sha256,expires_at) VALUES(target,p_token_sha256,p_expires_at);
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION retail_issue_notification_customer_login_token(p_email TEXT,p_notification UUID,p_token_sha256 TEXT,p_expires_at TIMESTAMPTZ)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE target UUID;
BEGIN
  IF p_token_sha256 !~ '^[0-9a-f]{64}$' OR p_expires_at IS NULL OR p_expires_at<=now() THEN RAISE EXCEPTION 'invalid customer login token'; END IF;
  SELECT id INTO target FROM retail_customers WHERE email=lower(trim(p_email)) FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  -- A Resend retry keeps the same deterministic bearer, but refreshes the
  -- short expiry while the link remains unused. A consumed or revoked link is
  -- never silently reactivated.
  UPDATE retail_customer_login_tokens
  SET expires_at=GREATEST(expires_at,p_expires_at)
  WHERE token_sha256=p_token_sha256 AND used_at IS NULL AND revoked_at IS NULL;
  IF FOUND THEN RETURN true; END IF;
  IF EXISTS(SELECT 1 FROM retail_customer_login_tokens WHERE token_sha256=p_token_sha256) THEN RETURN false; END IF;
  UPDATE retail_customer_login_tokens SET revoked_at=now() WHERE customer_id=target AND used_at IS NULL AND revoked_at IS NULL;
  INSERT INTO retail_customer_login_tokens(customer_id,token_sha256,expires_at) VALUES(target,p_token_sha256,p_expires_at);
  RETURN true;
END $$;

-- Claiming the link and minting the session are one transaction, so a link is
-- single-use even under concurrent browser requests.
CREATE OR REPLACE FUNCTION retail_redeem_customer_login_token(p_token_sha256 TEXT,p_session_sha256 TEXT,p_session_expires_at TIMESTAMPTZ)
RETURNS TABLE(customer_public_id UUID,email TEXT,name TEXT) LANGUAGE plpgsql AS $$
BEGIN
  IF p_token_sha256 !~ '^[0-9a-f]{64}$' OR p_session_sha256 !~ '^[0-9a-f]{64}$' OR p_session_expires_at IS NULL OR p_session_expires_at<=now() THEN RETURN; END IF;
  RETURN QUERY WITH claimed AS (
    UPDATE retail_customer_login_tokens t SET used_at=now()
    WHERE t.token_sha256=p_token_sha256 AND t.used_at IS NULL AND t.revoked_at IS NULL AND t.expires_at>now()
    RETURNING t.customer_id
  ), created AS (
    INSERT INTO retail_customer_sessions(customer_id,session_sha256,expires_at)
    SELECT customer_id,p_session_sha256,p_session_expires_at FROM claimed RETURNING customer_id
  ) SELECT c.public_id,c.email,c.name FROM retail_customers c JOIN created s ON s.customer_id=c.id;
END $$;

CREATE OR REPLACE FUNCTION retail_revoke_customer_session(p_session_sha256 TEXT) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
BEGIN
  IF p_session_sha256 !~ '^[0-9a-f]{64}$' THEN RETURN false; END IF;
  UPDATE retail_customer_sessions SET revoked_at=COALESCE(revoked_at,now()) WHERE session_sha256=p_session_sha256 AND revoked_at IS NULL;
  RETURN FOUND;
END $$;

CREATE OR REPLACE FUNCTION retail_withdraw_customer_marketing_consent(p_session_sha256 TEXT)
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE affected INTEGER;
BEGIN
  IF p_session_sha256 !~ '^[0-9a-f]{64}$' THEN RETURN 0; END IF;
  WITH active AS (
    SELECT customer_id FROM retail_customer_sessions
    WHERE session_sha256=p_session_sha256 AND revoked_at IS NULL AND expires_at>now()
  )
  UPDATE retail_customer_marketing_consents consent
  SET withdrawn_at=COALESCE(consent.withdrawn_at,now())
  FROM active
  WHERE consent.customer_id=active.customer_id AND consent.withdrawn_at IS NULL;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END $$;

CREATE OR REPLACE FUNCTION retail_customer_account(p_session_sha256 TEXT)
RETURNS TABLE(customer_public_id UUID,email TEXT,name TEXT,orders JSONB,addresses JSONB,marketing_consent_active BOOLEAN) LANGUAGE plpgsql AS $$
BEGIN
  IF p_session_sha256 !~ '^[0-9a-f]{64}$' THEN RETURN; END IF;
  RETURN QUERY WITH active AS (
    UPDATE retail_customer_sessions s SET last_used_at=now()
    WHERE s.session_sha256=p_session_sha256 AND s.revoked_at IS NULL AND s.expires_at>now() RETURNING s.customer_id
  ) SELECT c.public_id,c.email,c.name,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('publicId',o.public_id,'status',o.status,'fulfilmentStatus',o.fulfilment_status,'currency',o.currency,'amountMinor',o.amount_minor,'orderedAt',o.created_at,'carrier',o.carrier,'trackingNumber',o.tracking_number) ORDER BY o.created_at DESC)
      FROM retail_orders o LEFT JOIN retail_order_snapshots snap ON snap.order_id=o.paypal_order_id
      WHERE lower(COALESCE(o.checkout_email,snap.customer_snapshot->>'email',''))=c.email), '[]'::jsonb),
    COALESCE((SELECT jsonb_agg(jsonb_build_object('id',a.id,'recipient',a.recipient,'line1',a.line1,'line2',a.line2,'city',a.city,'region',a.region,'postalCode',a.postal_code,'country',a.country,'phone',a.phone,'isDefault',a.is_default) ORDER BY a.is_default DESC,a.created_at DESC) FROM retail_addresses a WHERE a.customer_id=c.id AND a.archived_at IS NULL), '[]'::jsonb),
    EXISTS(SELECT 1 FROM retail_customer_marketing_consents consent WHERE consent.customer_id=c.id AND consent.withdrawn_at IS NULL)
  FROM retail_customers c JOIN active a ON a.customer_id=c.id;
END $$;
