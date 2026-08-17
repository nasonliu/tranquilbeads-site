import "server-only";

import crypto from "node:crypto";
import { z } from "zod";

import { guardedRetailSql } from "./database-identity";
import { isReferenceCurrency, type ReferenceCurrencySnapshot } from "./reference-currency";
import { getRetailReferenceCurrencySnapshot, refreshRetailReferenceCurrencySnapshot } from "./reference-currency-server";
import { quoteYunExpressShipping, listYunExpressCountries, type YunExpressCountry, type YunExpressRate } from "./yunexpress";

export type ShippingCartItem = { variantSku: string; quantity: number };

type ParcelFact = {
  sku: string;
  quantity: number;
  weightGrams: number;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
};

export type PackedParcel = {
  weightGrams: number;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  volumeCm3: number;
  itemCount: number;
};

const QUOTE_TTL_SECONDS = 15 * 60;
const DEFAULT_BUFFER_BPS = 1_000;
const DEFAULT_FREE_SHIPPING_THRESHOLD_MINOR = 9_900;
const DEFAULT_PACKAGING_WEIGHT_GRAMS = 80;
const DEFAULT_PADDING_MM = 10;
const DEFAULT_VOID_BPS = 1_500;

const quotePayloadDto = z.object({
  v: z.literal(1),
  exp: z.number().int().positive(),
  cartHash: z.string().regex(/^[0-9a-f]{64}$/),
  country: z.string().regex(/^[A-Z]{2}$/),
  postalCode: z.string().max(30),
  shippingMinor: z.number().int().nonnegative(),
  providerShippingMinor: z.number().int().positive(),
  carrier: z.literal("YunExpress"),
  serviceCode: z.string().min(1).max(100),
  serviceName: z.string().max(200),
  deliveryWindow: z.string().max(100),
  dutiesMode: z.enum(["DAP", "DDP"]),
  quotedAt: z.string().datetime({ offset: true }),
  expiresAt: z.string().datetime({ offset: true }),
  package: z.object({
    weightGrams: z.number().int().positive(),
    lengthMm: z.number().int().positive(),
    widthMm: z.number().int().positive(),
    heightMm: z.number().int().positive(),
    itemCount: z.number().int().positive(),
  }).strict(),
  fx: z.object({ asOf: z.string().datetime({ offset: true }), version: z.string().min(1), currency: z.string().regex(/^[A-Z]{3}$/), currencyPerUsdMicros: z.number().int().positive(), bufferBps: z.number().int().min(0).max(10_000) }).strict(),
}).strict();

type ShippingQuotePayload = z.infer<typeof quotePayloadDto>;

function integerEnv(name: string, fallback: number, minimum: number, maximum: number) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value >= minimum && value <= maximum ? value : fallback;
}

export function isStorefrontDynamicShippingEnabled() {
  return process.env.RETAIL_DYNAMIC_SHIPPING_ENABLED === "true";
}

function quoteSecret() {
  const secret = process.env.RETAIL_SHIPPING_QUOTE_SECRET?.trim()
    || process.env.RETAIL_PORTAL_TOKEN_SECRET?.trim()
    || process.env.ADMIN_RETAIL_SESSION_SECRET?.trim();
  if (!secret || secret.length < 32) throw new Error("shipping_quote_not_configured");
  return crypto.createHash("sha256").update(`retail-shipping-v1:${secret}`, "utf8").digest();
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function normalizedCart(items: ShippingCartItem[]) {
  return [...items].map((item) => ({ variantSku: item.variantSku.trim(), quantity: item.quantity })).sort((left, right) => left.variantSku.localeCompare(right.variantSku));
}

function cartHash(items: ShippingCartItem[]) {
  return crypto.createHash("sha256").update(stableJson(normalizedCart(items)), "utf8").digest("hex");
}

function encodePayload(payload: ShippingQuotePayload) {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = crypto.createHmac("sha256", quoteSecret()).update(body, "utf8").digest("base64url");
  return `${body}.${signature}`;
}

function decodePayload(token: string) {
  const [body, supplied, extra] = token.split(".");
  if (!body || !supplied || extra) throw new Error("shipping_quote_invalid");
  const expected = crypto.createHmac("sha256", quoteSecret()).update(body, "utf8").digest();
  let actual: Buffer;
  try { actual = Buffer.from(supplied, "base64url"); } catch { throw new Error("shipping_quote_invalid"); }
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) throw new Error("shipping_quote_invalid");
  try { return quotePayloadDto.parse(JSON.parse(Buffer.from(body, "base64url").toString("utf8"))); }
  catch { throw new Error("shipping_quote_invalid"); }
}

