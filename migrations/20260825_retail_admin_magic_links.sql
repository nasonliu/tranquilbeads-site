-- One-time administrator sign-in links. Only SHA-256 token digests are stored;
-- raw bearer tokens exist only in the short-lived email link.
CREATE TABLE IF NOT EXISTS retail_admin_login_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id TEXT NOT NULL CHECK (length(actor_id) BETWEEN 1 AND 100),
  token_sha256 CHAR(64) NOT NULL UNIQUE CHECK (token_sha256 ~ '^[0-9a-f]{64}$'),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS retail_admin_login_tokens_actor_idx
  ON retail_admin_login_tokens(actor_id, created_at DESC);

CREATE OR REPLACE FUNCTION retail_issue_admin_login_token(p_actor_id TEXT,p_token_sha256 TEXT,p_expires_at TIMESTAMPTZ)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF length(COALESCE(p_actor_id,'')) NOT BETWEEN 1 AND 100 OR p_token_sha256 !~ '^[0-9a-f]{64}$' OR p_expires_at <= now() THEN RETURN false; END IF;
  UPDATE retail_admin_login_tokens SET revoked_at=now()
    WHERE actor_id=p_actor_id AND used_at IS NULL AND revoked_at IS NULL;
  INSERT INTO retail_admin_login_tokens(actor_id,token_sha256,expires_at)
    VALUES(p_actor_id,p_token_sha256,p_expires_at);
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION retail_redeem_admin_login_token(p_token_sha256 TEXT)
RETURNS TABLE(actor_id TEXT) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF p_token_sha256 !~ '^[0-9a-f]{64}$' THEN RETURN; END IF;
  RETURN QUERY
    UPDATE retail_admin_login_tokens t SET used_at=now()
      WHERE t.token_sha256=p_token_sha256 AND t.used_at IS NULL AND t.revoked_at IS NULL AND t.expires_at>now()
      RETURNING t.actor_id;
END $$;

REVOKE ALL ON FUNCTION retail_issue_admin_login_token(TEXT,TEXT,TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION retail_redeem_admin_login_token(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION retail_issue_admin_login_token(TEXT,TEXT,TIMESTAMPTZ) TO CURRENT_USER;
GRANT EXECUTE ON FUNCTION retail_redeem_admin_login_token(TEXT) TO CURRENT_USER;
