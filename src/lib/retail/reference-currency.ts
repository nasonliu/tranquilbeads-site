/**
 * Display-only currency conversion for the USD retail checkout.
 *
 * This module intentionally knows nothing about quotes, orders, PayPal, or
 * request payloads.  A caller may use the converted value in UI copy only;
 * USD minor units remain the only checkout authority.
 */
export const REFERENCE_CURRENCIES = ["USD", "AED", "SAR", "CNY", "EUR", "GBP"] as const;
export type ReferenceCurrency = (typeof REFERENCE_CURRENCIES)[number];

export const USD_MINOR_PER_MAJOR = 100;
export const REFERENCE_RATE_SCALE = 1_000_000;
const MAX_REFERENCE_RATE_MICROS = 1_000_000_000;

/** A server-owned USD-base rate snapshot. `rateMicros` is target-major per USD-major. */
export type ReferenceCurrencySnapshot = Readonly<{
  base: "USD";
  asOf: string;
  source: string;
  version: string;
  rateMicros: Readonly<Partial<Record<ReferenceCurrency, number>>>;
}>;

/**
 * Safe zero-conversion fallback. Production callers should replace this with a
 * dated server-supplied snapshot; it deliberately does not invent volatile FX
 * rates for non-USD currencies.
 */
export const DEFAULT_REFERENCE_CURRENCY_SNAPSHOT: ReferenceCurrencySnapshot = {
  base: "USD",
  asOf: "2026-07-30T00:00:00.000Z",
  source: "ProjectNoor display fallback (USD only; replace with server snapshot)",
  version: "usd-only-v1",
  rateMicros: { USD: REFERENCE_RATE_SCALE },
};

export function isReferenceCurrency(value: unknown): value is ReferenceCurrency {
  return typeof value === "string" && (REFERENCE_CURRENCIES as readonly string[]).includes(value);
}

export function isReferenceCurrencySnapshot(value: unknown): value is ReferenceCurrencySnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<ReferenceCurrencySnapshot>;
  const strictUtc = typeof snapshot.asOf === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(snapshot.asOf) && !Number.isNaN(Date.parse(snapshot.asOf)) && new Date(snapshot.asOf).toISOString() === snapshot.asOf;
  if (snapshot.base !== "USD" || !strictUtc || typeof snapshot.source !== "string" || !snapshot.source.trim() || typeof snapshot.version !== "string" || !snapshot.version.trim() || !snapshot.rateMicros || typeof snapshot.rateMicros !== "object") return false;
  const rates = snapshot.rateMicros as Record<string, unknown>;
  if (rates.USD !== REFERENCE_RATE_SCALE) return false;
  return Object.entries(rates).every(([currency, rate]) => isReferenceCurrency(currency) && Number.isSafeInteger(rate) && (rate as number) > 0 && (rate as number) <= MAX_REFERENCE_RATE_MICROS);
}

export function hasCompleteReferenceRates(snapshot: ReferenceCurrencySnapshot): boolean {
  return REFERENCE_CURRENCIES.every((currency) => Number.isSafeInteger(snapshot.rateMicros[currency]) && (snapshot.rateMicros[currency] ?? 0) > 0);
}

/** Converts USD cents to target cents using integer arithmetic and half-up rounding. */
export function convertUsdMinorToReferenceMinor(usdMinor: number, currency: ReferenceCurrency, snapshot: ReferenceCurrencySnapshot): number | null {
  if (!Number.isSafeInteger(usdMinor) || !isReferenceCurrencySnapshot(snapshot)) return null;
  const rate = snapshot.rateMicros[currency];
  if (!Number.isSafeInteger(rate) || !rate || rate < 1) return null;
  // Split before multiplying. The remainder is smaller than 1e6 and rates
  // are bounded at 1e9, so that product remains an exact safe integer.
  const sign = usdMinor < 0 ? -1 : 1;
  const absolute = Math.abs(usdMinor);
  const quotient = Math.floor(absolute / REFERENCE_RATE_SCALE);
  const remainder = absolute % REFERENCE_RATE_SCALE;
  const whole = quotient * rate;
  const fractional = Math.floor((remainder * rate + Math.floor(REFERENCE_RATE_SCALE / 2)) / REFERENCE_RATE_SCALE);
  const converted = whole + fractional;
  return Number.isSafeInteger(converted) ? sign * converted : null;
}

const localeByStorefrontLocale = { en: "en-US", ar: "ar-AE", zh: "zh-CN" } as const;
export type ReferenceCurrencyLocale = keyof typeof localeByStorefrontLocale;

/** Formats already-authoritative minor units; it performs no conversion. */
export function formatCurrencyMinor(minor: number, currency: ReferenceCurrency, locale: ReferenceCurrencyLocale = "en"): string {
  if (!Number.isSafeInteger(minor)) return "—";
  return new Intl.NumberFormat(localeByStorefrontLocale[locale], {
    style: "currency",
    currency,
    currencyDisplay: "code",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minor / USD_MINOR_PER_MAJOR).replace("-", "−");
}

export type ReferenceMoney = Readonly<{ currency: ReferenceCurrency; minor: number; formatted: string; asOf: string; source: string; version: string }>;

/** Returns null when no trusted display rate exists, so callers keep USD-only UI. */
export function formatUsdReference(usdMinor: number, currency: ReferenceCurrency, snapshot: ReferenceCurrencySnapshot, locale: ReferenceCurrencyLocale = "en"): ReferenceMoney | null {
  const converted = convertUsdMinorToReferenceMinor(usdMinor, currency, snapshot);
  if (converted === null) return null;
  return { currency, minor: converted, formatted: formatCurrencyMinor(converted, currency, locale), asOf: snapshot.asOf, source: snapshot.source, version: snapshot.version };
}
