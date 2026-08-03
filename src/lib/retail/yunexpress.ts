import "server-only";

import crypto from "node:crypto";
import { z } from "zod";

const API_BASES = {
  sandbox: "https://openapi-sbx.yunexpress.cn",
  production: "https://openapi.yunexpress.cn",
} as const;
const REQUEST_TIMEOUT_MS = 8_000;
const TOKEN_SAFETY_MS = 5 * 60 * 1_000;

export const yunExpressQuoteDto = z.object({
  countryCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/),
  postalCode: z.string().trim().max(30).default(""),
  weightGrams: z.number().int().min(1).max(30_000),
  lengthMm: z.number().int().min(1).max(2_000).optional(),
  widthMm: z.number().int().min(1).max(2_000).optional(),
  heightMm: z.number().int().min(1).max(2_000).optional(),
  packageType: z.enum(["C", "E"]).default("C"),
  productGroupCode: z.enum(["DH", "EM", "FB", "MA", "PY", "UP", "SP", "A", "RT", "EP"]).optional(),
}).strict().superRefine((value, ctx) => {
  const dimensions = [value.lengthMm, value.widthMm, value.heightMm];
  if (dimensions.some((item) => item !== undefined) && dimensions.some((item) => item === undefined)) {
    ctx.addIssue({ code: "custom", message: "all package dimensions are required together" });
  }
});

type YunEnvironment = keyof typeof API_BASES;
type Fetcher = typeof fetch;
type YunConfig = { environment: YunEnvironment; baseUrl: string; appId: string; appSecret: string; sourceKey: string; origin?: string };
type TokenCache = { key: string; accessToken: string; expiresAt: number } | null;
type TokenFlight = { key: string; promise: Promise<string> } | null;

export type YunExpressCountry = { code: string; name: string; active: boolean };
export type YunExpressCoverageResult = {
  countryCode: string;
  postalCode: string;
  status: "quote_available" | "no_eligible_service" | "provider_not_bound" | "auth_or_permission" | "provider_throttled" | "transport_timeout" | "transport_network" | "provider_unavailable" | "invalid_provider_payload";
  providerCode?: string;
  httpStatus?: number;
  rates: YunExpressRate[];
};

export const yunExpressCoverageDto = z.object({
  countries: z.array(z.object({
    countryCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/),
    postalCode: z.string().trim().max(30).default(""),
  }).strict()).min(1).max(6),
  weightGrams: z.number().int().min(1).max(30_000).default(300),
  lengthMm: z.number().int().min(1).max(2_000).default(180),
  widthMm: z.number().int().min(1).max(2_000).default(120),
  heightMm: z.number().int().min(1).max(2_000).default(60),
  packageType: z.enum(["C", "E"]).default("C"),
}).strict();

export class YunExpressProviderError extends Error {
  constructor(readonly operation: string, readonly providerCode?: string) {
    super(`yunexpress_${operation}_failed`);
  }
}

class YunExpressHttpError extends Error {
  constructor(readonly status: number) { super("yunexpress_http_failed"); }
}

class YunExpressTransportError extends Error {
  constructor(readonly category: "timeout" | "network" | "invalid_json") {
    super(`yunexpress_${category}`);
  }
}

let tokenCache: TokenCache = null;
let tokenFlight: TokenFlight = null;

export function getYunExpressConfig(env: NodeJS.ProcessEnv = process.env): YunConfig | null {
  const environment: YunEnvironment = env.YUNEXPRESS_ENV === "production" ? "production" : "sandbox";
  const appId = env.YUNEXPRESS_APP_ID?.trim();
  const appSecret = env.YUNEXPRESS_APP_SECRET?.trim();
  const sourceKey = env.YUNEXPRESS_SOURCE_KEY?.trim();
  const origin = env.YUNEXPRESS_ORIGIN_CODE?.trim();
  if (!appId || !appSecret || !sourceKey) return null;
  return { environment, baseUrl: API_BASES[environment], appId, appSecret, sourceKey, ...(origin ? { origin } : {}) };
}

