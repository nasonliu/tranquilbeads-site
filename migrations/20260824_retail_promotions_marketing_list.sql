-- Customer promotions and a consent-backed marketing list. Transactional
-- order email remains independent from this list.
ALTER TABLE retail_promotions
  ADD COLUMN IF NOT EXISTS automatic BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS retail_promotions_automatic_schedule_idx
  ON retail_promotions(automatic,active,starts_at,ends_at)
  WHERE automatic=true;

CREATE TABLE IF NOT EXISTS retail_marketing_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE CHECK(email=lower(trim(email)) AND email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  locale TEXT NOT NULL CHECK(locale IN ('en','ar','zh')),
  source TEXT NOT NULL CHECK(source IN ('checkout','storefront','admin')),
  status TEXT NOT NULL CHECK(status IN ('pending','active','unsubscribed','suppressed')),
  consented_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK((status='active' AND unsubscribed_at IS NULL) OR status<>'active')
);
CREATE INDEX IF NOT EXISTS retail_marketing_subscribers_status_created_idx
  ON retail_marketing_subscribers(status,consented_at DESC);

CREATE TABLE IF NOT EXISTS retail_marketing_confirmation_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES retail_marketing_subscribers(id) ON DELETE CASCADE,
  token_sha256 TEXT NOT NULL UNIQUE CHECK(token_sha256 ~ '^[0-9a-f]{64}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS retail_marketing_confirmation_tokens_subscriber_idx
  ON retail_marketing_confirmation_tokens(subscriber_id,created_at DESC);

CREATE OR REPLACE FUNCTION retail_subscribe_marketing(p_email TEXT,p_locale TEXT,p_source TEXT)
RETURNS TABLE(public_id UUID,status TEXT) LANGUAGE plpgsql AS $$
DECLARE normalized_email TEXT:=lower(trim(COALESCE(p_email,''))); subscriber retail_marketing_subscribers%ROWTYPE;
BEGIN
  IF normalized_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' OR p_locale NOT IN ('en','ar','zh') OR p_source NOT IN ('checkout','storefront','admin') THEN
    RAISE EXCEPTION 'invalid marketing subscription';
  END IF;
  SELECT * INTO subscriber FROM retail_marketing_subscribers s WHERE s.email=normalized_email FOR UPDATE;
  IF FOUND THEN
    -- A provider or administrator suppression cannot be bypassed by a public
    -- form. An ordinary unsubscribe may explicitly subscribe again.
    IF subscriber.status<>'suppressed' THEN
      UPDATE retail_marketing_subscribers s SET status='active',locale=p_locale,source=p_source,
        consented_at=now(),unsubscribed_at=NULL,updated_at=now() WHERE s.id=subscriber.id
        RETURNING s.* INTO subscriber;
    END IF;
  ELSE
    INSERT INTO retail_marketing_subscribers(email,locale,source,status,consented_at)
      VALUES(normalized_email,p_locale,p_source,'active',now()) RETURNING * INTO subscriber;
  END IF;
  RETURN QUERY SELECT subscriber.public_id,subscriber.status;
END $$;

-- Standalone storefront signups use double opt-in. Only the SHA-256 digest is
-- persisted; the bearer token exists only long enough to build the email.
CREATE OR REPLACE FUNCTION retail_request_marketing_subscription(
  p_email TEXT,p_locale TEXT,p_token_sha256 TEXT,p_expires_at TIMESTAMPTZ
) RETURNS TABLE(public_id UUID,status TEXT,should_send BOOLEAN) LANGUAGE plpgsql AS $$
DECLARE normalized_email TEXT:=lower(trim(COALESCE(p_email,''))); subscriber retail_marketing_subscribers%ROWTYPE;
BEGIN
  IF normalized_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' OR p_locale NOT IN ('en','ar')
    OR p_token_sha256 !~ '^[0-9a-f]{64}$' OR p_expires_at<=now() THEN
    RAISE EXCEPTION 'invalid marketing subscription request';
  END IF;
  SELECT * INTO subscriber FROM retail_marketing_subscribers s WHERE s.email=normalized_email FOR UPDATE;
  IF FOUND AND subscriber.status IN ('active','suppressed') THEN
    RETURN QUERY SELECT subscriber.public_id,subscriber.status,false; RETURN;
  ELSIF FOUND THEN
    UPDATE retail_marketing_subscribers s SET status='pending',locale=p_locale,source='storefront',
      consented_at=NULL,unsubscribed_at=NULL,updated_at=now() WHERE s.id=subscriber.id RETURNING s.* INTO subscriber;
  ELSE
    INSERT INTO retail_marketing_subscribers(email,locale,source,status,consented_at)
      VALUES(normalized_email,p_locale,'storefront','pending',NULL) RETURNING * INTO subscriber;
  END IF;
  UPDATE retail_marketing_confirmation_tokens SET revoked_at=now()
    WHERE subscriber_id=subscriber.id AND used_at IS NULL AND revoked_at IS NULL;
  INSERT INTO retail_marketing_confirmation_tokens(subscriber_id,token_sha256,expires_at)
    VALUES(subscriber.id,p_token_sha256,p_expires_at);
  RETURN QUERY SELECT subscriber.public_id,subscriber.status,true;
END $$;

CREATE OR REPLACE FUNCTION retail_confirm_marketing_subscription(p_token_sha256 TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE target_subscriber UUID; activated INTEGER;
BEGIN
  IF p_token_sha256 !~ '^[0-9a-f]{64}$' THEN RETURN false; END IF;
  UPDATE retail_marketing_confirmation_tokens SET used_at=now()
    WHERE token_sha256=p_token_sha256 AND used_at IS NULL AND revoked_at IS NULL AND expires_at>now()
    RETURNING subscriber_id INTO target_subscriber;
  IF target_subscriber IS NULL THEN RETURN false; END IF;
  UPDATE retail_marketing_subscribers SET status='active',consented_at=now(),unsubscribed_at=NULL,updated_at=now()
    WHERE id=target_subscriber AND status='pending';
  GET DIAGNOSTICS activated = ROW_COUNT;
  UPDATE retail_marketing_confirmation_tokens SET revoked_at=now()
    WHERE subscriber_id=target_subscriber AND used_at IS NULL AND revoked_at IS NULL;
  RETURN activated=1;
END $$;

CREATE OR REPLACE FUNCTION retail_unsubscribe_marketing(p_public_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE subscriber retail_marketing_subscribers%ROWTYPE;
BEGIN
  SELECT * INTO subscriber FROM retail_marketing_subscribers s WHERE s.public_id=p_public_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE retail_marketing_subscribers SET status='unsubscribed',unsubscribed_at=COALESCE(unsubscribed_at,now()),updated_at=now()
    WHERE id=subscriber.id AND status<>'suppressed';
  UPDATE retail_customer_marketing_consents consent SET withdrawn_at=COALESCE(consent.withdrawn_at,now())
    FROM retail_customers customer WHERE customer.id=consent.customer_id AND customer.email=subscriber.email AND consent.withdrawn_at IS NULL;
  RETURN true;
END $$;

-- Bring captured checkout consent into the same operational list without
-- changing its original order-linked evidence.
INSERT INTO retail_marketing_subscribers(email,locale,source,status,consented_at,unsubscribed_at,updated_at)
SELECT c.email,
  COALESCE((array_agg(consent.locale ORDER BY consent.consented_at DESC))[1],'en'),
  'checkout',
  CASE WHEN bool_or(consent.withdrawn_at IS NULL) THEN 'active' ELSE 'unsubscribed' END,
  max(consent.consented_at),
  CASE WHEN bool_or(consent.withdrawn_at IS NULL) THEN NULL ELSE max(consent.withdrawn_at) END,
  now()
FROM retail_customer_marketing_consents consent JOIN retail_customers c ON c.id=consent.customer_id
GROUP BY c.email
ON CONFLICT(email) DO NOTHING;

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
  PERFORM retail_subscribe_marketing(target_order.checkout_email,COALESCE(target_order.marketing_consent_locale,'en'),'checkout');
  RETURN true;
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
  UPDATE retail_marketing_subscribers subscriber SET status='unsubscribed',unsubscribed_at=COALESCE(unsubscribed_at,now()),updated_at=now()
    FROM retail_customers customer JOIN retail_customer_sessions session ON session.customer_id=customer.id
    WHERE session.session_sha256=p_session_sha256 AND session.revoked_at IS NULL AND session.expires_at>now()
      AND subscriber.email=customer.email AND subscriber.status<>'suppressed';
  RETURN affected;
END $$;

-- Evaluate automatic campaigns by asking the existing authoritative quote
-- function for each active candidate. The single largest discount wins; an
-- explicitly supplied customer code never enters this resolver.
CREATE OR REPLACE FUNCTION retail_best_automatic_promotion(p_items JSONB,p_checkout JSONB)
RETURNS TEXT LANGUAGE plpgsql STABLE AS $$
DECLARE candidate retail_promotions%ROWTYPE; quoted RECORD; best_code TEXT; best_discount BIGINT:=0; used_count BIGINT; customer_count BIGINT; email TEXT:=lower(trim(COALESCE(p_checkout->>'email','')));
BEGIN
  FOR candidate IN SELECT * FROM retail_promotions p WHERE p.automatic AND p.active
    AND (p.starts_at IS NULL OR p.starts_at<=now()) AND (p.ends_at IS NULL OR p.ends_at>now()) ORDER BY p.created_at,p.code
  LOOP
    SELECT count(*) INTO used_count FROM retail_promotion_redemptions r WHERE r.promotion_id=candidate.id AND r.status IN ('reserved','committed');
    SELECT count(*) INTO customer_count FROM retail_promotion_redemptions r WHERE r.promotion_id=candidate.id AND r.customer_email=email AND r.status IN ('reserved','committed');
    IF (candidate.max_redemptions IS NOT NULL AND used_count>=candidate.max_redemptions)
      OR (candidate.max_per_customer IS NOT NULL AND customer_count>=candidate.max_per_customer) THEN CONTINUE; END IF;
    BEGIN
      SELECT * INTO quoted FROM retail_quote_checkout_v3(p_items,p_checkout,candidate.code);
      IF quoted.discount_minor>best_discount THEN best_discount:=quoted.discount_minor; best_code:=candidate.code; END IF;
    EXCEPTION WHEN raise_exception THEN
      NULL;
    END;
  END LOOP;
  RETURN best_code;
END $$;

CREATE OR REPLACE FUNCTION retail_admin_set_marketing_status_as_actor(
  p_public_id UUID,p_status TEXT,p_key UUID,p_actor_id TEXT,p_actor_name TEXT,p_actor_role TEXT,p_legacy BOOLEAN
) RETURNS TABLE(public_id UUID,status TEXT,replayed BOOLEAN) LANGUAGE plpgsql AS $$
DECLARE payload JSONB; prior retail_admin_idempotency%ROWTYPE; subscriber retail_marketing_subscribers%ROWTYPE;
BEGIN
  IF p_status NOT IN ('active','unsubscribed','suppressed') THEN RAISE EXCEPTION 'invalid marketing status'; END IF;
  payload:=jsonb_build_object('publicId',p_public_id,'status',p_status);
  PERFORM pg_advisory_xact_lock(hashtextextended(p_key::text,0));
  SELECT * INTO prior FROM retail_admin_idempotency WHERE idempotency_key=p_key FOR UPDATE;
  IF FOUND THEN
    IF prior.operation<>'marketing_subscriber.status' OR prior.request_payload<>payload THEN RAISE EXCEPTION 'idempotency conflict'; END IF;
    RETURN QUERY SELECT (prior.response_payload->>'publicId')::uuid,prior.response_payload->>'status',true; RETURN;
  END IF;
  SELECT * INTO subscriber FROM retail_marketing_subscribers s WHERE s.public_id=p_public_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'marketing subscriber not found'; END IF;
  INSERT INTO retail_admin_idempotency(idempotency_key,operation,request_payload) VALUES(p_key,'marketing_subscriber.status',payload);
  UPDATE retail_marketing_subscribers s SET status=p_status,
    consented_at=CASE WHEN p_status='active' THEN COALESCE(s.consented_at,now()) ELSE s.consented_at END,
    unsubscribed_at=CASE WHEN p_status='active' THEN NULL ELSE COALESCE(s.unsubscribed_at,now()) END,updated_at=now()
    WHERE s.id=subscriber.id RETURNING s.* INTO subscriber;
  INSERT INTO retail_admin_audit(action,entity_type,entity_id,detail,idempotency_key,actor_id,actor_name,actor_role,legacy_actor)
    VALUES('marketing_subscriber.status','marketing_subscriber',p_public_id::text,payload,p_key,p_actor_id,p_actor_name,p_actor_role,p_legacy);
  UPDATE retail_admin_idempotency SET response_payload=jsonb_build_object('publicId',subscriber.public_id,'status',subscriber.status) WHERE idempotency_key=p_key;
  RETURN QUERY SELECT subscriber.public_id,subscriber.status,false;
END $$;
