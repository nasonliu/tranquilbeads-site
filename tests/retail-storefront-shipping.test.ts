import { afterEach, describe, expect, it } from "vitest";

import { chooseStorefrontShippingRate, packMixedCartParcel } from "@/src/lib/retail/storefront-shipping";

describe("retail storefront dynamic shipping", () => {
  const snapshot = { base: "USD" as const, asOf: "2026-08-17T00:00:00.000Z", source: "test", version: "test-v1", rateMicros: { USD: 1_000_000, CNY: 7_000_000, EUR: 900_000 } };
  afterEach(() => { delete process.env.RETAIL_YUNEXPRESS_SERVICE_CODES; });

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

  it("compares provider currencies only after converting them into buffered USD", () => {
    const rates = [
      { productCode: "FAST", productName: "Fast", priceName: "Contract", priceType: "A", amount: 85, currency: "CNY", deliveryWindow: "5-8", origin: "SZ", fees: [] },
      { productCode: "VALUE", productName: "Value", priceName: "Contract", priceType: "A", amount: 52, currency: "CNY", deliveryWindow: "8-12", origin: "SZ", fees: [] },
      { productCode: "USD", productName: "USD", priceName: "Contract", priceType: "A", amount: 8, currency: "USD", deliveryWindow: "5-8", origin: "SZ", fees: [] },
    ];
    expect(chooseStorefrontShippingRate(rates, snapshot, 1_000)).toMatchObject({ rate: { productCode: "VALUE" }, providerShippingMinor: 818 });
  });

  it("honors an explicit service allowlist when operations configures one", () => {
    process.env.RETAIL_YUNEXPRESS_SERVICE_CODES = "FAST";
    expect(chooseStorefrontShippingRate([
      { productCode: "FAST", productName: "Fast", priceName: "Contract", priceType: "A", amount: 85, currency: "CNY", deliveryWindow: "5-8", origin: "SZ", fees: [] },
      { productCode: "VALUE", productName: "Value", priceName: "Contract", priceType: "A", amount: 52, currency: "CNY", deliveryWindow: "8-12", origin: "SZ", fees: [] },
    ], snapshot, 1_000)).toMatchObject({ rate: { productCode: "FAST" } });
  });
});
