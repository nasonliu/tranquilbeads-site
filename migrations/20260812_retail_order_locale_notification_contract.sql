-- Contract only after all checkout workers understand checkout_locale. Keeping
-- this separate from 20260811 prevents an old worker from emitting a terminal
-- message using a mixed-version order contract.
DO $$
DECLARE definition TEXT;
BEGIN
  SELECT pg_get_functiondef('retail_create_checkout_v3(uuid,jsonb,jsonb,bigint,text)'::regprocedure) INTO definition;
  IF definition IS NULL THEN RAISE EXCEPTION 'retail_create_checkout_v3 is required'; END IF;
  IF position('DECLARE existing retail_orders%ROWTYPE;' IN definition)=0
     OR position(E'BEGIN\n  PERFORM retail_release_expired_reservations();' IN definition)=0
     OR position('SELECT jsonb_agg(jsonb_build_object(''variantSku'',COALESCE(x->>''variantSku'',x->>''sku''),''quantity'',(x->>''quantity'')::bigint) ORDER BY COALESCE(x->>''variantSku'',x->>''sku'')) INTO prior_requested FROM retail_order_lines l WHERE l.order_id=existing.id;' IN definition)=0
     OR position('existing.checkout_email<>lower(trim(p_checkout->>''email'')) OR existing.amount_minor<>q.total_minor' IN definition)=0
     OR position('items_snapshot,checkout_email,checkout_shipping,terms_version,terms_accepted_at,quote_hash,status)' IN definition)=0
     OR position('grouped_items,lower(trim(p_checkout->>''email'')),q.shipping_snapshot,p_checkout->>''termsVersion'',now(),q.quote_hash,''pending'')' IN definition)=0 THEN
    RAISE EXCEPTION 'retail_create_checkout_v3 source did not match locale/replay patch';
  END IF;
  definition := replace(definition, 'DECLARE existing retail_orders%ROWTYPE;', 'DECLARE checkout_locale TEXT; existing retail_orders%ROWTYPE;');
  definition := replace(definition, E'BEGIN\n  PERFORM retail_release_expired_reservations()', E'BEGIN\n  checkout_locale:=lower(trim(COALESCE(p_checkout->>''locale'','''')));\n  IF checkout_locale NOT IN (''en'',''ar'',''zh'') THEN RAISE EXCEPTION ''invalid checkout''; END IF;\n  PERFORM retail_release_expired_reservations()');
  definition := replace(definition, 'existing.checkout_email<>lower(trim(p_checkout->>''email'')) OR existing.amount_minor<>q.total_minor', 'existing.checkout_email<>lower(trim(p_checkout->>''email'')) OR existing.checkout_locale<>checkout_locale OR existing.amount_minor<>q.total_minor');
  definition := replace(definition, 'SELECT jsonb_agg(jsonb_build_object(''variantSku'',COALESCE(x->>''variantSku'',x->>''sku''),''quantity'',(x->>''quantity'')::bigint) ORDER BY COALESCE(x->>''variantSku'',x->>''sku'')) INTO prior_requested FROM retail_order_lines l WHERE l.order_id=existing.id;', 'SELECT jsonb_agg(jsonb_build_object(''variantSku'',l.variant_sku,''quantity'',l.quantity) ORDER BY l.variant_sku) INTO prior_requested FROM retail_order_lines l WHERE l.order_id=existing.id;');
  definition := replace(definition, 'items_snapshot,checkout_email,checkout_shipping,terms_version,terms_accepted_at,quote_hash,status)', 'items_snapshot,checkout_email,checkout_shipping,checkout_locale,terms_version,terms_accepted_at,quote_hash,status)');
  definition := replace(definition, 'grouped_items,lower(trim(p_checkout->>''email'')),q.shipping_snapshot,p_checkout->>''termsVersion'',now(),q.quote_hash,''pending'')', 'grouped_items,lower(trim(p_checkout->>''email'')),q.shipping_snapshot,checkout_locale,p_checkout->>''termsVersion'',now(),q.quote_hash,''pending'')');
  IF position('checkout_locale:=lower' IN definition)=0
     OR position('existing.checkout_locale<>checkout_locale' IN definition)=0
     OR position('jsonb_build_object(''variantSku'',l.variant_sku,''quantity'',l.quantity) ORDER BY l.variant_sku' IN definition)=0
     OR position('checkout_shipping,checkout_locale,terms_version' IN definition)=0 THEN
    RAISE EXCEPTION 'retail_create_checkout_v3 locale patch did not apply';
  END IF;
  EXECUTE definition;
END $$;

CREATE OR REPLACE FUNCTION retail_order_notification_trigger() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.checkout_email IS NULL THEN RETURN NEW; END IF;
  IF NEW.status='captured' AND OLD.status IS DISTINCT FROM 'captured' THEN
    INSERT INTO retail_notification_outbox(order_id,kind,recipient,payload,idempotency_key) VALUES(NEW.id,'order_confirmed',NEW.checkout_email,jsonb_build_object('publicOrderId',NEW.public_id,'amountMinor',NEW.amount_minor),'confirmed:'||NEW.id) ON CONFLICT(idempotency_key) DO NOTHING;
  END IF;
  IF NEW.fulfilment_status='fulfilled' AND OLD.fulfilment_status IS DISTINCT FROM 'fulfilled' THEN
    INSERT INTO retail_notification_outbox(order_id,kind,recipient,payload,idempotency_key) VALUES(NEW.id,'order_fulfilled',NEW.checkout_email,jsonb_build_object('carrier',NEW.carrier,'tracking',NEW.tracking_number),'fulfilled:'||NEW.id) ON CONFLICT(idempotency_key) DO NOTHING;
  END IF;
  IF NEW.refunded_minor>OLD.refunded_minor THEN
    INSERT INTO retail_notification_outbox(order_id,kind,recipient,payload,idempotency_key) VALUES(NEW.id,'order_refunded',NEW.checkout_email,jsonb_build_object('refundedMinor',NEW.refunded_minor,'amountMinor',NEW.amount_minor),'refund:'||NEW.id||':'||NEW.refunded_minor) ON CONFLICT(idempotency_key) DO NOTHING;
  END IF;
  IF NEW.status='cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    INSERT INTO retail_notification_outbox(order_id,kind,recipient,payload,idempotency_key) VALUES(NEW.id,'order_cancelled',NEW.checkout_email,jsonb_build_object('status',NEW.status),'terminal:'||NEW.id) ON CONFLICT(idempotency_key) DO NOTHING;
  END IF;
  IF NEW.status IN ('failed','denied','reversed') AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO retail_notification_outbox(order_id,kind,recipient,payload,idempotency_key) VALUES(NEW.id,'payment_failed',NEW.checkout_email,jsonb_build_object('status',NEW.status),'terminal:'||NEW.id) ON CONFLICT(idempotency_key) DO NOTHING;
  END IF;
  IF NEW.status='expired' AND OLD.status IS DISTINCT FROM 'expired' THEN
    INSERT INTO retail_notification_outbox(order_id,kind,recipient,payload,idempotency_key) VALUES(NEW.id,'checkout_expired',NEW.checkout_email,jsonb_build_object('status',NEW.status),'terminal:'||NEW.id) ON CONFLICT(idempotency_key) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS retail_order_notification_changes ON retail_orders;
CREATE TRIGGER retail_order_notification_changes AFTER UPDATE ON retail_orders FOR EACH ROW EXECUTE FUNCTION retail_order_notification_trigger();
