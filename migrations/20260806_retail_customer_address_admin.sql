-- Customer addresses have a masked directory and a separate, audited PII
-- read path. Keep the PII receipt in the database so an API refactor cannot
-- accidentally return an address before recording who viewed it.
CREATE OR REPLACE FUNCTION retail_record_admin_customer_address_pii_view(
  p_customer UUID,p_actor_id TEXT,p_actor_name TEXT,p_actor_role TEXT,p_legacy BOOLEAN
) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  IF p_actor_role NOT IN ('owner','operations') THEN
    RAISE EXCEPTION 'actor is not permitted to view customer address pii';
  END IF;
  PERFORM 1 FROM retail_customers WHERE public_id=p_customer;
  IF NOT FOUND THEN RAISE EXCEPTION 'customer not found'; END IF;
  INSERT INTO retail_admin_audit(action,entity_type,entity_id,detail,actor_id,actor_name,actor_role,legacy_actor,actor_attributed)
    VALUES('customer.address.pii.view','customer',p_customer::text,
      jsonb_build_object('fields',jsonb_build_array('address_book'),'purpose','on_demand_customer_address_management'),
      p_actor_id,p_actor_name,p_actor_role,p_legacy,true);
END $$;

-- The idempotency table needs exact request values to reject a mismatched
-- replay. Audit records do not: retain only the action and field-presence
-- metadata so the audit UI and its backing table never duplicate PII.
CREATE OR REPLACE FUNCTION retail_customer_update_audit_detail(
  p_name TEXT,p_recipient TEXT,p_line1 TEXT,p_line2 TEXT,p_city TEXT,p_region TEXT,p_postal TEXT,p_country TEXT,p_phone TEXT,
  p_default BOOLEAN,p_archive BOOLEAN,p_has_address BOOLEAN
) RETURNS JSONB LANGUAGE SQL AS $$
  SELECT jsonb_build_object(
    'nameChanged',p_name IS NOT NULL,
    'addressChanged',p_has_address,
    'recipientChanged',p_recipient IS NOT NULL,
    'line1Changed',p_line1 IS NOT NULL,
    'line2Changed',p_line2 IS NOT NULL,
    'cityChanged',p_city IS NOT NULL,
    'regionChanged',p_region IS NOT NULL,
    'postalCodeChanged',p_postal IS NOT NULL,
    'countryChanged',p_country IS NOT NULL,
    'phoneChanged',p_phone IS NOT NULL,
    'defaultRequested',COALESCE(p_default,false),
    'archived',COALESCE(p_archive,false)
  )
$$;

-- Scrub historical customer-update receipts using the idempotency payload.
-- This preserves retry-compatible field-presence metadata without retaining a
-- second address/name/phone copy in retail_admin_audit.
UPDATE retail_admin_audit a
  SET detail=retail_customer_update_audit_detail(
    r.request_payload->>'name',r.request_payload->>'recipient',r.request_payload->>'line1',r.request_payload->>'line2',
    r.request_payload->>'city',r.request_payload->>'region',r.request_payload->>'postalCode',r.request_payload->>'country',r.request_payload->>'phone',
    COALESCE((r.request_payload->>'isDefault')::boolean,false),COALESCE((r.request_payload->>'archive')::boolean,false),COALESCE((r.request_payload->>'hasAddress')::boolean,false)
  )
  FROM retail_admin_idempotency r
  WHERE a.action='customer.update' AND a.idempotency_key=r.idempotency_key;

UPDATE retail_admin_audit a
  SET detail=jsonb_build_object('legacyRedacted',true)
  WHERE a.action='customer.update'
    AND NOT EXISTS(SELECT 1 FROM retail_admin_idempotency r WHERE r.idempotency_key=a.idempotency_key);

-- Retain the established idempotency key and actor-attribution wrapper. This
-- replacement only closes address-book state transitions: a new customer's
-- first active address becomes default, archive cannot create an address, and
-- archiving a default promotes an existing active address when one exists.
CREATE OR REPLACE FUNCTION retail_update_admin_customer(
  p_customer UUID,p_name TEXT,p_address UUID,p_recipient TEXT,p_line1 TEXT,p_line2 TEXT,p_city TEXT,p_region TEXT,
  p_postal TEXT,p_country TEXT,p_phone TEXT,p_default BOOLEAN,p_archive BOOLEAN,p_has_address BOOLEAN,p_key UUID
) RETURNS TABLE(address_id UUID,replayed BOOLEAN) LANGUAGE plpgsql AS $$
DECLARE
  payload JSONB;
  prior retail_admin_idempotency%ROWTYPE;
  customer_row retail_customers%ROWTYPE;
  out_id UUID;
  was_default BOOLEAN;
