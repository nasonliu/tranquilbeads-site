import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("retail atomic admin audit contract", () => {
  it("moves every idempotent production mutation onto an actor-aware SQL entry point", () => {
    const operations = read("src/lib/retail/operations.ts");
    for (const entryPoint of [
      "retail_create_admin_product_variant_authority_as_actor", "retail_update_admin_product_as_actor",
      "retail_change_product_price_as_actor", "retail_adjust_inventory_as_actor",
      "retail_fulfil_order_as_actor", "retail_cancel_order_as_actor",
      "retail_prepare_refund_as_actor", "retail_upsert_admin_shipping_zone_as_actor",
      "retail_disable_admin_shipping_zone_as_actor", "retail_update_admin_customer_as_actor",
      "retail_reconcile_with_actor", "retail_attach_product_image_as_actor",
      "retail_reorder_product_media_as_actor", "retail_detach_product_image_as_actor",
    ]) expect(operations).toContain(entryPoint);
    expect(operations).not.toContain("attributeAdminMutation");
    expect(operations).not.toContain("recordActorAudit");
    expect(operations).toContain('throw new Error("admin_actor_missing")');
  });

  it("seals first-write actor attribution inside the PostgreSQL mutation", () => {
    const migration = read("migrations/20260801_retail_atomic_admin_audit.sql");
    expect(migration).toContain("actor_attributed BOOLEAN NOT NULL DEFAULT false");
    expect(migration).toContain("idempotency actor conflict");
    expect(migration).toContain("invalid admin actor");
    expect(migration).toContain("retail_attribute_admin_audit");
  });
});
