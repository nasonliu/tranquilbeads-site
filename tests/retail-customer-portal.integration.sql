BEGIN;

INSERT INTO retail_orders(
  paypal_order_id, client_request_id, currency, amount_minor, subtotal_minor,
  shipping_minor, tax_minor, discount_minor, status, capture_id, captured_at, items_snapshot
) VALUES (
  'PORTAL-PG16-ORDER', '10000000-0000-4000-8000-000000000001', 'USD', 1250, 1250,
  0, 0, 0, 'captured', 'PORTAL-PG16-CAPTURE', now(),
  '[{"titleEn":"Retail-only bead","titleAr":"خرزة","titleZh":"零售珠子","quantity":1,"unitAmountMinor":1250}]'::jsonb
);

DO $$
DECLARE order_key BIGINT; token_id UUID; portal_row RECORD; revoked_count INTEGER;
BEGIN
  SELECT id INTO order_key FROM retail_orders WHERE paypal_order_id='PORTAL-PG16-ORDER';
  SELECT retail_issue_customer_portal_token(order_key, repeat('a',64), now()+interval '30 days') INTO token_id;
  IF token_id IS NULL OR NOT EXISTS(SELECT 1 FROM retail_customer_portal_tokens WHERE id=token_id AND token_sha256=repeat('a',64)) THEN
    RAISE EXCEPTION 'portal token was not stored as a digest';
  END IF;
  SELECT * INTO portal_row FROM retail_redeem_customer_portal_token(repeat('a',64));
  IF portal_row.order_public_id IS NULL OR portal_row.payment_status<>'captured' OR portal_row.tracking_number IS NOT NULL THEN
    RAISE EXCEPTION 'customer portal projection is wrong';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM retail_customer_portal_tokens WHERE id=token_id AND last_used_at IS NOT NULL) THEN
    RAISE EXCEPTION 'portal last_used_at was not recorded';
  END IF;
  SELECT retail_revoke_customer_portal_tokens(order_key) INTO revoked_count;
  IF revoked_count<>1 OR EXISTS(SELECT 1 FROM retail_redeem_customer_portal_token(repeat('a',64))) THEN
    RAISE EXCEPTION 'revoked portal credential remained usable';
  END IF;
END $$;

ROLLBACK;
