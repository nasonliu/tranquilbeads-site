import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import { retailCatalog } from "@/src/data/retail/catalog";
import { calculateRetailOrder } from "@/src/lib/retail/catalog";

describe("retail catalog", () => {
  it("starts empty and never borrows marketplace or wholesale products", () => {
    expect(retailCatalog).toEqual([]);
    const source = readFileSync("src/data/retail/catalog.ts", "utf8");
    expect(source).not.toMatch(/data\/(site|amazon-products|noon-products)|product-retail-links/);
  });

  it("resolves SKU prices only from the server catalog", () => {
    const result = calculateRetailOrder(
      [{ sku: "retail-001", quantity: 2, unitAmount: "0.01" }],
      [{ sku: "retail-001", priceMinor: 1250, currency: "USD", available: true }],
    );

    expect(result).toEqual({ currency: "USD", totalMinor: 2500, items: [{ sku: "retail-001", quantity: 2, unitAmountMinor: 1250 }] });
  });

  it("rejects unknown SKUs, unavailable products, mixed currencies, and unsafe quantities", () => {
    const catalog = [
      { sku: "available", priceMinor: 1000, currency: "USD", available: true },
      { sku: "paused", priceMinor: 1000, currency: "USD", available: false },
      { sku: "other", priceMinor: 1000, currency: "EUR", available: true },
    ];

    expect(() => calculateRetailOrder([{ sku: "missing", quantity: 1 }], catalog)).toThrow("unknown_sku");
    expect(() => calculateRetailOrder([{ sku: "paused", quantity: 1 }], catalog)).toThrow("unavailable_sku");
    expect(() => calculateRetailOrder([{ sku: "available", quantity: 1 }, { sku: "other", quantity: 1 }], catalog)).toThrow("invalid_catalog_item");
    expect(() => calculateRetailOrder([{ sku: "available", quantity: 1 }, { sku: "available", quantity: 1 }], catalog)).toThrow("duplicate_sku");
    expect(() => calculateRetailOrder([{ sku: "available", quantity: 0 }], catalog)).toThrow("invalid_quantity");
  });
});
