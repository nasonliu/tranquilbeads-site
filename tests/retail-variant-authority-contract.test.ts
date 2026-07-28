import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("variant-authoritative retail administration", () => {
  it("creates a default sellable variant and both compatibility mirrors atomically", () => {
    const migration = read("migrations/20260804_retail_variant_authority.sql");
    expect(migration).toContain("retail_create_admin_product_variant_authority_as_actor");
    expect(migration).toContain("INSERT INTO retail_product_variants");
    expect(migration).toContain("INSERT INTO retail_variant_price_history");
    expect(migration).toContain("INSERT INTO retail_variant_inventory_balances");
    expect(migration).toContain("retail_sync_product_inventory_from_variants");
  });

  it("routes old product price and stock controls through the default variant", () => {
    const migration = read("migrations/20260804_retail_variant_authority.sql");
    expect(migration).toContain("option_values='{}'::jsonb");
    expect(migration).toContain("retail_change_product_price_as_actor");
    expect(migration).toContain("retail_adjust_inventory_as_actor");
    const operations = read("src/lib/retail/operations.ts");
    expect(operations).toContain("retail_create_admin_product_variant_authority_as_actor");
    expect(operations).toContain("onHand: z.number().int().nonnegative().default(0)");
  });

  it("keeps catalog variant stock and the product compatibility mirror in one transaction", () => {
    const catalog = read("src/lib/retail/catalog-admin.ts");
    expect(catalog).toContain("retail_sync_product_inventory_from_variants");
    expect(catalog).toContain("retail_sync_product_default_variant_price");
  });
});
