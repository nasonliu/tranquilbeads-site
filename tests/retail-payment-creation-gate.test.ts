import { readFileSync } from "node:fs";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getRetailPaymentCreationGate } from "@/src/lib/retail/gate";

const requiredPaymentEnv = {
  RETAIL_SHOP_ENABLED: "true",
  PAYPAL_CLIENT_ID: "client-id",
  PAYPAL_CLIENT_SECRET: "client-secret",
  PAYPAL_WEBHOOK_ID: "webhook-id",
  DATABASE_URL: "postgres://example.test",
  RETAIL_DATABASE_IDENTITY: "projectnoor-test-database-v1",
};

describe("retail payment creation gate", () => {
  beforeEach(() => {
    for (const [key, value] of Object.entries(requiredPaymentEnv)) vi.stubEnv(key, value);
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("RETAIL_DATABASE_ENVIRONMENT", "production");
    vi.stubEnv("RETAIL_PAYMENT_MODE", "live");
    vi.stubEnv("PAYPAL_API_BASE_URL", "https://api-m.paypal.com");
    vi.stubEnv("RETAIL_RESEND_API_KEY", "");
    vi.stubEnv("RETAIL_EMAIL_FROM", "");
    vi.stubEnv("RETAIL_EMAIL_REPLY_TO", "");
    vi.stubEnv("RETAIL_PORTAL_TOKEN_SECRET", "");
  });

  afterEach(() => vi.unstubAllEnvs());

  it("blocks creating a live PayPal order until notifications are configured", () => {
    expect(getRetailPaymentCreationGate()).toEqual({ enabled: false });

    vi.stubEnv("RETAIL_RESEND_API_KEY", "resend-key");
    vi.stubEnv("RETAIL_EMAIL_FROM", "Orders <orders@example.test>");
    vi.stubEnv("RETAIL_EMAIL_REPLY_TO", "support@example.test");
    vi.stubEnv("RETAIL_PORTAL_TOKEN_SECRET", "a-portal-token-secret-with-at-least-32-chars");
    expect(getRetailPaymentCreationGate()).toMatchObject({ enabled: true });
  });

  it("keeps sandbox checkout available for isolated payment testing", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("RETAIL_DATABASE_ENVIRONMENT", "preview");
    vi.stubEnv("RETAIL_PAYMENT_MODE", "sandbox");
    vi.stubEnv("PAYPAL_API_BASE_URL", "https://api-m.sandbox.paypal.com");
    expect(getRetailPaymentCreationGate()).toMatchObject({ enabled: true });
  });

  it("is the gate used by the PayPal order creation route", () => {
    const route = readFileSync("app/api/retail/orders/route.ts", "utf8");
    expect(route).toContain("getRetailPaymentCreationGate");
  });
});
