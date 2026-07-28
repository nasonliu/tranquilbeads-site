-- Named admin operators, audit attribution, and deliberately scoped PII reads.
-- Existing audit rows remain attributable to the compatibility administrator.
ALTER TABLE retail_admin_audit ADD COLUMN IF NOT EXISTS actor_id TEXT NOT NULL DEFAULT 'legacy-admin';
ALTER TABLE retail_admin_audit ADD COLUMN IF NOT EXISTS actor_name TEXT NOT NULL DEFAULT 'Legacy administrator';
ALTER TABLE retail_admin_audit ADD COLUMN IF NOT EXISTS actor_role TEXT NOT NULL DEFAULT 'owner' CHECK(actor_role IN ('owner','operations','warehouse','finance','viewer'));
ALTER TABLE retail_admin_audit ADD COLUMN IF NOT EXISTS legacy_actor BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS retail_admin_audit_actor_created_idx ON retail_admin_audit(actor_id,created_at DESC);

CREATE OR REPLACE FUNCTION retail_record_admin_pii_view(p_order BIGINT,p_actor_id TEXT,p_actor_name TEXT,p_actor_role TEXT,p_legacy BOOLEAN)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  IF p_actor_role NOT IN ('owner','operations') THEN RAISE EXCEPTION 'actor is not permitted to view order pii'; END IF;
  PERFORM 1 FROM retail_orders WHERE id=p_order;
  IF NOT FOUND THEN RAISE EXCEPTION 'order not found'; END IF;
  INSERT INTO retail_admin_audit(action,entity_type,entity_id,detail,actor_id,actor_name,actor_role,legacy_actor)
    VALUES('order.pii.view','order',p_order::text,jsonb_build_object('fields',jsonb_build_array('shipping_address'),'purpose','on_demand_order_detail'),p_actor_id,p_actor_name,p_actor_role,p_legacy);
END $$;
