import { beforeEach, describe, expect, it, vi } from "vitest";

const { refreshSnapshot } = vi.hoisted(() => ({ refreshSnapshot: vi.fn() }));
vi.mock("@/src/lib/retail/reference-currency-server", () => ({ refreshRetailReferenceCurrencySnapshot: refreshSnapshot }));

import { GET } from "@/app/api/retail/reference-currency/route";

const snapshot = { base: "USD", asOf: "2026-07-30T12:00:00.000Z", source: "test", version: "test-v1", rateMicros: { USD: 1_000_000, AED: 3_672_500, SAR: 3_750_000, CNY: 6_766_300, EUR: 878_730, GBP: 752_500 } };

beforeEach(() => refreshSnapshot.mockReset());

describe("retail reference currency route", () => {
  it("returns a trusted display snapshot without browser or CDN caching", async () => {
    refreshSnapshot.mockResolvedValue(snapshot);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ ok: true, snapshot });
  });

  it("fails independently when display rates are unavailable", async () => {
    refreshSnapshot.mockResolvedValue(undefined);
    const response = await GET();
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ ok: false, error: "reference_rates_unavailable" });
  });
});
