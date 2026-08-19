\set ON_ERROR_STOP on

DO $$
DECLARE
  missing_receipts INTEGER;
  missing_columns INTEGER;
BEGIN
  SELECT count(*) INTO missing_receipts
  FROM unnest(ARRAY[
    '20260818_retail_product_styles.sql',
    '20260819_retail_product_pdp_content.sql',
    '20260823_retail_global_shipping_foundation.sql'
  ]) required(name)
  WHERE NOT EXISTS (SELECT 1 FROM retail_schema_migrations migration WHERE migration.name=required.name);
  IF missing_receipts <> 0 THEN RAISE EXCEPTION 'agent catalog migration receipts missing'; END IF;
  IF to_regclass('public.retail_product_styles') IS NULL THEN RAISE EXCEPTION 'agent catalog styles table missing'; END IF;

  SELECT count(*) INTO missing_columns
  FROM (VALUES
    ('retail_products','pdp_highlights'),('retail_products','pdp_details'),('retail_products','pdp_a_plus'),
    ('retail_product_variants','style_id'),('retail_product_variants','shipping_weight_grams'),
    ('retail_product_variants','package_length_mm'),('retail_product_variants','package_width_mm'),
    ('retail_product_variants','package_height_mm'),('retail_product_variants','customs_description_en'),
    ('retail_product_variants','hs_code'),('retail_product_variants','origin_country'),
    ('retail_product_variants','dangerous_goods')
  ) required(table_name,column_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns column_info
    WHERE column_info.table_schema='public'
      AND column_info.table_name=required.table_name
      AND column_info.column_name=required.column_name
  );
  IF missing_columns <> 0 THEN RAISE EXCEPTION 'agent catalog schema columns missing'; END IF;
END $$;

-- Compile and execute every read-only catalogue projection against the fully
-- migrated schema. LIMIT 0 still validates all referenced tables and columns.
SELECT p.public_id,p.pdp_highlights,p.pdp_details,p.pdp_a_plus,p.media_version
FROM retail_products p LIMIT 0;
SELECT s.public_id,s.primary_image_id,s.option_values FROM retail_product_styles s LIMIT 0;
SELECT v.public_id,v.style_id,v.shipping_weight_grams,v.package_length_mm,
  v.package_width_mm,v.package_height_mm,v.customs_description_en,v.hs_code,
  v.origin_country,v.dangerous_goods
FROM retail_product_variants v LIMIT 0;
