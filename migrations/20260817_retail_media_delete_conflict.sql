-- PL/pgSQL output columns named blob_url/blob_key made the original
-- ON CONFLICT(blob_url) target ambiguous at execution time.  An untargeted
-- conflict handler is sufficient because blob_url is the only caller-supplied
-- unique value in this insert.
CREATE OR REPLACE FUNCTION retail_detach_product_image(p_image UUID)
RETURNS TABLE(blob_url TEXT,blob_key TEXT) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY WITH removed AS (
    DELETE FROM retail_product_images WHERE id=p_image
      RETURNING retail_product_images.blob_url,retail_product_images.blob_key
  ), queued AS (
    INSERT INTO retail_blob_delete_outbox(blob_url)
      SELECT removed.blob_url FROM removed ON CONFLICT DO NOTHING
  ) SELECT removed.blob_url,removed.blob_key FROM removed;
END $$;
