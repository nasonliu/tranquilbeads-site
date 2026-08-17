import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("retail variants and promotions migration contract", () => {
  it("keeps V2 intact while adding server-authoritative V3 quote and checkout", () => {
    const migration = read("migrations/20260802_retail_variants_promotions.sql");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS retail_product_variants");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS retail_order_lines");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS retail_promotion_redemptions");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION retail_quote_checkout_v3");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION retail_create_checkout_v3");
    expect(migration).toContain("FOR UPDATE OF v,p,vb,pb");
    expect(migration).toContain("promotion exhausted");
    expect(migration).toContain("retail_sync_variant_order_lifecycle");
    expect(migration).toContain("INSERT INTO retail_product_variants(product_id,sku");
    expect(migration).not.toContain("DROP TABLE retail_products");
  });
});