/**
 * Packs a mixed cart into one conservative rectangular parcel. The largest
 * item face is retained and stacked volume receives a configurable void
 * allowance; outer packaging weight and padding are added once per order.
 */
export function packMixedCartParcel(facts: ParcelFact[], options: { packagingWeightGrams?: number; paddingMm?: number; voidBps?: number } = {}): PackedParcel {
  if (!facts.length) throw new Error("shipping_facts_missing");
  const packagingWeight = options.packagingWeightGrams ?? DEFAULT_PACKAGING_WEIGHT_GRAMS;
  const padding = options.paddingMm ?? DEFAULT_PADDING_MM;
  const voidBps = options.voidBps ?? DEFAULT_VOID_BPS;
  let itemCount = 0, weight = packagingWeight, volumeMm3 = 0, maxLength = 0, maxWidth = 0, maxHeight = 0;
  for (const fact of facts) {
    if (![fact.quantity, fact.weightGrams, fact.lengthMm, fact.widthMm, fact.heightMm].every((value) => Number.isInteger(value) && value > 0)) throw new Error("shipping_facts_missing");
    const dimensions = [fact.lengthMm, fact.widthMm, fact.heightMm].sort((a, b) => b - a);
    itemCount += fact.quantity;
    weight += fact.weightGrams * fact.quantity;
    volumeMm3 += dimensions[0] * dimensions[1] * dimensions[2] * fact.quantity;
    maxLength = Math.max(maxLength, dimensions[0]);
    maxWidth = Math.max(maxWidth, dimensions[1]);
    maxHeight = Math.max(maxHeight, dimensions[2]);
  }
  const packedVolume = Math.ceil(volumeMm3 * (10_000 + voidBps) / 10_000);
  const stackedHeight = Math.max(maxHeight, Math.ceil(packedVolume / (maxLength * maxWidth)));
  const dimensions = [maxLength + padding * 2, maxWidth + padding * 2, stackedHeight + padding * 2].sort((a, b) => b - a);
  if (weight > 30_000 || dimensions.some((value) => value > 2_000)) throw new Error("shipping_parcel_too_large");
  return { weightGrams: weight, lengthMm: dimensions[0], widthMm: dimensions[1], heightMm: dimensions[2], volumeCm3: Number(((dimensions[0] * dimensions[1] * dimensions[2]) / 1_000).toFixed(1)), itemCount };
}

async function loadParcelFacts(items: ShippingCartItem[]) {
  const rows = await guardedRetailSql()`SELECT v.sku,v.shipping_weight_grams,v.package_length_mm,v.package_width_mm,v.package_height_mm,
      price.amount_minor,balance.on_hand,balance.reserved
    FROM retail_product_variants v JOIN retail_product_styles style ON style.id=v.style_id AND style.status='active'
    JOIN retail_products product ON product.id=v.product_id AND product.status='published'
    JOIN retail_variant_inventory_balances balance ON balance.variant_id=v.id
    JOIN LATERAL(SELECT amount_minor FROM retail_variant_price_history WHERE variant_id=v.id AND active=true ORDER BY created_at DESC LIMIT 1) price ON true
    WHERE v.sku=ANY(${normalizedCart(items).map((item) => item.variantSku)}::text[]) AND v.status='active' ORDER BY v.sku`;
  if (rows.length !== items.length) throw new Error("shipping_facts_missing");
  const quantities = new Map(items.map((item) => [item.variantSku, item.quantity]));
  let subtotalMinor = 0;
  const facts = rows.map((row) => {
    const quantity = quantities.get(String(row.sku)) ?? 0;
    if (Number(row.on_hand) - Number(row.reserved) < quantity) throw new Error("unavailable sku");
    subtotalMinor += Number(row.amount_minor) * quantity;
    return {
    sku: String(row.sku), quantity: quantities.get(String(row.sku)) ?? 0,
    weightGrams: Number(row.shipping_weight_grams), lengthMm: Number(row.package_length_mm),
    widthMm: Number(row.package_width_mm), heightMm: Number(row.package_height_mm),
    };
  });
  if (!Number.isSafeInteger(subtotalMinor) || subtotalMinor < 1) throw new Error("invalid cart total");
  return { facts, subtotalMinor };
}

