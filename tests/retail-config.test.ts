// @vitest-environment node
import { describe, expect, it } from "vitest";

import { getRetailRuntimeConfig, getRetailServerConfig } from "@/src/lib/retail/config";

const sandboxConfiguration = {
  RETAIL_SHOP_ENABLED: "true",
  RETAIL_PAYMENT_MODE: "sandbox",
  PAYPAL_CLIENT_ID: "client-id",
  PAYPAL_CLIENT_SECRET: "client-secret",
  PAYPAL_WEBHOOK_ID: "webhook-id",
  DATABASE_URL: "postgres://example",
  RETAIL_DATABASE_IDENTITY: "projectnoor-test-database-v1",
};

describe("retail payment configuration", () => {
  it("fails closed until every server-side requirement is present and the gate is explicitly enabled", () => {
    expect(getRetailRuntimeConfig({})).toEqual({ enabled: false, reason: "disabled" });
    expect(getRetailRuntimeConfig({ RETAIL_SHOP_ENABLED: "true" })).toEqual({ enabled: false, reason: "missing_configuration" });
  });

  it("only exposes the PayPal client id after the full payment backend is configured", () => {
    const config = getRetailRuntimeConfig(sandboxConfiguration);

    expect(config).toMatchObject({ enabled: true, paypalClientId: "client-id", paymentMode: "sandbox" });
    expect(config).not.toHaveProperty("paypalClientSecret");
  });

  it("requires an explicit payment mode and rejects a live endpoint in sandbox mode", () => {
    expect(getRetailRuntimeConfig({ ...sandboxConfiguration, RETAIL_PAYMENT_MODE: undefined })).toEqual({ enabled: false, reason: "invalid_payment_mode" });
    expect(getRetailRuntimeConfig({ ...sandboxConfiguration, PAYPAL_API_BASE_URL: "https://api-m.paypal.com" })).toEqual({ enabled: false, reason: "payment_environment_not_allowed" });
  });

  it("permits live PayPal only for an explicitly live production deployment", () => {
    const liveConfiguration = { ...sandboxConfiguration, RETAIL_PAYMENT_MODE: "live", PAYPAL_API_BASE_URL: "https://api-m.paypal.com", VERCEL_ENV: "production", RETAIL_DATABASE_ENVIRONMENT: "production" };
    expect(getRetailServerConfig(liveConfiguration)).toMatchObject({ enabled: true, paymentMode: "live", paypalBaseUrl: "https://api-m.paypal.com" });
    expect(getRetailRuntimeConfig({ ...liveConfiguration, VERCEL_ENV: "preview", RETAIL_DATABASE_ENVIRONMENT: "preview" })).toEqual({ enabled: false, reason: "payment_environment_not_allowed" });
    expect(getRetailRuntimeConfig({ ...liveConfiguration, VERCEL_ENV: "production", RETAIL_DATABASE_ENVIRONMENT: "preview" })).toEqual({ enabled: false, reason: "database_environment_mismatch" });
  });
});
