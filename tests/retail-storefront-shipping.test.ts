import { describe, expect, it } from "vitest";

import { packMixedCartParcel } from "@/src/lib/retail/storefront-shipping";

describe("retail storefront dynamic shipping", () => {
  it("aggregates actual weight once and grows parcel volume for multiple items", () => {
    const one = packMixedCartParcel([{ sku: "A", quantity: 1, weightGrams: 250, lengthMm: 160, widthMm: 110, heightMm: 55 }]);
    const mixed = packMixedCartParcel([
      { sku: "A", quantity: 2, weightGrams: 250, lengthMm: 160, widthMm: 110, heightMm: 55 },
      { sku: "B", quantity: 1, weightGrams: 180, lengthMm: 140, widthMm: 90, heightMm: 45 },
    ]);
    expect(one).toMatchObject({ weightGrams: 330, itemCount: 1 });
    expect(mixed.weightGrams).toBe(760);
    expect(mixed.itemCount).toBe(3);
    expect(mixed.volumeCm3).toBeGreaterThan(one.volumeCm3);
    expect(mixed.lengthMm).toBeGreaterThanOrEqual(one.lengthMm);
  });

  it("fails closed when a sellable SKU has no complete parcel facts", () => {
    expect(() => packMixedCartParcel([{ sku: "A", quantity: 1, weightGrams: 0, lengthMm: 160, widthMm: 110, heightMm: 55 }])).toThrow("shipping_facts_missing");
  });
});