export function isYunExpressConfigured() { return getYunExpressConfig() !== null; }

export function signYunExpressRequest(input: { date: string; method: string; uri: string; body?: string }, secret: string) {
  const parts: Record<string, string> = { date: input.date, method: input.method.toUpperCase(), uri: input.uri };
  if (input.body !== undefined) parts.body = input.body;
  const content = Object.keys(parts).sort().map((key) => `${key}=${parts[key]}`).join("&");
  return crypto.createHmac("sha256", secret).update(content, "utf8").digest("base64");
}

async function fetchJson(fetcher: Fetcher, url: string, init: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    let response: Response;
    try {
      response = await fetcher(url, { ...init, signal: controller.signal, cache: "no-store" });
    } catch (error) {
      throw new YunExpressTransportError(controller.signal.aborted ? "timeout" : "network");
    }
    if (!response.ok) throw new YunExpressHttpError(response.status);
    try {
      return await response.json() as unknown;
    } catch {
      throw new YunExpressTransportError("invalid_json");
    }
  } catch (error) {
    if (error instanceof YunExpressHttpError || error instanceof YunExpressTransportError) throw error;
    if (error instanceof Error && error.message.startsWith("yunexpress_")) throw error;
    throw new YunExpressTransportError("network");
  } finally { clearTimeout(timer); }
}

const tokenResponse = z.object({ accessToken: z.string().min(16), expiresIn: z.coerce.number().int().positive() }).passthrough();

async function accessToken(config: YunConfig, fetcher: Fetcher, now: number) {
  const cacheKey = `${config.environment}:${config.appId}:${config.sourceKey}`;
  if (tokenCache?.key === cacheKey && tokenCache.expiresAt > now) return tokenCache.accessToken;
  if (tokenFlight?.key === cacheKey) return tokenFlight.promise;
  const promise = (async () => {
    const raw = await fetchJson(fetcher, `${config.baseUrl}/openapi/oauth2/token`, {
      method: "POST",
      headers: { "content-type": "application/json;charset=utf-8", accept: "application/json" },
      body: JSON.stringify({ grantType: "client_credentials", appId: config.appId, appSecret: config.appSecret, sourceKey: config.sourceKey }),
    });
    const parsed = tokenResponse.safeParse(raw);
    if (!parsed.success) throw new Error("yunexpress_auth_failed");
    const lifetimeMs = parsed.data.expiresIn * 1_000;
    const safetyMs = Math.min(TOKEN_SAFETY_MS, Math.max(1_000, Math.floor(lifetimeMs / 2)));
    tokenCache = { key: cacheKey, accessToken: parsed.data.accessToken, expiresAt: now + Math.max(1_000, lifetimeMs - safetyMs) };
    return parsed.data.accessToken;
  })();
  tokenFlight = { key: cacheKey, promise };
  try { return await promise; }
  finally { if (tokenFlight?.promise === promise) tokenFlight = null; }
}

export async function verifyYunExpressConnection(fetcher: Fetcher = fetch, now = Date.now()) {
  const config = getYunExpressConfig();
  if (!config) return { configured: false, authenticated: false, environment: null } as const;
  await accessToken(config, fetcher, now);
  return { configured: true, authenticated: true, environment: config.environment } as const;
}

async function signedGetRequest(pathname: string, params: Record<string, string | number>, fetcher: Fetcher, now: number) {
  const config = getYunExpressConfig();
  if (!config) throw new Error("yunexpress_not_configured");
  const token = await accessToken(config, fetcher, now);
  const query = new URLSearchParams(Object.entries(params).map(([key, value]) => [key, String(value)])).toString();
  const uri = query ? `${pathname}?${query}` : pathname;
  const date = String(now), method = "GET";
  return fetchJson(fetcher, `${config.baseUrl}${uri}`, {
    method,
    headers: {
      token,
      date,
      sign: signYunExpressRequest({ date, method, uri }, config.appSecret),
      "accept-language": "en-US",
      accept: "application/json",
    },
  });
}

