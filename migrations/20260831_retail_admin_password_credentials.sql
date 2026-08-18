-- Vercel credentials bootstrap an administrator once. Subsequent password
-- changes live here as salted scrypt hashes so operators do not need to edit
-- deployment environment variables for routine credential rotation.
CREATE TABLE IF NOT EXISTS retail_admin_password_credentials (
  actor_id TEXT PRIMARY KEY,
  password_salt CHAR(32) NOT NULL CHECK(password_salt ~ '^[0-9a-f]{32}$'),
  password_hash CHAR(64) NOT NULL CHECK(password_hash ~ '^[0-9a-f]{64}$'),
  credential_version UUID NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS retail_admin_password_credentials_changed_idx
  ON retail_admin_password_credentials(changed_at DESC);
