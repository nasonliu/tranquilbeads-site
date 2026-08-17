\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  customer_internal UUID;
  customer_public UUID;
  first_address UUID;
  second_address UUID;
  created RECORD;
  replay RECORD;
  observed BOOLEAN;
BEGIN
  INSERT INTO retail_customers(email,name) VALUES('address-admin@example.test','Address Admin')
    RETURNING id,public_id INTO customer_internal,customer_public;
  INSERT INTO retail_addresses(customer_id,recipient,line1,city,country,is_default)
    VALUES(customer_internal,'First recipient','1 First Street','Dubai','AE',true) RETURNING id INTO first_address;
  INSERT INTO retail_addresses(customer_id,recipient,line1,city,country,is_default)
    VALUES(customer_internal,'Second recipient','2 Second Street','Abu Dhabi','AE',false) RETURNING id INTO second_address;

  PERFORM retail_record_admin_customer_address_pii_view(customer_public,'owner-a','Owner A','owner',false);
  IF NOT EXISTS(SELECT 1 FROM retail_admin_audit WHERE action='customer.address.pii.view' AND entity_id=customer_public::text AND actor_id='owner-a') THEN
    RAISE EXCEPTION 'customer PII view was not audited';
  END IF;
  BEGIN
    PERFORM retail_record_admin_customer_address_pii_view(customer_public,'warehouse-a','Warehouse A','warehouse',false);
    RAISE EXCEPTION 'warehouse unexpectedly read customer address PII';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%not permitted%' THEN RAISE; END IF;
  END;

  SELECT * INTO created FROM retail_update_admin_customer_as_actor(
    customer_public,NULL,first_address,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,true,true,
    '60000000-0000-4000-8000-000000000001'::uuid,'owner-a','Owner A','owner',false
  );
  IF created.address_id <> first_address OR created.replayed THEN RAISE EXCEPTION 'archive mutation did not return exact address'; END IF;
  SELECT is_default INTO observed FROM retail_addresses WHERE id=first_address;
  IF observed THEN RAISE EXCEPTION 'archived address remained default'; END IF;
  SELECT is_default INTO observed FROM retail_addresses WHERE id=second_address;
  IF NOT observed THEN RAISE EXCEPTION 'archiving default did not promote another active address'; END IF;

  SELECT * INTO created FROM retail_update_admin_customer_as_actor(
    customer_public,NULL,second_address,'Second recipient','2 Updated Street','','Abu Dhabi Updated','','','AE','',true,false,true,
    '60000000-0000-4000-8000-000000000003'::uuid,'owner-a','Owner A','owner',false
  );
  IF created.address_id <> second_address THEN RAISE EXCEPTION 'address edit did not return selected address'; END IF;
  IF NOT EXISTS(SELECT 1 FROM retail_addresses WHERE id=second_address AND city='Abu Dhabi Updated' AND line2 IS NULL AND region IS NULL AND postal_code IS NULL AND phone IS NULL AND is_default) THEN
    RAISE EXCEPTION 'address edit did not persist exact fields/default/clears';
  END IF;

  SELECT * INTO replay FROM retail_update_admin_customer_as_actor(
    customer_public,NULL,first_address,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,true,true,
    '60000000-0000-4000-8000-000000000001'::uuid,'owner-a','Owner A','owner',false
  );
  IF NOT replay.replayed OR replay.address_id <> first_address THEN RAISE EXCEPTION 'customer address replay was not idempotent'; END IF;

  INSERT INTO retail_customers(email,name) VALUES('address-first@example.test','First Address')
    RETURNING public_id INTO customer_public;
  SELECT * INTO created FROM retail_update_admin_customer_as_actor(
    customer_public,NULL,NULL,'New recipient','3 New Street',NULL,'Sharjah',NULL,NULL,'AE','5550000',NULL,false,true,
    '60000000-0000-4000-8000-000000000002'::uuid,'owner-a','Owner A','owner',false
  );
  SELECT is_default INTO observed FROM retail_addresses WHERE id=created.address_id;
  IF NOT observed THEN RAISE EXCEPTION 'first active address was not made default'; END IF;
  IF EXISTS(
    SELECT 1 FROM retail_admin_audit
      WHERE idempotency_key='60000000-0000-4000-8000-000000000002'::uuid
        AND (detail::text LIKE '%New recipient%' OR detail::text LIKE '%3 New Street%' OR detail::text LIKE '%5550000%' OR detail ? 'line1' OR detail ? 'phone')
  ) THEN RAISE EXCEPTION 'customer update audit retained address PII'; END IF;
  IF NOT EXISTS(
    SELECT 1 FROM retail_admin_audit
      WHERE idempotency_key='60000000-0000-4000-8000-000000000002'::uuid
        AND detail->>'line1Changed'='true' AND actor_id='owner-a'
  ) THEN RAISE EXCEPTION 'sanitized customer audit did not retain actor and field metadata'; END IF;
END $$;

ROLLBACK;