const quoteLine = z.object({
  product_code: z.union([z.string(), z.number()]).transform(String),
  product_name: z.string().default(""),
  fee_name: z.string().default(""),
  calculate_amount: z.coerce.number().default(0),
  currency: z.string().default(""),
  interval_day: z.string().default(""),
  price_name: z.string().default(""),
  price_type: z.string().default(""),
  convert_currency: z.string().default(""),
  convert_amount: z.coerce.number().default(0),
  origin: z.string().default(""),
}).passthrough();
const quoteResponse = z.object({
  success: z.union([z.boolean(), z.string()]),
  result: z.array(quoteLine).optional().default([]),
  code: z.union([z.string(), z.number()]).optional(),
  msg: z.string().optional(),
}).passthrough();

function responseArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  for (const key of ["result", "detail", "data", "countries", "list", "items"]) {
    const nested = record[key];
    if (Array.isArray(nested)) return nested;
    if (nested && typeof nested === "object") {
      const found = responseArray(nested);
      if (found.length) return found;
    }
  }
  return [];
}

function firstString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export async function listYunExpressCountries(fetcher: Fetcher = fetch, now = Date.now()): Promise<YunExpressCountry[]> {
  const raw = await signedGetRequest("/v1/basic-data/countries/getlist", {}, fetcher, now);
  const envelope = z.object({ success: z.union([z.boolean(), z.string()]).optional(), code: z.union([z.string(), z.number()]).optional() }).passthrough().safeParse(raw);
  if (!envelope.success) throw new Error("yunexpress_invalid_response");
  if (envelope.data.success === false || envelope.data.success === "false") throw new YunExpressProviderError("countries", envelope.data.code === undefined ? undefined : String(envelope.data.code));
  const unique = new Map<string, YunExpressCountry>();
  for (const item of responseArray(raw)) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const code = firstString(record, ["country_code", "countryCode", "country_iso_code", "countryIsoCode", "code"]).toUpperCase();
    if (!/^[A-Z]{2}$/.test(code)) continue;
    const name = firstString(record, ["country_name_en", "countryNameEn", "english_name", "englishName", "country_name", "countryName", "name"]) || code;
    const status = record.status ?? record.enabled ?? record.is_enable ?? record.isEnabled;
    const active = status !== false && status !== 0 && !["0", "false", "disabled", "inactive"].includes(String(status).toLowerCase());
    const existing = unique.get(code);
    if (!existing || (active && !existing.active)) unique.set(code, { code, name, active });
  }
  const countries = [...unique.values()].sort((a, b) => a.code.localeCompare(b.code));
  if (!countries.length) throw new Error("yunexpress_invalid_response");
  return countries;
}

export type YunExpressRate = {
  productCode: string; productName: string; priceName: string; priceType: string; deliveryWindow: string;
  amount: number; currency: string; origin: string; fees: Array<{ name: string; amount: number; currency: string }>;
};

export async function quoteYunExpressShipping(input: z.infer<typeof yunExpressQuoteDto>, fetcher: Fetcher = fetch, now = Date.now()): Promise<YunExpressRate[]> {
  const parsed = yunExpressQuoteDto.parse(input);
  const config = getYunExpressConfig();
  const query = {
    country_code: parsed.countryCode,
    weight: parsed.weightGrams / 1_000,
    weight_unit: "KG",
    package_type: parsed.packageType,
    ...(parsed.postalCode ? { postal_code: parsed.postalCode } : {}),
    ...(parsed.productGroupCode ? { product_group_code: parsed.productGroupCode } : {}),
    ...(parsed.lengthMm ? { length: parsed.lengthMm / 10, width: parsed.widthMm! / 10, height: parsed.heightMm! / 10, size_unit: "CM" } : {}),
    ...(config?.origin ? { origin: config.origin } : {}),
    pieces: 1,
  };
  const response = quoteResponse.safeParse(await signedGetRequest("/v1/price-trial/get", query, fetcher, now));
  if (!response.success) throw new Error("yunexpress_invalid_response");
  const providerSucceeded = response.data.success === true || response.data.success === "true";
  if (!providerSucceeded) throw new YunExpressProviderError("quote", response.data.code === undefined ? undefined : String(response.data.code));
  const grouped = new Map<string, YunExpressRate>();
  for (const line of response.data.result) {
    const currency = line.convert_currency || line.currency;
    const amount = line.convert_amount || line.calculate_amount;
    const key = [line.product_code,line.price_name,line.price_type,currency,line.origin].join("|");
    const existing = grouped.get(key) ?? { productCode: line.product_code, productName: line.product_name, priceName: line.price_name, priceType: line.price_type, deliveryWindow: line.interval_day, amount: 0, currency, origin: line.origin, fees: [] };
    existing.amount = Math.round((existing.amount + amount) * 100) / 100;
    existing.fees.push({ name: line.fee_name, amount, currency });
    grouped.set(key, existing);
  }
  return [...grouped.values()].sort((a, b) => a.amount - b.amount);
}

