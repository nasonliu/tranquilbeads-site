-- Customer self-service order access. Bearer tokens are generated outside
-- PostgreSQL and only their SHA-256 hex digests are persisted here.
CREATE TABLE IF NOT EXISTS retail_customer_portal_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id BIGINT NOT NULL REFERENCES retail_orders(id) ON DELETE CASCADE,
  token_sha256 CHAR(64) NOT NULL UNIQUE CHECK (token_sha256 ~ '^[0-9a-f]{64}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS retail_customer_portal_tokens_order_idx
  ON retail_customer_portal_tokens(order_id, created_at DESC);

-- Issuing a replacement is an explicit rotation: a previously mailed link
-- immediately stops working. The token itself never reaches this function.
CREATE OR REPLACE FUNCTION retail_issue_customer_portal_token(
  p_order_id BIGINT,
  p_token_sha256 TEXT,
  p_expires_at TIMESTAMPTZ
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE issued_id UUID;
BEGIN
  IF p_token_sha256 !~ '^[0-9a-f]{64}$' OR p_expires_at IS NULL OR p_expires_at <= now() THEN
    RAISE EXCEPTION 'invalid customer portal token';
  END IF;
  PERFORM 1 FROM retail_orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order not found'; END IF;
  UPDATE retail_customer_portal_tokens
    SET revoked_at=now()
    WHERE order_id=p_order_id AND revoked_at IS NULL;
  INSERT INTO retail_customer_portal_tokens(order_id,token_sha256,expires_at)
    VALUES(p_order_id,p_token_sha256,p_expires_at)
    RETURNING id INTO issued_id;
  RETURN issued_id;
END $$;

CREATE OR REPLACE FUNCTION retail_revoke_customer_portal_tokens(p_order_id BIGINT)
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE changed INTEGER;
BEGIN
  UPDATE retail_customer_portal_tokens
    SET revoked_at=now()
    WHERE order_id=p_order_id AND revoked_at IS NULL;
  GET DIAGNOSTICS changed=ROW_COUNT;
  RETURN changed;
END $$;

-- Invalid, expired and revoked tokens all return zero rows. This atomic update
-- also records a successful use without returning customer/address/payment IDs.
CREATE OR REPLACE FUNCTION retail_redeem_customer_portal_token(p_token_sha256 TEXT)
RETURNS TABLE(
  order_public_id UUID,
  payment_status TEXT,
  fulfilment_status TEXT,
  currency CHAR(3),
  amount_minor BIGINT,
  ordered_at TIMESTAMPTZ,
  carrier TEXT,
  tracking_number TEXT,
  items JSONB
) LANGUAGE plpgsql AS $$
BEGIN
  IF p_token_sha256 !~ '^[0-9a-f]{64}$' THEN RETURN; END IF;
  RETURN QUERY
  UPDATE retail_customer_portal_tokens t
     SET last_used_at=now()
    FROM retail_orders o
   WHERE t.order_id=o.id
     AND t.token_sha256=p_token_sha256
     AND t.revoked_at IS NULL
     AND t.expires_at>now()
  RETURNING
    o.public_id,
    o.status,
    o.fulfilment_status,
    o.currency,
    o.amount_minor,
    o.created_at,
    o.carrier,
    o.tracking_number,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'titleEn', item.value->>'titleEn',
        'titleAr', item.value->>'titleAr',
        'titleZh', item.value->>'titleZh',
        'quantity', item.value->'quantity'
      ))
      FROM jsonb_array_elements(COALESCE(o.items_snapshot,'[]'::jsonb)) AS item(value)
    ), '[]'::jsonb);
END $$;