function allowedServiceCodes() {
  const configured = process.env.RETAIL_YUNEXPRESS_SERVICE_CODES?.split(",").map((value) => value.trim()).filter(Boolean);
  return configured?.length ? new Set(configured) : null;
}

function amountToBufferedUsdMinor(amount: number, currencyPerUsdMicros: number, bufferBps: number) {
  const sourceMinor = Math.ceil(amount * 100);
  const numerator = sourceMinor * 1_000_000 * (10_000 + bufferBps);
  const denominator = currencyPerUsdMicros * 10_000;
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator)) throw new Error("shipping_fx_unavailable");
  const result = Math.ceil(numerator / denominator);
  if (!Number.isSafeInteger(result) || result < 1) throw new Error("shipping_fx_unavailable");
  return result;
}

export function chooseStorefrontShippingRate(rates: YunExpressRate[], snapshot: ReferenceCurrencySnapshot, bufferBps: number) {
  const allowed = allowedServiceCodes();
  const eligible = rates.flatMap((rate) => {
    const providerCurrency = rate.currency.trim().toUpperCase();
    const currency = providerCurrency === "RMB" || providerCurrency === "CNH" ? "CNY" : providerCurrency;
    const currencyPerUsdMicros = isReferenceCurrency(currency) ? snapshot.rateMicros[currency] : undefined;
    if ((allowed && !allowed.has(rate.productCode)) || !currencyPerUsdMicros || !Number.isFinite(rate.amount) || rate.amount <= 0) return [];
    return [{ rate, currency, currencyPerUsdMicros, providerShippingMinor: amountToBufferedUsdMinor(rate.amount, currencyPerUsdMicros, bufferBps) }];
  });
  if (!eligible.length) {
    console.warn("storefront_shipping_no_eligible_rate", {
      returnedRates: rates.length,
      returnedCurrencies: [...new Set(rates.map((rate) => rate.currency.trim().toUpperCase()))].sort(),
      allowlistConfigured: Boolean(allowed),
    });
    throw new Error("shipping_service_unavailable");
  }
  return eligible.sort((left, right) => left.providerShippingMinor - right.providerShippingMinor || left.rate.productCode.localeCompare(right.rate.productCode))[0];
}

async function shippingFxSnapshot() {
  const refreshed = await refreshRetailReferenceCurrencySnapshot();
  const snapshot = refreshed ?? getRetailReferenceCurrencySnapshot();
  if (!snapshot.rateMicros.USD) throw new Error("shipping_fx_unavailable");
  return snapshot;
}

export type StorefrontShippingQuote = {
  token: string;
  internal: Record<string, unknown>;
  public: {
    carrier: "YunExpress";
    serviceCode: string;
    serviceName: string;
    deliveryWindow: string;
    dutiesMode: "DAP" | "DDP";
    expiresAt: string;
    package: PackedParcel;
  };
};

function internalShipping(payload: ShippingQuotePayload) {
  return {
    amountMinor: payload.shippingMinor,
    providerShippingMinor: payload.providerShippingMinor,
    taxRateBps: 0,
    carrier: payload.carrier,
    serviceCode: payload.serviceCode,
    serviceName: payload.serviceName,
    deliveryWindow: payload.deliveryWindow,
    dutiesMode: payload.dutiesMode,
    rateSource: "provider_api",
    quotedAt: payload.quotedAt,
    expiresAt: payload.expiresAt,
    package: payload.package,
    fx: payload.fx,
  };
}