export function classifyYunExpressFailure(error: unknown): Pick<YunExpressCoverageResult, "status" | "providerCode" | "httpStatus"> {
  if (error instanceof YunExpressProviderError) {
    const providerCode = error.providerCode;
    if (providerCode === "02060015") return { status: "provider_not_bound", providerCode };
    if (providerCode === "0200412101" || providerCode === "401" || providerCode === "403") return { status: "auth_or_permission", ...(providerCode ? { providerCode } : {}) };
    if (providerCode === "429") return { status: "provider_throttled", providerCode };
  }
  if (error instanceof YunExpressHttpError) {
    if (error.status === 401 || error.status === 403) return { status: "auth_or_permission", httpStatus: error.status };
    if (error.status === 429) return { status: "provider_throttled", httpStatus: error.status };
    if (error.status >= 500) return { status: "provider_unavailable", httpStatus: error.status };
  }
  if (error instanceof YunExpressTransportError) {
    if (error.category === "timeout") return { status: "transport_timeout" };
    if (error.category === "network") return { status: "transport_network" };
    return { status: "invalid_provider_payload" };
  }
  const message = error instanceof Error ? error.message : "";
  if (message === "yunexpress_auth_failed" || message === "yunexpress_not_configured") return { status: "auth_or_permission" };
  return { status: "invalid_provider_payload" };
}

export async function probeYunExpressCoverage(input: z.infer<typeof yunExpressCoverageDto>, fetcher: Fetcher = fetch, now = Date.now()): Promise<YunExpressCoverageResult[]> {
  const parsed = yunExpressCoverageDto.parse(input);
  await verifyYunExpressConnection(fetcher, now);
  const results: YunExpressCoverageResult[] = new Array(parsed.countries.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < parsed.countries.length) {
      const index = cursor++;
      const country = parsed.countries[index];
      const startedAt = Date.now();
      try {
        const rates = await quoteYunExpressShipping({
          countryCode: country.countryCode,
          postalCode: country.postalCode,
          weightGrams: parsed.weightGrams,
          lengthMm: parsed.lengthMm,
          widthMm: parsed.widthMm,
          heightMm: parsed.heightMm,
          packageType: parsed.packageType,
        }, fetcher, now + index);
        results[index] = { countryCode: country.countryCode, postalCode: country.postalCode, status: rates.length ? "quote_available" : "no_eligible_service", rates };
      } catch (error) {
        const failure = classifyYunExpressFailure(error);
        console.warn("yunexpress_coverage_probe_failed", {
          countryCode: country.countryCode,
          status: failure.status,
          ...(failure.httpStatus ? { httpStatus: failure.httpStatus } : {}),
          durationMs: Date.now() - startedAt,
        });
        results[index] = {
          countryCode: country.countryCode,
          postalCode: country.postalCode,
          ...failure,
          rates: [],
        };
      }
    }
  };
  await Promise.all([worker(), worker()]);
  return results;
}

export function resetYunExpressTokenCacheForTests() { tokenCache = null; tokenFlight = null; }
