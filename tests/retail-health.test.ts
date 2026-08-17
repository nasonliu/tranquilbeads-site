import { readFileSync } from "node:fs";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const healthMocks = vi.hoisted(() => ({
  config: vi.fn(),
  sql: vi.fn(),
  blobConfigured: vi.fn(),
}));

vi.mock("@/src/lib/retail/config", () => ({
  getRetailServerConfig: healthMocks.config,
  isRetailNotificationConfigurationValid: () => Boolean(
    process.env.RETAIL_RESEND_API_KEY
    && process.env.RETAIL_EMAIL_FROM
    && process.env.RETAIL_EMAIL_REPLY_TO
    && (process.env.RETAIL_PORTAL_TOKEN_SECRET?.length ?? 0) >= 32,
  ),
  isRetailShippingConfigurationValid: () => Boolean(
    process.env.RETAIL_DYNAMIC_SHIPPING_ENABLED === "true"
    && process.env.YUNEXPRESS_ENV === "production"
    && process.env.YUNEXPRESS_APP_ID && process.env.YUNEXPRESS_APP_SECRET && process.env.YUNEXPRESS_SOURCE_KEY
    && (process.env.RETAIL_PORTAL_TOKEN_SECRET?.length ?? 0) >= 32
  ),
}));
vi.mock("@/src/lib/retail/database-identity", () => ({ guardedRetailSql: () => healthMocks.sql }));
vi.mock("@/src/lib/retail/blob", () => ({ isRetailBlobConfigured: healthMocks.blobConfigured }));

import { GET } from "@/app/api/retail/health/route";

const readyRows = [{ checkout_ready: true, variant_catalog_ready: true, shipping_ready: true, marketing_campaign_schema_ready: true, notification_schema_ready: true, account_schema_ready: true, active_shipping_zones: 1 }];
const enabledConfig = { enabled: true, paymentMode: "sandbox", databaseEnvironment: "preview" };

