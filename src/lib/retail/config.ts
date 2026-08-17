type Env = Record<string, string | undefined>;
type RetailDisabledReason = "disabled" | "missing_configuration" | "invalid_payment_mode" | "payment_environment_not_allowed" | "database_environment_mismatch";
type PaymentMode = "sandbox" | "live";

export type RetailRuntimeConfig = { enabled: false; reason: RetailDisabledReason } | { enabled: true; paypalClientId: string; paymentMode: PaymentMode; databaseEnvironment?: string };
type RetailServerConfig = Extract<RetailRuntimeConfig, { enabled: true }> & { paypalClientSecret: string; paypalWebhookId: string; paypalBaseUrl: string };

const PAYPAL_SANDBOX_API_BASE_URL = "https://api-m.sandbox.paypal.com";
const PAYPAL_LIVE_API_BASE_URL = "https://api-m.paypal.com";

function expectedDatabaseEnvironment(vercelEnvironment: string | undefined) {
  if (vercelEnvironment === "production") return "production";
  if (vercelEnvironment === "preview") return "preview";
  return undefined;
}

export function getRetailRuntimeConfig(env: Env = process.env): RetailRuntimeConfig {
  if (env.RETAIL_SHOP_ENABLED !== "true") return { enabled: false, reason: "disabled" };
  const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_WEBHOOK_ID, DATABASE_URL, RETAIL_DATABASE_URL, RETAIL_DATABASE_IDENTITY } = env;
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET || !PAYPAL_WEBHOOK_ID || !(RETAIL_DATABASE_URL || DATABASE_URL) || !RETAIL_DATABASE_IDENTITY) return { enabled: false, reason: "missing_configuration" };
  const paymentMode = env.RETAIL_PAYMENT_MODE;
  if (paymentMode !== "sandbox" && paymentMode !== "live") return { enabled: false, reason: "invalid_payment_mode" };

  const paypalBaseUrl = env.PAYPAL_API_BASE_URL || PAYPAL_SANDBOX_API_BASE_URL;
  if (paymentMode === "sandbox" && paypalBaseUrl !== PAYPAL_SANDBOX_API_BASE_URL) return { enabled: false, reason: "payment_environment_not_allowed" };
  if (paymentMode === "live" && (env.VERCEL_ENV !== "production" || paypalBaseUrl !== PAYPAL_LIVE_API_BASE_URL)) return { enabled: false, reason: "payment_environment_not_allowed" };

  const databaseEnvironment = env.RETAIL_DATABASE_ENVIRONMENT;
  const expectedEnvironment = expectedDatabaseEnvironment(env.VERCEL_ENV);
  if (expectedEnvironment && databaseEnvironment !== expectedEnvironment) return { enabled: false, reason: "database_environment_mismatch" };

  return { enabled: true, paypalClientId: PAYPAL_CLIENT_ID, paymentMode, databaseEnvironment };
}

export function getRetailServerConfig(env: Env = process.env): RetailServerConfig | Extract<RetailRuntimeConfig, { enabled: false }> {
  const config = getRetailRuntimeConfig(env);
  if (!config.enabled) return config;
  return { ...config, paypalClientSecret: env.PAYPAL_CLIENT_SECRET!, paypalWebhookId: env.PAYPAL_WEBHOOK_ID!, paypalBaseUrl: config.paymentMode === "live" ? PAYPAL_LIVE_API_BASE_URL : PAYPAL_SANDBOX_API_BASE_URL };
}

export function isRetailNotificationConfigurationValid(env: Env = process.env) {
  return Boolean(
    env.RETAIL_RESEND_API_KEY
    && env.RETAIL_EMAIL_FROM
    && env.RETAIL_EMAIL_REPLY_TO
    && (env.RETAIL_PORTAL_TOKEN_SECRET?.length ?? 0) >= 32,
  );
}

export function isRetailShippingConfigurationValid(env: Env = process.env) {
  const signingSecret = env.RETAIL_SHIPPING_QUOTE_SECRET || env.RETAIL_PORTAL_TOKEN_SECRET || env.ADMIN_RETAIL_SESSION_SECRET;
  return Boolean(
    env.RETAIL_DYNAMIC_SHIPPING_ENABLED === "true"
    && env.YUNEXPRESS_ENV === "production"
    && env.YUNEXPRESS_APP_ID
    && env.YUNEXPRESS_APP_SECRET
    && env.YUNEXPRESS_SOURCE_KEY
    && (signingSecret?.length ?? 0) >= 32,
  );
}
