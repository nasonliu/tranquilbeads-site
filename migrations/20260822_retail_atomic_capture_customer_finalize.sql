-- Keep the durable payment transition and every customer/account side effect
-- in one database transaction. If finalization fails, capture application is
-- rolled back so a PayPal replay can safely try the complete operation again.
CREATE OR REPLACE FUNCTION retail_apply_paypal_capture_and_finalize(
  p_paypal_order TEXT,
  p_capture TEXT,
  p_customer JSONB DEFAULT '{}'::jsonb,
  p_shipping JSONB DEFAULT '{}'::jsonb,
  p_fee BIGINT DEFAULT NULL,
  p_net BIGINT DEFAULT NULL
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE applied BOOLEAN;
BEGIN
  applied := retail_apply_paypal_capture(
    p_paypal_order,
    p_capture,
    p_customer,
    p_shipping,
    p_fee,
    p_net
  );
  IF NOT applied THEN RETURN false; END IF;
  PERFORM retail_finalize_customer_post_capture(p_paypal_order);
  RETURN true;
END $$;
