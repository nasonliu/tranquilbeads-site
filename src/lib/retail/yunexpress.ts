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

let tokenCache: TokenCache = null;

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
    const response = await fetcher(url, { ...init, signal: controller.signal, cache: "no-store" });
    if (!response.ok) throw new Error("yunexpress_request_failed");
    return await response.json() as unknown;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("yunexpress_")) throw error;
    throw new Error("yunexpress_unavailable");
  } finally { clearTimeout(timer); }
}

const tokenResponse = z.object({ accessToken: z.string().min(16), expiresIn: z.coerce.number().int().positive() }).passthrough();

async function accessToken(config: YunConfig, fetcher: Fetcher, now: number) {
  const cacheKey = `${config.environment}:${config.appId}:${config.sourceKey}`;
  if (tokenCache?.key === cacheKey && tokenCache.expiresAt > now + TOKEN_SAFETY_MS) return tokenCache.accessToken;
  const raw = await fetchJson(fetcher, `${config.baseUrl}/openapi/oauth2/token`, {
    method: "POST",
    headers: { "content-type": "application/json;charset=utf-8", accept: "application/json" },
    body: JSON.stringify({ grantType: "client_credentials", appId: config.appId, appSecret: config.appSecret, sourceKey: config.sourceKey }),
  });
  const parsed = tokenResponse.safeParse(raw);
  if (!parsed.success) throw new Error("yunexpress_auth_failed");
  tokenCache = { key: cacheKey, accessToken: parsed.data.accessToken, expiresAt: now + parsed.data.expiresIn * 1_000 };
  return parsed.data.accessToken;
}

export async function verifyYunExpressConnection(fetcher: Fetcher = fetch, now = Date.now()) {
  const config = getYunExpressConfig();
  if (!config) return { configured: false, authenticated: false, environment: null } as const;
  await accessToken(config, fetcher, now);
  return { configured: true, authenticated: true, environment: config.environment } as const;
}

async function signedRequest(uri: string, payload: unknown, fetcher: Fetcher, now: number) {
  const config = getYunExpressConfig();
  if (!config) throw new Error("yunexpress_not_configured");
  const token = await accessToken(config, fetcher, now);
  const date = String(now), body = JSON.stringify(payload), method = "POST";
  return fetchJson(fetcher, `${config.baseUrl}${uri}`, {
    method,
    headers: {
      token,
      date,
      sign: signYunExpressRequest({ date, method, uri, body }, config.appSecret),
      "accept-language": "en-US",
      "content-type": "application/json;charset=utf-8",
      accept: "application/json",
    },
    body,
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

export type YunExpressRate = {
  productCode: string; productName: string; priceName: string; priceType: string; deliveryWindow: string;
  amount: number; currency: string; origin: string; fees: Array<{ name: string; amount: number; currency: string }>;
};

export async function quoteYunExpressShipping(input: z.infer<typeof yunExpressQuoteDto>, fetcher: Fetcher = fetch, now = Date.now()): Promise<YunExpressRate[]> {
  const parsed = yunExpressQuoteDto.parse(input);
  const config = getYunExpressConfig();
  const body = {
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
  const response = quoteResponse.safeParse(await signedRequest("/v1/price-trial/get_V2", body, fetcher, now));
  if (!response.success) throw new Error("yunexpress_invalid_response");
  const providerSucceeded = response.data.success === true || response.data.success === "true";
  if (!providerSucceeded) throw new Error("yunexpress_quote_failed");
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

export function resetYunExpressTokenCacheForTests() { tokenCache = null; }
