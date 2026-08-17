import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("retail promotion line allocation migration", () => {
  it("keeps scoped discounts on eligible lines and persists the locked quote allocation", () => {
    const source = fs.readFileSync("migrations/20260813_retail_promotion_line_allocation.sql", "utf8");
    const dynamicShippingFix = fs.readFileSync("migrations/20260830_retail_dynamic_shipping_promotion_allocation_fix.sql", "utf8");
    const runner = fs.readFileSync("scripts/run-retail-migrations.mjs", "utf8");
    expect(source).toContain("retail_promotion_line_allocation");
    expect(source).toContain("eligible_subtotal");
    expect(source).toContain("ORDER BY remainder DESC,sku ASC");
    expect(source).toContain("shippingDiscountMinor");
    expect(source).toContain("unit_amount_minor,discount_minor");
    expect(dynamicShippingFix).toContain("retail_promotion_line_allocation");
    expect(dynamicShippingFix).toContain("dynamic_shipping JSONB");
    expect(dynamicShippingFix).toContain("discountMinor");
    expect(dynamicShippingFix).toContain("retail_product_styles style");
    expect(runner).toContain("20260830_retail_dynamic_shipping_promotion_allocation_fix.sql");
  });
});
