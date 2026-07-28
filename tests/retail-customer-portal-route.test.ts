// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

const { redeemCustomerPortalToken } = vi.hoisted(() => ({ redeemCustomerPortalToken: vi.fn() }));
vi.mock("@/src/lib/retail/customer-portal", () => ({ redeemCustomerPortalToken }));

import { GET } from "@/app/api/retail/customer/[token]/route";

describe("customer portal API", () => {
  const context = (token: string) => ({ params: Promise.resolve({ token }) });

  it("returns only the safe portal projection with private response headers", async () => {
    redeemCustomerPortalToken.mockResolvedValueOnce({
      orderPublicId: "f176831d-45f0-4f12-8d95-37f39e7a9b6b", paymentStatus: "captured", fulfilmentStatus: "fulfilled", currency: "USD", amountMinor: 1234,
      orderedAt: "2026-08-02T00:00:00.000Z", carrier: "DHL", trackingNumber: "TRACK-1", items: [{ titleEn: "Retail-only bead", quantity: 1 }],
    });
    const response = await GET(new Request("https://preview.example.test/api/retail/customer/token"), context("token"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store, private");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
    const body = await response.json();
    expect(body).toMatchObject({ ok: true, order: { orderPublicId: "f176831d-45f0-4f12-8d95-37f39e7a9b6b", trackingNumber: "TRACK-1" } });
    expect(JSON.stringify(body)).not.toContain("paypal_order_id");
    expect(JSON.stringify(body)).not.toContain("checkout_shipping");
  });

  it("uses one indistinguishable response for malformed, expired, revoked, and missing credentials", async () => {
    redeemCustomerPortalToken.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error("database unavailable"));
    const missing = await GET(new Request("https://preview.example.test/api/retail/customer/nope"), context("nope"));
    const unavailable = await GET(new Request("https://preview.example.test/api/retail/customer/nope"), context("nope"));
    expect(missing.status).toBe(404);
    expect(unavailable.status).toBe(404);
    await expect(missing.json()).resolves.toEqual({ ok: false, error: "portal_unavailable" });
    await expect(unavailable.json()).resolves.toEqual({ ok: false, error: "portal_unavailable" });
  });
});
