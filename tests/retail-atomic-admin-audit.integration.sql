\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE created RECORD; replay RECORD; detached RECORD; observed TEXT; observed_count BIGINT;
BEGIN
  SELECT * INTO created FROM retail_create_admin_product_as_actor(
    'ATOMIC-AUDIT-001','atomic-audit-001','Atomic audit','تدقيق ذري','原子审计','English','عربي','中文','draft',100,
    '20000000-0000-4000-8000-000000000001'::uuid,'owner-a','Owner A','owner',false
  );
  IF created.replayed OR created.public_id IS NULL THEN RAISE EXCEPTION 'actor-aware creation did not create product'; END IF;
  SELECT actor_id INTO observed FROM retail_admin_audit WHERE idempotency_key='20000000-0000-4000-8000-000000000001'::uuid;
  IF observed <> 'owner-a' THEN RAISE EXCEPTION 'atomic attribution was not persisted'; END IF;

  SELECT * INTO replay FROM retail_create_admin_product_as_actor(
    'ATOMIC-AUDIT-001','atomic-audit-001','Atomic audit','تدقيق ذري','原子审计','English','عربي','中文','draft',100,
    '20000000-0000-4000-8000-000000000001'::uuid,'owner-a','Owner A','owner',false
  );
  IF NOT replay.replayed THEN RAISE EXCEPTION 'same actor replay did not return replay'; END IF;

  BEGIN
    PERFORM * FROM retail_create_admin_product_as_actor(
      'ATOMIC-AUDIT-001','atomic-audit-001','Atomic audit','تدقيق ذري','原子审计','English','عربي','中文','draft',100,
      '20000000-0000-4000-8000-000000000001'::uuid,'owner-b','Owner B','owner',false
    );
    RAISE EXCEPTION 'different actor replay unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%idempotency actor conflict%' THEN RAISE; END IF;
  END;
  SELECT actor_id INTO observed FROM retail_admin_audit WHERE idempotency_key='20000000-0000-4000-8000-000000000001'::uuid;
  IF observed <> 'owner-a' THEN RAISE EXCEPTION 'replay overwrote first actor'; END IF;

  SELECT * INTO replay FROM retail_attach_product_image_as_actor(
    created.public_id,'https://example.test/atomic-audit.webp','retail/atomic-audit.webp','image/webp',10,'abc','','',
    '20000000-0000-4000-8000-000000000003'::uuid,'owner-a','Owner A','owner',false
  );
  IF replay.replayed OR replay.id IS NULL THEN RAISE EXCEPTION 'actor-aware media attach did not create image'; END IF;
  SELECT * INTO replay FROM retail_attach_product_image_as_actor(
    created.public_id,'https://example.test/atomic-audit.webp','retail/atomic-audit.webp','image/webp',10,'abc','','',
    '20000000-0000-4000-8000-000000000003'::uuid,'owner-a','Owner A','owner',false
  );
  IF NOT replay.replayed THEN RAISE EXCEPTION 'actor-aware media replay was not recognized'; END IF;
  SELECT actor_id INTO observed FROM retail_admin_audit WHERE idempotency_key='20000000-0000-4000-8000-000000000003'::uuid;
  IF observed <> 'owner-a' THEN RAISE EXCEPTION 'media actor attribution was not persisted'; END IF;
  SELECT count(*) INTO observed_count FROM retail_product_images
    WHERE product_id=(SELECT id FROM retail_products WHERE public_id=created.public_id);
  IF observed_count <> 1 THEN RAISE EXCEPTION 'media replay created % images', observed_count; END IF;

  SELECT * INTO detached FROM retail_detach_product_image_as_actor(replay.id,'owner-a','Owner A','owner',false);
  IF detached.blob_url <> 'https://example.test/atomic-audit.webp' THEN RAISE EXCEPTION 'actor-aware media detach did not return the removed blob'; END IF;
  IF EXISTS(SELECT 1 FROM retail_product_images WHERE id=replay.id) THEN RAISE EXCEPTION 'media detach left the product image attached'; END IF;
  IF NOT EXISTS(SELECT 1 FROM retail_blob_delete_outbox WHERE blob_url=detached.blob_url AND status='pending') THEN RAISE EXCEPTION 'media detach did not queue blob deletion'; END IF;
  IF NOT EXISTS(SELECT 1 FROM retail_admin_audit WHERE action='product.image.detach' AND entity_id=replay.id::text AND actor_id='owner-a') THEN RAISE EXCEPTION 'media detach actor attribution was not persisted'; END IF;

  BEGIN
    PERFORM * FROM retail_create_admin_product_as_actor(
      'ATOMIC-AUDIT-ROLLBACK','atomic-audit-rollback','Rollback','تراجع','回滚','English','عربي','中文','draft',100,
      '20000000-0000-4000-8000-000000000002'::uuid,'','','owner',false
    );
    RAISE EXCEPTION 'invalid actor unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%invalid admin actor%' THEN RAISE; END IF;
  END;
  SELECT count(*) INTO observed_count FROM retail_products WHERE sku='ATOMIC-AUDIT-ROLLBACK';
  IF observed_count <> 0 THEN RAISE EXCEPTION 'invalid actor did not roll back business mutation'; END IF;
END $$;

ROLLBACK;
