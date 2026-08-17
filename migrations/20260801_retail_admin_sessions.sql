-- Server-side retail administrator sessions. The browser holds a signed token
-- containing a random jti; this table stores only SHA-256 digests, never the
-- jti, password, password hash, or session cookie itself.
CREATE TABLE IF NOT EXISTS retail_admin_sessions (
  session_hash CHAR(64) PRIMARY KEY CHECK (session_hash ~ '^[0-9a-f]{64}$'),
  actor_id TEXT NOT NULL CHECK (length(actor_id) BETWEEN 1 AND 100),
  credential_version_hash CHAR(64) NOT NULL CHECK (credential_version_hash ~ '^[0-9a-f]{64}$'),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS retail_admin_sessions_active_actor_idx
  ON retail_admin_sessions(actor_id, expires_at)
  WHERE revoked_at IS NULL;
