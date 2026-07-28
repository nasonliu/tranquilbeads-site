\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  created RECORD;
  replay RECORD;
  updated RECORD;
  media RECORD;
  media_replay RECORD;
  zone RECORD;
  product_id UUID;
  first_image UUID;
  second_image UUID;
  stored_title TEXT;
  stored_description TEXT;
  first_position SMALLINT;
  second_position SMALLINT;
BEGIN
  SELECT * INTO created
    FROM retail_create_admin_product(
      'ZH-TEST-001', 'zh-test-001', 'English title', 'عنوان عربي', '中文标题',
      'English description', 'وصف عربي', '中文描述', 'draft', 1299,
      '10000000-0000-4000-8000-000000000001'::uuid
    );
  IF created.replayed OR created.public_id IS NULL THEN
    RAISE EXCEPTION 'Chinese product create did not return a fresh product';
  END IF;

  SELECT * INTO replay
    FROM retail_create_admin_product(
      'ZH-TEST-001', 'zh-test-001', 'English title', 'عنوان عربي', '中文标题',
      'English description', 'وصف عربي', '中文描述', 'draft', 1299,
      '10000000-0000-4000-8000-000000000001'::uuid
    );
  IF NOT replay.replayed OR replay.public_id <> created.public_id THEN
    RAISE EXCEPTION 'Chinese product create did not replay idempotently';
  END IF;

  SELECT id, title_zh, description_zh
    INTO product_id, stored_title, stored_description
    FROM retail_products WHERE public_id = created.public_id;
  IF stored_title <> '中文标题' OR stored_description <> '中文描述' THEN
    RAISE EXCEPTION 'Chinese product copy was not stored atomically';
  END IF;

  SELECT * INTO updated
    FROM retail_update_admin_product(
      created.public_id, NULL, NULL, NULL, NULL, NULL,
      '更新中文标题', '更新中文描述', true, true, NULL,
      '10000000-0000-4000-8000-000000000002'::uuid
    );
  IF updated.replayed OR updated.public_id <> created.public_id THEN
    RAISE EXCEPTION 'Chinese product update failed';
  END IF;

  SELECT title_zh, description_zh INTO stored_title, stored_description
    FROM retail_products WHERE id = product_id;
  IF stored_title <> '更新中文标题' OR stored_description <> '更新中文描述' THEN
    RAISE EXCEPTION 'Chinese product update was not stored';
  END IF;

  INSERT INTO retail_product_images(product_id, blob_url, blob_key, mime_type, bytes, sha256, position, alt_en, alt_ar)
    VALUES(product_id, 'https://example.test/one.webp', 'test/one.webp', 'image/webp', 10, repeat('1', 64), 0, 'one', 'واحد')
    RETURNING id INTO first_image;
  INSERT INTO retail_product_images(product_id, blob_url, blob_key, mime_type, bytes, sha256, position, alt_en, alt_ar)
    VALUES(product_id, 'https://example.test/two.webp', 'test/two.webp', 'image/webp', 10, repeat('2', 64), 1, 'two', 'اثنان')
    RETURNING id INTO second_image;

  SELECT * INTO media
    FROM retail_reorder_product_media(
      created.public_id, jsonb_build_array(second_image, first_image), 0,
      '10000000-0000-4000-8000-000000000003'::uuid
    );
  IF media.replayed OR media.media_version <> 1 THEN
    RAISE EXCEPTION 'Media reorder did not advance the optimistic version';
  END IF;

  SELECT position INTO first_position FROM retail_product_images WHERE id = first_image;
  SELECT position INTO second_position FROM retail_product_images WHERE id = second_image;
  IF first_position <> 1 OR second_position <> 0 THEN
    RAISE EXCEPTION 'Media reorder did not persist the submitted order';
  END IF;

  SELECT * INTO media_replay
    FROM retail_reorder_product_media(
      created.public_id, jsonb_build_array(second_image, first_image), 0,
      '10000000-0000-4000-8000-000000000003'::uuid
    );
  IF NOT media_replay.replayed OR media_replay.media_version <> 1 THEN
    RAISE EXCEPTION 'Media reorder did not replay idempotently';
  END IF;

  SELECT * INTO zone
    FROM retail_upsert_admin_shipping_zone(
      'ZZ', 'Test zone', 'منطقة اختبار', '测试配送区', true,
      500, 5000, 500, true,
      '10000000-0000-4000-8000-000000000004'::uuid
    );
  IF zone.replayed OR zone.name_zh <> '测试配送区' THEN
    RAISE EXCEPTION 'Chinese shipping-zone copy was not stored atomically';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM retail_admin_audit
      WHERE idempotency_key IN (
        '10000000-0000-4000-8000-000000000001'::uuid,
        '10000000-0000-4000-8000-000000000002'::uuid,
        '10000000-0000-4000-8000-000000000003'::uuid,
        '10000000-0000-4000-8000-000000000004'::uuid
      )
  ) THEN
    RAISE EXCEPTION 'Expected admin audit receipts were not written';
  END IF;
END $$;

ROLLBACK;