BEGIN
  payload:=jsonb_build_object('customerId',p_customer,'name',p_name,'addressId',p_address,'recipient',p_recipient,'line1',p_line1,'line2',p_line2,'city',p_city,'region',p_region,'postalCode',p_postal,'country',p_country,'phone',p_phone,'isDefault',p_default,'archive',p_archive,'hasAddress',p_has_address);
  PERFORM pg_advisory_xact_lock(hashtextextended(p_key::text,0));
  SELECT * INTO prior FROM retail_admin_idempotency WHERE idempotency_key=p_key FOR UPDATE;
  IF FOUND THEN
    IF prior.operation<>'customer.update' OR prior.request_payload<>payload THEN RAISE EXCEPTION 'idempotency conflict'; END IF;
    RETURN QUERY SELECT NULLIF(prior.response_payload->>'addressId','')::uuid,true;
    RETURN;
  END IF;
  SELECT * INTO customer_row FROM retail_customers WHERE public_id=p_customer FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'customer not found'; END IF;
  IF COALESCE(p_archive,false) AND p_address IS NULL THEN RAISE EXCEPTION 'cannot archive a new address'; END IF;
  IF COALESCE(p_archive,false) AND COALESCE(p_default,false) THEN RAISE EXCEPTION 'cannot archive the default address in one request'; END IF;
  IF p_address IS NULL AND p_has_address AND (p_recipient IS NULL OR p_line1 IS NULL OR p_city IS NULL OR p_country IS NULL) THEN
    RAISE EXCEPTION 'new address requires recipient, line1, city and country';
  END IF;

  INSERT INTO retail_admin_idempotency(idempotency_key,operation,request_payload) VALUES(p_key,'customer.update',payload);
  UPDATE retail_customers SET name=COALESCE(p_name,name) WHERE id=customer_row.id;
  IF p_has_address THEN
    IF p_address IS NULL THEN
      INSERT INTO retail_addresses(customer_id,recipient,line1,line2,city,region,postal_code,country,phone,is_default)
        VALUES(customer_row.id,p_recipient,p_line1,NULLIF(p_line2,''),p_city,NULLIF(p_region,''),NULLIF(p_postal,''),p_country,NULLIF(p_phone,''),
          COALESCE(p_default,NOT EXISTS(SELECT 1 FROM retail_addresses WHERE customer_id=customer_row.id AND is_default AND archived_at IS NULL)))
        RETURNING id INTO out_id;
    ELSE
      SELECT is_default INTO was_default FROM retail_addresses WHERE id=p_address AND customer_id=customer_row.id FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'address not found'; END IF;
      IF p_default IS TRUE THEN
        UPDATE retail_addresses SET is_default=false,updated_at=now()
          WHERE customer_id=customer_row.id AND id<>p_address AND archived_at IS NULL;
      END IF;
      UPDATE retail_addresses
        SET recipient=COALESCE(p_recipient,recipient),line1=COALESCE(p_line1,line1),line2=CASE WHEN p_line2='' THEN NULL ELSE COALESCE(p_line2,line2) END,
            city=COALESCE(p_city,city),region=CASE WHEN p_region='' THEN NULL ELSE COALESCE(p_region,region) END,postal_code=CASE WHEN p_postal='' THEN NULL ELSE COALESCE(p_postal,postal_code) END,
            country=COALESCE(p_country,country),phone=CASE WHEN p_phone='' THEN NULL ELSE COALESCE(p_phone,phone) END,
            is_default=CASE WHEN p_archive THEN false WHEN p_default IS TRUE THEN true ELSE is_default END,
            archived_at=CASE WHEN p_archive THEN now() ELSE archived_at END,updated_at=now()
        WHERE id=p_address AND customer_id=customer_row.id RETURNING id INTO out_id;
      IF COALESCE(p_archive,false) AND was_default THEN
        UPDATE retail_addresses SET is_default=true,updated_at=now()
          WHERE id=(SELECT id FROM retail_addresses WHERE customer_id=customer_row.id AND archived_at IS NULL ORDER BY created_at,id LIMIT 1);
      END IF;
    END IF;
  END IF;
  INSERT INTO retail_admin_audit(action,entity_type,entity_id,detail,idempotency_key)
    VALUES('customer.update','customer',p_customer::text,
      retail_customer_update_audit_detail(p_name,p_recipient,p_line1,p_line2,p_city,p_region,p_postal,p_country,p_phone,p_default,p_archive,p_has_address),p_key)
    ON CONFLICT(idempotency_key) DO NOTHING;
  UPDATE retail_admin_idempotency SET response_payload=jsonb_build_object('addressId',out_id) WHERE idempotency_key=p_key;
  RETURN QUERY SELECT out_id,false;
END $$;

-- Replacing the wrapper is essential: the earlier version reconstructed the
-- full request payload before calling the actor-attribution helper.
CREATE OR REPLACE FUNCTION retail_update_admin_customer_as_actor(
  p_customer UUID,p_name TEXT,p_address UUID,p_recipient TEXT,p_line1 TEXT,p_line2 TEXT,p_city TEXT,p_region TEXT,p_postal TEXT,p_country TEXT,p_phone TEXT,p_default BOOLEAN,p_archive BOOLEAN,p_has_address BOOLEAN,p_key UUID,
  p_actor_id TEXT,p_actor_name TEXT,p_actor_role TEXT,p_legacy BOOLEAN
) RETURNS TABLE(address_id UUID,replayed BOOLEAN) LANGUAGE plpgsql AS $$
DECLARE result RECORD;
BEGIN
  SELECT * INTO result FROM retail_update_admin_customer(p_customer,p_name,p_address,p_recipient,p_line1,p_line2,p_city,p_region,p_postal,p_country,p_phone,p_default,p_archive,p_has_address,p_key);
  PERFORM retail_attribute_admin_audit(p_key,'customer.update','customer',p_customer::text,
    retail_customer_update_audit_detail(p_name,p_recipient,p_line1,p_line2,p_city,p_region,p_postal,p_country,p_phone,p_default,p_archive,p_has_address),
    p_actor_id,p_actor_name,p_actor_role,p_legacy);
  RETURN QUERY SELECT result.address_id,result.replayed;
END $$;
