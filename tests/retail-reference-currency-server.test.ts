import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getRetailReferenceCurrencySnapshot,
  isFreshCompleteReferenceCurrencySnapshot,
  refreshRetailReferenceCurrencySnapshot,
} from "@/src/lib/retail/reference-currency-server";

const complete = {
  base: "USD" as const,
  asOf: "2026-07-30T12:00:00.000Z",
  source: "configured test rates",
  version: "configured-v1",
  rateMicros: { USD: 1_000_000, AED: 3_672_500, SAR: 3_750_000, CNY: 6_766_300, EUR: 878_730, GBP: 752_500 },
};

const originalConfiguredSnapshot = process.env.RETAIL_REFERENCE_CURRENCY_SNAPSHOT_JSON;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-30T13:00:00.000Z"));
  delete process.env.RETAIL_REFERENCE_CURRENCY_SNAPSHOT_JSON;
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  if (originalConfiguredSnapshot === undefined) delete process.env.RETAIL_REFERENCE_CURRENCY_SNAPSHOT_JSON;
  else process.env.RETAIL_REFERENCE_CURRENCY_SNAPSHOT_JSON = originalConfiguredSnapshot;
});

describe("retail reference currency server snapshot", () => {
  it("accepts only complete, current, strict UTC snapshots", () => {
    const now = Date.now();
    expect(isFreshCompleteReferenceCurrencySnapshot(complete, now)).toBe(true);
    expect(isFreshCompleteReferenceCurrencySnapshot({ ...complete, asOf: "2026-07-30" }, now)).toBe(false);
    expect(isFreshCompleteReferenceCurrencySnapshot({ ...complete, asOf: "2026-02-30T12:00:00.000Z" }, now)).toBe(false);
    expect(isFreshCompleteReferenceCurrencySnapshot({ ...complete, asOf: "2026-07-30T14:00:00.000Z" }, now)).toBe(false);
    expect(isFreshCompleteReferenceCurrencySnapshot({ ...complete, asOf: "2026-07-01T12:00:00.000Z" }, now)).toBe(false);
    expect(isFreshCompleteReferenceCurrencySnapshot({ ...complete, rateMicros: { USD: 1_000_000 } }, now)).toBe(false);
  });

  it("uses a valid server-only configured snapshot without contacting a provider", async () => {
    process.env.RETAIL_REFERENCE_CURRENCY_SNAPSHOT_JSON = JSON.stringify(complete);
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    expect(getRetailReferenceCurrencySnapshot()).toEqual(complete);
    await expect(refreshRetailReferenceCurrencySnapshot()).resolves.toEqual(complete);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("builds a complete snapshot from fresh ECB-compatible rates", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ date: "2026-07-29", rates: { CNY: 6.7663, EUR: 0.87873, GBP: 0.7525 } }), { status: 200 })));
    await expect(refreshRetailReferenceCurrencySnapshot()).resolves.toMatchObject({
      base: "USD",
      asOf: "2026-07-29T16:00:00.000Z",
      rateMicros: { USD: 1_000_000, AED: 3_672_500, SAR: 3_750_000, CNY: 6_766_300, EUR: 878_730, GBP: 752_500 },
    });
  });

  it("fails closed to USD-only when provider and all trusted snapshots are stale", async () => {
    vi.setSystemTime(new Date("2026-08-30T13:00:00.000Z"));
    process.env.RETAIL_REFERENCE_CURRENCY_SNAPSHOT_JSON = JSON.stringify({ ...complete, asOf: "2026-08-01T12:00:00.000Z" });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("provider unavailable")));
    const snapshot = getRetailReferenceCurrencySnapshot();
    expect(snapshot.rateMicros).toEqual({ USD: 1_000_000 });
    expect(snapshot.version).toBe("usd-only-v1");
  });
});
