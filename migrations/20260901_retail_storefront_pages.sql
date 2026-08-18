CREATE TABLE IF NOT EXISTS retail_storefront_pages (
  page_key TEXT PRIMARY KEY CHECK (page_key IN ('home')),
  draft_payload JSONB NOT NULL,
  published_payload JSONB,
  version BIGINT NOT NULL DEFAULT 1 CHECK (version > 0),
  published_version BIGINT CHECK (published_version IS NULL OR published_version > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  updated_by TEXT NOT NULL,
  published_by TEXT
);

CREATE TABLE IF NOT EXISTS retail_storefront_page_assets (
  id UUID PRIMARY KEY,
  page_key TEXT NOT NULL CHECK (page_key IN ('home')),
  blob_url TEXT NOT NULL UNIQUE,
  mime TEXT NOT NULL CHECK (mime IN ('image/png', 'image/jpeg', 'image/webp')),
  bytes INTEGER NOT NULL CHECK (bytes > 0),
  sha256 CHAR(64) NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL,
  UNIQUE(page_key, sha256)
);

CREATE INDEX IF NOT EXISTS retail_storefront_page_assets_created_idx
  ON retail_storefront_page_assets(page_key, created_at DESC);

CREATE OR REPLACE FUNCTION retail_save_storefront_page_draft(
  p_page_key TEXT,
  p_payload JSONB,
  p_expected_version BIGINT,
  p_idempotency_key UUID,
  p_actor_id TEXT,
  p_actor_name TEXT,
  p_actor_role TEXT,
  p_actor_legacy BOOLEAN
) RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
  v_request JSONB := jsonb_build_object('pageKey', p_page_key, 'payload', p_payload, 'expectedVersion', p_expected_version);
  v_existing RECORD;
  v_version BIGINT;
BEGIN
  SELECT i.operation,i.request_payload,i.response_payload,a.actor_id,a.actor_name,a.actor_role,a.legacy_actor
    INTO v_existing
    FROM retail_admin_idempotency i
    LEFT JOIN retail_admin_audit a ON a.idempotency_key=i.idempotency_key
    WHERE i.idempotency_key=p_idempotency_key;
  IF FOUND THEN
    IF v_existing.operation <> 'storefront.page.draft.save' OR v_existing.request_payload <> v_request THEN
      RAISE EXCEPTION 'idempotency_conflict';
    END IF;
    IF v_existing.actor_id <> p_actor_id OR v_existing.actor_name <> p_actor_name OR v_existing.actor_role <> p_actor_role OR v_existing.legacy_actor <> p_actor_legacy THEN
      RAISE EXCEPTION 'idempotency_actor_conflict';
    END IF;
    RETURN (v_existing.response_payload->>'version')::BIGINT;
  END IF;

  SELECT version INTO v_version FROM retail_storefront_pages WHERE page_key=p_page_key FOR UPDATE;
  IF NOT FOUND THEN
    IF p_expected_version <> 0 THEN RAISE EXCEPTION 'page_version_conflict'; END IF;
    v_version := 1;
    INSERT INTO retail_storefront_pages(page_key,draft_payload,version,updated_by)
      VALUES(p_page_key,p_payload,v_version,p_actor_id);
  ELSE
    IF v_version <> p_expected_version THEN RAISE EXCEPTION 'page_version_conflict'; END IF;
    v_version := v_version + 1;
    UPDATE retail_storefront_pages SET draft_payload=p_payload,version=v_version,updated_at=now(),updated_by=p_actor_id
      WHERE page_key=p_page_key;
  END IF;

  INSERT INTO retail_admin_idempotency(idempotency_key,operation,request_payload,response_payload)
    VALUES(p_idempotency_key,'storefront.page.draft.save',v_request,jsonb_build_object('version',v_version));
  INSERT INTO retail_admin_audit(action,entity_type,entity_id,detail,idempotency_key,actor_id,actor_name,actor_role,legacy_actor,actor_attributed)
    VALUES('storefront.page.draft.save','storefront_page',p_page_key,v_request,p_idempotency_key,p_actor_id,p_actor_name,p_actor_role,p_actor_legacy,true);
  RETURN v_version;
END;
$$;

CREATE OR REPLACE FUNCTION retail_publish_storefront_page(
  p_page_key TEXT,
  p_expected_version BIGINT,
  p_idempotency_key UUID,
  p_actor_id TEXT,
  p_actor_name TEXT,
  p_actor_role TEXT,
  p_actor_legacy BOOLEAN
) RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
  v_request JSONB := jsonb_build_object('pageKey', p_page_key, 'expectedVersion', p_expected_version);
  v_existing RECORD;
  v_version BIGINT;
BEGIN
  SELECT i.operation,i.request_payload,i.response_payload,a.actor_id,a.actor_name,a.actor_role,a.legacy_actor
    INTO v_existing
    FROM retail_admin_idempotency i
    LEFT JOIN retail_admin_audit a ON a.idempotency_key=i.idempotency_key
    WHERE i.idempotency_key=p_idempotency_key;
  IF FOUND THEN
    IF v_existing.operation <> 'storefront.page.publish' OR v_existing.request_payload <> v_request THEN
      RAISE EXCEPTION 'idempotency_conflict';
    END IF;
    IF v_existing.actor_id <> p_actor_id OR v_existing.actor_name <> p_actor_name OR v_existing.actor_role <> p_actor_role OR v_existing.legacy_actor <> p_actor_legacy THEN
      RAISE EXCEPTION 'idempotency_actor_conflict';
    END IF;
    RETURN (v_existing.response_payload->>'publishedVersion')::BIGINT;
  END IF;

  SELECT version INTO v_version FROM retail_storefront_pages WHERE page_key=p_page_key FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'page_not_found'; END IF;
  IF v_version <> p_expected_version THEN RAISE EXCEPTION 'page_version_conflict'; END IF;
  UPDATE retail_storefront_pages
    SET published_payload=draft_payload,published_version=version,published_at=now(),published_by=p_actor_id
    WHERE page_key=p_page_key;
  INSERT INTO retail_admin_idempotency(idempotency_key,operation,request_payload,response_payload)
    VALUES(p_idempotency_key,'storefront.page.publish',v_request,jsonb_build_object('publishedVersion',v_version));
  INSERT INTO retail_admin_audit(action,entity_type,entity_id,detail,idempotency_key,actor_id,actor_name,actor_role,legacy_actor,actor_attributed)
    VALUES('storefront.page.publish','storefront_page',p_page_key,v_request,p_idempotency_key,p_actor_id,p_actor_name,p_actor_role,p_actor_legacy,true);
  RETURN v_version;
END;
$$;
