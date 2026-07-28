import { readFileSync } from "node:fs";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const healthMocks = vi.hoisted(() => ({
  config: vi.fn(),
  sql: vi.fn(),
  blobConfigured: vi.fn(),
}));

vi.mock("@/src/lib/retail/config", () => ({ getRetailServerConfig: healthMocks.config }));
vi.mock("@/src/lib/retail/database-identity", () => ({ guardedRetailSql: () => healthMocks.sql }));
vi.mock("@/src/lib/retail/blob", () => ({ isRetailBlobConfigured: healthMocks.blobConfigured }));

import { GET } from "@/app/api/retail/health/route";

const readyRows = [{ checkout_ready: true, variant_catalog_ready: true, shipping_ready: true, active_shipping_zones: 1 }];
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
    vi.stubEnv("VERCEL_ENV", "preview");
  });

  afterEach(() => vi.unstubAllEnvs());

  it("fails closed without the complete payment configuration", async () => {
    healthMocks.config.mockReturnValue({ enabled: false, reason: "missing_configuration" });
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false, status: "not_ready", paymentConfigured: false });
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
    const response = await GET();
    const body = await response.json();
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body).toMatchObject({ ok: true, database: true, paymentConfigured: true, checkoutVersion: "v3", variantCatalogReady: true, blobConfigured: true, notificationsConfigured: true });
    expect(JSON.stringify(body)).not.toContain("must-not-appear-in-health-response");
    expect(JSON.stringify(body)).not.toContain("orders@example.com");
  });

  it("fails closed when the V3 variant catalog is unavailable", async () => {
    healthMocks.sql.mockResolvedValue([{ ...readyRows[0], variant_catalog_ready: false }]);
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false, variantCatalogReady: false });
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