describe("retail health route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    healthMocks.config.mockReturnValue(enabledConfig);
    healthMocks.sql.mockResolvedValue(readyRows);
    healthMocks.blobConfigured.mockReturnValue(true);
    vi.stubEnv("RETAIL_DATABASE_URL", "postgres://retail-test");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("RETAIL_RESEND_API_KEY", "");
    vi.stubEnv("RETAIL_EMAIL_FROM", "");
    vi.stubEnv("RETAIL_EMAIL_REPLY_TO", "");
    vi.stubEnv("RETAIL_PORTAL_TOKEN_SECRET", "");
    vi.stubEnv("VERCEL_ENV", "preview");
  });

  afterEach(() => vi.unstubAllEnvs());

  it("fails closed without the complete payment configuration", async () => {
    healthMocks.config.mockReturnValue({ enabled: false, reason: "missing_configuration" });
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false, status: "not_ready", paymentConfigured: false, notificationSchemaReady: false });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("requires notifications in production but explicitly permits a preview readiness check without delivery credentials", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    const production = await GET();
    expect(production.status).toBe(503);
    expect(await production.json()).toMatchObject({ ok: false, status: "configuration_required", notificationsConfigured: false, notificationsRequired: true });

    vi.stubEnv("VERCEL_ENV", "preview");
    const preview = await GET();
    expect(preview.status).toBe(200);
    expect(await preview.json()).toMatchObject({ ok: true, status: "ready", notificationsConfigured: false, notificationsRequired: false });
  });

  it("reports only safe readiness state and does not cache it", async () => {
    vi.stubEnv("RETAIL_RESEND_API_KEY", "must-not-appear-in-health-response");
    vi.stubEnv("RETAIL_EMAIL_FROM", "Retail <orders@example.com>");
    vi.stubEnv("RETAIL_EMAIL_REPLY_TO", "support@example.com");
    vi.stubEnv("RETAIL_PORTAL_TOKEN_SECRET", "a-portal-token-secret-with-at-least-32-chars");
    const response = await GET();
    const body = await response.json();
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body).toMatchObject({ ok: true, database: true, paymentConfigured: true, checkoutVersion: "v3", variantCatalogReady: true, notificationSchemaReady: true, accountSchemaReady: true, blobConfigured: true, notificationsConfigured: true });
    expect(JSON.stringify(body)).not.toContain("must-not-appear-in-health-response");
    expect(JSON.stringify(body)).not.toContain("orders@example.com");
  });

  it("requires a 32-character server-only portal secret before reporting notifications configured", async () => {
    vi.stubEnv("RETAIL_RESEND_API_KEY", "resend-key");
    vi.stubEnv("RETAIL_EMAIL_FROM", "Retail <orders@example.com>");
    vi.stubEnv("RETAIL_EMAIL_REPLY_TO", "support@example.com");
    vi.stubEnv("RETAIL_PORTAL_TOKEN_SECRET", "too-short");
    const shortSecret = await GET();
    expect(await shortSecret.json()).toMatchObject({ notificationsConfigured: false });

    vi.stubEnv("RETAIL_PORTAL_TOKEN_SECRET", "a-portal-token-secret-with-at-least-32-chars");
    const configured = await GET();
    expect(await configured.json()).toMatchObject({ notificationsConfigured: true });
  });

  it("fails closed when the V3 variant catalog is unavailable", async () => {
    healthMocks.sql.mockResolvedValue([{ ...readyRows[0], variant_catalog_ready: false }]);
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false, variantCatalogReady: false });
  });

  it("fails closed when the notification schema objects exist but the 20260812 contract receipt is unavailable", async () => {
    healthMocks.sql.mockResolvedValue([{ ...readyRows[0], notification_schema_ready: false }]);
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false, notificationSchemaReady: false });
  });

  it("fails closed when the customer account schema or 20260821 receipt is unavailable", async () => {
    healthMocks.sql.mockResolvedValue([{ ...readyRows[0], account_schema_ready: false }]);
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false, accountSchemaReady: false });
  });

  it("requires the checkout locale, notification-token table, exact notification-token function signature, and 20260812 contract receipt", () => {
    const route = readFileSync("app/api/retail/health/route.ts", "utf8");
    expect(route).toContain("attname='checkout_locale' AND NOT attisdropped");
    expect(route).toContain("retail_customer_portal_notification_tokens");
    expect(route).toContain("retail_issue_notification_portal_token(bigint,uuid,text)");
    expect(route).toContain("20260812_retail_order_locale_notification_contract.sql");
    expect(route).toContain("retail_customer_login_tokens");
    expect(route).toContain("retail_customer_sessions");
    expect(route).toContain("retail_finalize_customer_post_capture(text)");
    expect(route).toContain("retail_apply_paypal_capture_and_finalize(text,text,jsonb,jsonb,bigint,bigint)");
    expect(route).toContain("retail_withdraw_customer_marketing_consent(text)");
    expect(route).toContain("20260821_retail_customer_accounts.sql");
    expect(route).toContain("20260822_retail_atomic_capture_customer_finalize.sql");
  });

  it("checks the V3 checkout functions rather than the retired V2 path", () => {
    const route = readFileSync("app/api/retail/health/route.ts", "utf8");
    expect(route).toContain("retail_quote_checkout_v3(jsonb,jsonb,text)");
    expect(route).toContain("retail_create_checkout_v3(uuid,jsonb,jsonb,bigint,text)");
    expect(route).not.toContain("retail_create_checkout_v2");
  });

  it("uses retail-only Blob readiness without accepting the outreach store token", () => {
    const route = readFileSync("app/api/retail/health/route.ts", "utf8");
    expect(route).toContain("isRetailBlobConfigured");
    expect(route).not.toContain("process.env.BLOB_READ_WRITE_TOKEN");
    expect(route).not.toContain("RETAIL_BLOB_READ_WRITE_TOKEN");
  });
});
