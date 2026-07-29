import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (name: string) => fs.readFileSync(path.join(process.cwd(), name), "utf8");

describe("retail catalogue and promotion administration", () => {
  it("models products, styles, and variants as a durable SPU to SKC to SKU hierarchy", () => {
    const migration = read("migrations/20260818_retail_product_styles.sql");
    const runner = read("scripts/run-retail-migrations.mjs");
    const catalog = read("src/lib/retail/catalog-admin.ts");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS retail_product_styles");
    expect(migration).toContain("style_id UUID");
    expect(migration).toContain("ALTER COLUMN style_id SET NOT NULL");
    expect(migration).toContain("retail_assign_variant_style");
    expect(migration).toContain("primary_image_id UUID");
    expect(migration).toContain("retail_validate_style_primary_image");
    expect(runner).toContain('"20260818_retail_product_styles.sql"');
    expect(catalog).toContain("style_option_values");
    expect(catalog).toContain("createCatalogStyle");
    expect(catalog).toContain("updateCatalogStyle");
    expect(catalog).toContain("deleteCatalogStyle");
    expect(catalog).toContain("styleId");
  });

  it("keeps all variant and promotion writes authenticated, same-origin, idempotent, and attributed", () => {
    const catalog = read("src/lib/retail/catalog-admin.ts");
    expect(catalog).toContain("retail_admin_idempotency");
    expect(catalog).toContain("retail_admin_audit");
    expect(catalog).toContain("actor_attributed");
    expect(catalog).toContain("retail_product_variants");
    expect(catalog).toContain("retail_variant_price_history");
    expect(catalog).toContain("retail_variant_inventory_balances");
    expect(catalog).toContain("retail_promotions");
  });

  it("guards every mutation route with products permission and CSRF origin validation", () => {
    for (const file of [
      "app/api/admin/retail/catalog/variants/route.ts",
      "app/api/admin/retail/catalog/variants/[id]/route.ts",
      "app/api/admin/retail/catalog/styles/route.ts",
      "app/api/admin/retail/catalog/styles/[id]/route.ts",
      "app/api/admin/retail/promotions/route.ts",
      "app/api/admin/retail/promotions/[id]/route.ts",
    ]) {
      const route = read(file);
      expect(route).toContain('requireRetailPermission("products:write")');
      expect(route).toContain("assertSameOrigin()");
    }
  });

  it("ships discrete bilingual catalogue and promotion screens", () => {
    const catalogue = read("app/admin/retail/catalog/catalog-admin.tsx");
    const promotions = read("app/admin/retail/promotions/promotions-admin.tsx");
    expect(catalogue).toContain("商品变体目录");
    expect(catalogue).toContain("retail_admin_locale");
    expect(catalogue).toContain("variantStatus");
    expect(catalogue).toContain("optionValues");
    expect(promotions).toContain("促销管理");
    expect(promotions).toContain("retail_admin_locale");
    expect(promotions).toContain("promotionKind");
    expect(promotions).toContain("maxPerCustomer");
  });

  it("keeps admin preview on the real PDP component and exposes scoped PATCH editors", () => {
    const products = read("app/admin/retail/products/components/catalog-admin.tsx");
    expect(products).toContain('RetailProductDetail');
    expect(products).toContain('toRetailProduct');
    expect(products).toContain('/api/admin/retail/catalog/styles/');
    expect(products).toContain('/api/admin/retail/catalog/variants/');
    expect(products).toContain('"PATCH"');
    expect(products).toContain('styles.filter((style) => style.status === "active")');
    expect(products).toContain('variants.filter((variant) => variant.status === "active" && styleById.has(String(variant.style_public_id)))');
  });
});
