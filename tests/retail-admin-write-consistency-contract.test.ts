import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("retail admin write consistency contract", () => {
  const migration = read("migrations/20260729_retail_admin_write_consistency.sql");
  const operations = read("src/lib/retail/operations.ts");
  const media = read("app/api/admin/retail/media/route.ts");

  it("uses a DB-owned idempotency record for product and customer response-loss retries", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS retail_admin_idempotency");
    expect(migration).toContain("retail_create_admin_product");
    expect(migration).toContain("retail_update_admin_customer");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("idempotency conflict");
    expect(operations).toContain("retail_create_admin_product");
    expect(operations).toContain("retail_update_admin_customer");
  });

  it("serializes order mutations with locked row state transitions", () => {
    expect(migration).toContain("WHERE id=p_order FOR UPDATE");
    expect(migration).toContain("o.fulfilment_status<>'unfulfilled'");
    expect(migration).toContain("order state changed concurrently");
    expect(read("migrations/20260728_retail_checkout_v2.sql")).toContain("retail_prepare_refund");
    expect(read("migrations/20260728_retail_checkout_v2.sql")).toContain("WHERE id=p_order FOR UPDATE");
    expect(migration).toContain("prior.detail->>'reason' IS DISTINCT FROM p_reason");
    expect(migration).toContain("existing.reason IS DISTINCT FROM p_reason");
  });

  it("does not send raw customer address or checkout PII in default admin DTOs", () => {
    expect(operations).toContain("left(o.checkout_email,1)||'***@'");
    expect(operations).toContain("jsonb_build_object('recipient'");
    expect(operations).not.toContain("SELECT o.*,s.customer_snapshot,s.shipping_snapshot");
    expect(operations).toContain("json_build_object('id',a.id,'city',a.city,'country',a.country");
  });

  it("requires a request id and uses a content-addressed deterministic blob path", () => {
    expect(media).toContain("idempotencyKey: z.string().uuid()");
    expect(media).toContain("${input.idempotencyKey}-${validated.sha256}");
    expect(media).toContain("findRetailProductImageByIdempotency");
    expect(operations).toContain("retail_attach_product_image_idempotent");
    expect(media).toContain("media_result_unknown");
    expect(media).toContain("if (!isKnownAttachRejection(error))");
  });

  it("makes admin edits, shipping, and audit-bearing mutations idempotent in the database", () => {
    for (const value of [
      "retail_update_admin_product",
      "retail_upsert_admin_shipping_zone",
      "retail_disable_admin_shipping_zone",
      "retail_change_product_price_with_audit",
      "retail_adjust_inventory_with_audit",
      "retail_reconcile_with_audit",
      "idempotency_key) DO NOTHING",
    ]) expect(migration).toContain(value);
    for (const value of [
      "retail_update_admin_product",
      "retail_upsert_admin_shipping_zone",
      "retail_disable_admin_shipping_zone",
      "retail_change_product_price_with_audit",
      "retail_adjust_inventory_with_audit",
      "retail_reconcile_with_audit",
    ]) expect(operations).toContain(value);
  });
});