export async function createStorefrontShippingQuote(items: ShippingCartItem[], checkout: { country: string; postalCode?: string }, now = Date.now()): Promise<StorefrontShippingQuote | null> {
  if (!isStorefrontDynamicShippingEnabled()) return null;
  const country = checkout.country.trim().toUpperCase(), postalCode = checkout.postalCode?.trim() ?? "";
  const loaded = await loadParcelFacts(items);
  const parcel = packMixedCartParcel(loaded.facts, {
    packagingWeightGrams: integerEnv("RETAIL_SHIPPING_PACKAGING_WEIGHT_GRAMS", DEFAULT_PACKAGING_WEIGHT_GRAMS, 0, 5_000),
    paddingMm: integerEnv("RETAIL_SHIPPING_PADDING_MM", DEFAULT_PADDING_MM, 0, 100),
    voidBps: integerEnv("RETAIL_SHIPPING_PACKING_VOID_BPS", DEFAULT_VOID_BPS, 0, 10_000),
  });
  const rates = await quoteYunExpressShipping({ countryCode: country, postalCode, weightGrams: parcel.weightGrams, lengthMm: parcel.lengthMm, widthMm: parcel.widthMm, heightMm: parcel.heightMm, packageType: "C" });
  const snapshot = await shippingFxSnapshot();
  const bufferBps = integerEnv("RETAIL_SHIPPING_BUFFER_BPS", DEFAULT_BUFFER_BPS, 0, 10_000);
  const selected = chooseStorefrontShippingRate(rates, snapshot, bufferBps);
  const { rate, providerShippingMinor, currency, currencyPerUsdMicros } = selected;
  const freeThreshold = integerEnv("RETAIL_FREE_SHIPPING_THRESHOLD_USD_MINOR", DEFAULT_FREE_SHIPPING_THRESHOLD_MINOR, 1, 100_000_000);
  const shippingMinor = loaded.subtotalMinor >= freeThreshold ? 0 : providerShippingMinor;
  const quotedAt = new Date(now).toISOString(), expiresAt = new Date(now + QUOTE_TTL_SECONDS * 1_000).toISOString();
  const payload: ShippingQuotePayload = {
    v: 1, exp: Math.floor(now / 1_000) + QUOTE_TTL_SECONDS, cartHash: cartHash(items), country, postalCode,
    shippingMinor, providerShippingMinor, carrier: "YunExpress", serviceCode: rate.productCode,
    serviceName: rate.productName, deliveryWindow: rate.deliveryWindow, dutiesMode: "DAP", quotedAt, expiresAt,
    package: { weightGrams: parcel.weightGrams, lengthMm: parcel.lengthMm, widthMm: parcel.widthMm, heightMm: parcel.heightMm, itemCount: parcel.itemCount },
    fx: { asOf: snapshot.asOf, version: snapshot.version, currency, currencyPerUsdMicros, bufferBps },
  };
  return { token: encodePayload(payload), internal: internalShipping(payload), public: { carrier: "YunExpress", serviceCode: rate.productCode, serviceName: rate.productName, deliveryWindow: rate.deliveryWindow, dutiesMode: "DAP", expiresAt, package: parcel } };
}

export function verifyStorefrontShippingQuote(token: string, items: ShippingCartItem[], checkout: { country: string; postalCode?: string }, now = Date.now()) {
  if (!isStorefrontDynamicShippingEnabled()) throw new Error("shipping_quote_unavailable");
  const payload = decodePayload(token);
  if (payload.exp <= Math.floor(now / 1_000)) throw new Error("shipping_quote_expired");
  if (payload.cartHash !== cartHash(items) || payload.country !== checkout.country.trim().toUpperCase() || payload.postalCode !== (checkout.postalCode?.trim() ?? "")) throw new Error("shipping_quote_changed");
  return internalShipping(payload);
}

let countriesCache: { expiresAt: number; countries: YunExpressCountry[] } | null = null;

export async function listStorefrontShippingCountries(now = Date.now()) {
  if (!isStorefrontDynamicShippingEnabled()) return null;
  if (countriesCache && countriesCache.expiresAt > now) return countriesCache.countries;
  const countries = (await listYunExpressCountries()).filter((country) => country.active);
  countriesCache = { expiresAt: now + 60 * 60 * 1_000, countries };
  return countries;
}

export function resetStorefrontShippingCacheForTests() { countriesCache = null; }
