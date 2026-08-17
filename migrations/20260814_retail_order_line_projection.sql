-- Order lines are the immutable fulfilment/customer-facing item authority.
-- `items_snapshot` predates variants and is retained only as a legacy fallback.
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
        'productSku', l.product_sku,
        'variantSku', l.variant_sku,
        'titleEn', l.title_en,
        'titleAr', l.title_ar,
        'titleZh', l.title_zh,
        'options', l.option_values,
        'quantity', l.quantity,
        'unitAmountMinor', l.unit_amount_minor,
        'discountMinor', l.discount_minor,
        'lineTotalMinor', l.quantity * l.unit_amount_minor - l.discount_minor
      ) ORDER BY l.created_at, l.id)
      FROM retail_order_lines l
      WHERE l.order_id=o.id
    ), COALESCE(o.items_snapshot, '[]'::jsonb));
END $$;
