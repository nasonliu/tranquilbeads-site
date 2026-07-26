type Env = Record<string, string | undefined>;
export type RetailRuntimeConfig = { enabled: false; reason: "disabled" | "missing_configuration" } | { enabled: true; paypalClientId: string };
type RetailServerConfig = Extract<RetailRuntimeConfig, { enabled: true }> & { paypalClientSecret: string; paypalWebhookId: string; paypalBaseUrl: string };

export function getRetailRuntimeConfig(env: Env = process.env): RetailRuntimeConfig {
  if (env.RETAIL_SHOP_ENABLED !== "true") return { enabled: false, reason: "disabled" };
  const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_WEBHOOK_ID, DATABASE_URL } = env;
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET || !PAYPAL_WEBHOOK_ID || !DATABASE_URL) return { enabled: false, reason: "missing_configuration" };
  return { enabled: true, paypalClientId: PAYPAL_CLIENT_ID };
}

export function getRetailServerConfig(env: Env = process.env): RetailServerConfig | Extract<RetailRuntimeConfig, { enabled: false }> {
  const config = getRetailRuntimeConfig(env);
  if (!config.enabled) return config;
  return { ...config, paypalClientSecret: env.PAYPAL_CLIENT_SECRET!, paypalWebhookId: env.PAYPAL_WEBHOOK_ID!, paypalBaseUrl: env.PAYPAL_API_BASE_URL === "https://api-m.paypal.com" ? env.PAYPAL_API_BASE_URL : "https://api-m.sandbox.paypal.com" };
}
