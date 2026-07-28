// @vitest-environment node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const neonMocks = vi.hoisted(() => {
  const calls: Array<{ text: string; values: unknown[] }> = [];
  const sql = vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.join("?").replace(/\s+/g, " ");
    calls.push({ text, values });
    if (text.includes("retail_runtime_environment")) return [{ identity: process.env.RETAIL_DATABASE_IDENTITY }];
    if (text.includes("retail_issue_customer_portal_token")) return [{ id: "e88cf331-2f3e-4e92-9e6d-c2f8a4454f1c" }];
    if (text.includes("retail_redeem_customer_portal_token")) return [{ order_public_id: "04d8ba1f-5df1-4000-9f35-8bf95fc94e10", payment_status: "captured", fulfilment_status: "fulfilled", currency: "USD", amount_minor: 1234, ordered_at: "2026-08-02T00:00:00.000Z", carrier: "DHL", tracking_number: "TRACK-1", items: [{ titleEn: "Retail-only bead", quantity: 1 }] }];
    return [];
  });
  return { calls, sql, neon: vi.fn(() => sql) };
});

vi.mock("@neondatabase/serverless", () => ({ neon: neonMocks.neon }));

import { customerPortalUrl, issueCustomerPortalToken, redeemCustomerPortalToken } from "@/src/lib/retail/customer-portal";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("customer portal bearer credentials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    neonMocks.calls.splice(0);
    process.env.DATABASE_URL = "postgres://retail-test";
    process.env.RETAIL_DATABASE_IDENTITY = crypto.randomUUID();
    process.env.NEXT_PUBLIC_SITE_URL = "https://preview.example.test";
  });

  it("generates a high-entropy token but submits only its SHA-256 hash to PostgreSQL", async () => {
    const issued = await issueCustomerPortalToken(42);
    expect(issued.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(issued.token, "base64url")).toHaveLength(32);
    const call = neonMocks.calls.find(({ text }) => text.includes("retail_issue_customer_portal_token"));
    expect(call?.values).toHaveLength(3);
    expect(call?.values).not.toContain(issued.token);
    expect(call?.values?.[1]).toBe(crypto.createHash("sha256").update(issued.token).digest("hex"));
    expect(new Date(String(call?.values?.[2])).getTime() - Date.now()).toBeLessThanOrEqual(31 * 24 * 60 * 60 * 1000);
    expect(customerPortalUrl(issued.token)).toBe(`https://preview.example.test/en/shop/account/${issued.token}`);
    expect(customerPortalUrl(issued.token, "ar")).toBe(`https://preview.example.test/ar/shop/account/${issued.token}`);
    expect(customerPortalUrl(issued.token, "zh")).toBe(`https://preview.example.test/zh/shop/account/${issued.token}`);
    expect(() => customerPortalUrl(issued.token, "fr" as never)).toThrow("customer_portal_unavailable");
  });

  it("redeems only an exact bearer credential and returns the allowlisted order projection", async () => {
    const token = crypto.randomBytes(32).toString("base64url");
    await expect(redeemCustomerPortalToken("invalid")).resolves.toBeNull();
    await expect(redeemCustomerPortalToken(token)).resolves.toEqual(expect.objectContaining({
      orderPublicId: "04d8ba1f-5df1-4000-9f35-8bf95fc94e10", paymentStatus: "captured", fulfilmentStatus: "fulfilled", carrier: "DHL", trackingNumber: "TRACK-1",
    }));
    const call = neonMocks.calls.find(({ text }) => text.includes("retail_redeem_customer_portal_token"));
    expect(call?.values).not.toContain(token);
    expect(call?.values?.[0]).toBe(crypto.createHash("sha256").update(token).digest("hex"));
  });

  it("keeps token lifecycle and the customer projection in SQL, without payment IDs or address fields", () => {
    const migration = read("migrations/20260802_retail_customer_portal.sql");
    expect(migration).toContain("token_sha256 CHAR(64)");
    expect(migration).toContain("SET revoked_at=now()");
    expect(migration).toContain("SET last_used_at=now()");
    expect(migration).toContain("t.expires_at>now()");
    expect(migration).toContain("o.tracking_number");
    expect(migration).not.toContain("paypal_order_id");
    expect(migration).not.toContain("checkout_shipping");
  });

  it("makes customer pages and APIs private, while confirmation mail never stores the plaintext credential", () => {
    const api = read("app/api/retail/customer/[token]/route.ts");
    const page = read("app/[locale]/shop/account/[token]/page.tsx");
    const notifications = read("src/lib/retail/notifications.ts");
    expect(api).toContain('"cache-control": "no-store, private"');
    expect(api).toContain('"referrer-policy": "no-referrer"');
    expect(api).toContain('"x-robots-tag": "noindex, nofollow, noarchive"');
    expect(page).toContain('referrer: "no-referrer"');
    expect(page).toContain("index: false, follow: false");
    expect(page).toContain("locale === \"zh\"");
    expect(page).toContain("locale === \"ar\"");
    expect(notifications).toContain("issueNotificationCustomerPortalToken");
    expect(notifications).not.toContain("token: portal");
  });

  it("persists an allowlisted checkout locale and uses it for notification links", () => {
    const expandMigration = read("migrations/20260811_retail_order_locale_notifications.sql");
    const contractMigration = read("migrations/20260812_retail_order_locale_notification_contract.sql");
    const runner = read("scripts/run-retail-migrations.mjs");
    const notifications = read("src/lib/retail/notifications.ts");
    expect(expandMigration).toContain("checkout_locale TEXT NOT NULL DEFAULT 'en'");
    expect(expandMigration).toContain("checkout_locale NOT IN ('en','ar','zh')");
    expect(expandMigration).not.toContain("existing.checkout_locale<>checkout_locale");
    expect(expandMigration).not.toContain("CREATE OR REPLACE FUNCTION retail_order_notification_trigger");
    expect(contractMigration).toContain("existing.checkout_locale<>checkout_locale");
    expect(contractMigration).toContain("CREATE OR REPLACE FUNCTION retail_order_notification_trigger");
    expect(runner).toContain('"20260811_retail_order_locale_notifications.sql"');
    expect(runner).toContain('"20260812_retail_order_locale_notification_contract.sql"');
    expect(notifications).toContain("issueNotificationCustomerPortalToken(Number(row.order_id),row.id)");
    expect(notifications).toContain("isLocale(candidateLocale)");
    expect(notifications).toContain('throw new Error("unsupported_notification_kind")');
    expect(contractMigration).toContain("'order_cancelled'");
    expect(contractMigration).toContain("'payment_failed'");
  });
});
