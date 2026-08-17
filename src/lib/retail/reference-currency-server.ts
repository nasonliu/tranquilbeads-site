import "server-only";

import {
  DEFAULT_REFERENCE_CURRENCY_SNAPSHOT,
  hasCompleteReferenceRates,
  isReferenceCurrencySnapshot,
  type ReferenceCurrencySnapshot,
} from "@/src/lib/retail/reference-currency";

const MAX_SNAPSHOT_AGE_MS = 7 * 24 * 60 * 60 * 1_000;
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1_000;

// Display-only reference snapshot. Variable rates are ECB reference rates for
// 2026-07-29 (via Frankfurter); AED and SAR use their official USD peg rates.
// Checkout, accounting, refunds, and PayPal remain USD-only.
const checkedInSnapshot: ReferenceCurrencySnapshot = {
  base: "USD",
  asOf: "2026-07-29T16:00:00.000Z",
  source: "ECB reference rates via Frankfurter; CBUAE and SAMA USD peg rates",
  version: "2026-07-29-v1",
  rateMicros: {
    USD: 1_000_000,
    AED: 3_672_500,
    SAR: 3_750_000,
    CNY: 6_766_300,
    EUR: 878_730,
    GBP: 752_500,
  },
};

export function isFreshCompleteReferenceCurrencySnapshot(value: unknown, now = Date.now()): value is ReferenceCurrencySnapshot {
  if (!isReferenceCurrencySnapshot(value) || !hasCompleteReferenceRates(value)) return false;
  const asOf = Date.parse(value.asOf);
  return asOf <= now + MAX_FUTURE_SKEW_MS && now - asOf <= MAX_SNAPSHOT_AGE_MS;
}

function parseConfiguredSnapshot(now: number): ReferenceCurrencySnapshot | undefined {
  const configured = process.env.RETAIL_REFERENCE_CURRENCY_SNAPSHOT_JSON;
  if (!configured) return undefined;
  try {
    const parsed: unknown = JSON.parse(configured);
    return isFreshCompleteReferenceCurrencySnapshot(parsed, now) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

type FrankfurterResponse = { date?: unknown; rates?: Record<string, unknown> };

function snapshotFromFrankfurter(value: FrankfurterResponse, now: number): ReferenceCurrencySnapshot | undefined {
  if (typeof value.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.date) || !value.rates) return undefined;
  const rate = (currency: "CNY" | "EUR" | "GBP") => {
    const valueForCurrency = value.rates?.[currency];
    return typeof valueForCurrency === "number" && Number.isFinite(valueForCurrency) && valueForCurrency > 0 ? Math.round(valueForCurrency * 1_000_000) : undefined;
  };
  const cny = rate("CNY"); const eur = rate("EUR"); const gbp = rate("GBP");
  if (!cny || !eur || !gbp) return undefined;
  const snapshot: ReferenceCurrencySnapshot = {
    base: "USD",
    asOf: `${value.date}T16:00:00.000Z`,
    source: "ECB reference rates via Frankfurter; CBUAE and SAMA USD peg rates",
    version: `${value.date}-ecb-pegs-v1`,
    rateMicros: { USD: 1_000_000, AED: 3_672_500, SAR: 3_750_000, CNY: cny, EUR: eur, GBP: gbp },
  };
  return isFreshCompleteReferenceCurrencySnapshot(snapshot, now) ? snapshot : undefined;
}

export function getRetailReferenceCurrencySnapshot(): ReferenceCurrencySnapshot {
  const now = Date.now();
  const configured = parseConfiguredSnapshot(now);
  if (configured) return configured;
  return isFreshCompleteReferenceCurrencySnapshot(checkedInSnapshot, now) ? checkedInSnapshot : DEFAULT_REFERENCE_CURRENCY_SNAPSHOT;
}

export async function refreshRetailReferenceCurrencySnapshot(): Promise<ReferenceCurrencySnapshot | undefined> {
  const now = Date.now();
  const configured = parseConfiguredSnapshot(now);
  if (configured) return configured;
  try {
    const response = await fetch("https://api.frankfurter.app/latest?from=USD&to=CNY,EUR,GBP", {
      next: { revalidate: 43_200 },
      signal: AbortSignal.timeout(2_500),
    });
    if (response.ok) {
      const live = snapshotFromFrankfurter(await response.json() as FrankfurterResponse, now);
      if (live) return live;
    }
  } catch { /* a reference-rate outage must never affect USD checkout */ }
  return undefined;
}
