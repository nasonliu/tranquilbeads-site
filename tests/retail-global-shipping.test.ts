import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import { createElement } from "react";

import { ProductLogisticsManager } from "@/app/admin/retail/products/components/product-logistics-admin";
import { retailTrackingUrl } from "@/src/lib/retail/shipping";

const productId = "00000000-0000-4000-8000-000000000001";
const variantId = "00000000-0000-4000-8000-000000000002";
const response = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

afterEach(() => vi.unstubAllGlobals());

describe("global shipping foundation", () => {
  it("links only YunExpress shipments to the first-party YunTrack page", () => {
    expect(retailTrackingUrl("YunExpress", "YT1234567890")).toBe("https://www.yuntrack.com/parcelTracking");
    expect(retailTrackingUrl("Other carrier", "YT1234567890")).toBe("https://www.yuntrack.com/parcelTracking");
    expect(retailTrackingUrl("Other carrier", "ABC123")).toBeNull();
    expect(retailTrackingUrl("YunExpress", "")).toBeNull();
  });

  it("stores parcel and customs facts per sellable SKU", async () => {
    const requests: Array<Record<string, unknown>> = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (!init?.method || init.method === "GET") return response({ ok: true, variants: [{ public_id: variantId, sku: "KUKA-33-8", title_en: "Kuka 33 / 8 mm" }] });
      requests.push(JSON.parse(String(init.body)) as Record<string, unknown>);
      return response({ ok: true, variant: {} });
    }));
    render(createElement(ProductLogisticsManager, { productId, locale: "en" }));
    await screen.findByText("KUKA-33-8");
    fireEvent.change(screen.getByLabelText("Shipping weight (g)"), { target: { value: "180" } });
    fireEvent.change(screen.getByLabelText("Package length (mm)"), { target: { value: "180" } });
    fireEvent.change(screen.getByLabelText("Package width (mm)"), { target: { value: "120" } });
    fireEvent.change(screen.getByLabelText("Package height (mm)"), { target: { value: "45" } });
    fireEvent.change(screen.getByLabelText("Customs description (English)"), { target: { value: "Prayer beads in gift box" } });
    fireEvent.change(screen.getByLabelText("HS code"), { target: { value: "711790" } });
    fireEvent.change(screen.getByLabelText("Country of origin (ISO-2)"), { target: { value: "cn" } });
    fireEvent.click(screen.getByRole("button", { name: "Save logistics profile" }));
    await vi.waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]).toMatchObject({ shippingWeightGrams: 180, packageLengthMm: 180, packageWidthMm: 120, packageHeightMm: 45, customsDescriptionEn: "Prayer beads in gift box", hsCode: "711790", originCountry: "CN", dangerousGoods: false });
  });

  it("keeps provider rates disabled until an operator supplies real facts", () => {
    const migration = fs.readFileSync("migrations/20260823_retail_global_shipping_foundation.sql", "utf8");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS carrier");
    expect(migration).toContain("service_code");
    expect(migration).toContain("duties_mode");
    expect(migration).not.toMatch(/INSERT INTO retail_shipping_zones[\s\S]*VALUES\('(?:US|AE|SA)'/);
  });
});
