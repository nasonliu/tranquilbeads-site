// @vitest-environment node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const calls: Array<{ text: string; values: unknown[] }> = [];
  const sql = vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => { const text = strings.join("?").replace(/\s+/g, " "); calls.push({ text, values }); if (text.includes("retail_runtime_environment")) return [{ identity: process.env.RETAIL_DATABASE_IDENTITY }]; if (text.includes("retail_issue_customer_login_token") || text.includes("retail_issue_notification_customer_login_token")) return [{ issued: true }]; if (text.includes("retail_redeem_customer_login_token")) return [{ customer_public_id: "c6edb444-1dc9-4c17-9c7a-4c4b61d1cc1c", email: "buyer@example.test", name: "Buyer" }]; return []; });
  return { calls, sql, neon: vi.fn(() => sql) };
});
vi.mock("@neondatabase/serverless", () => ({ neon: mocks.neon }));

import { customerAccountVerifyUrl, issueCustomerLoginLink, issueNotificationCustomerLoginLink, redeemCustomerLoginLink, sendCustomerLoginEmail } from "@/src/lib/retail/customer-auth";

const root = process.cwd(); const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
describe("passwordless customer account credentials", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.calls.splice(0); process.env.DATABASE_URL = "postgres://retail-test"; process.env.RETAIL_DATABASE_IDENTITY = crypto.randomUUID(); process.env.NEXT_PUBLIC_SITE_URL = "https://preview.example.test"; process.env.RETAIL_PORTAL_TOKEN_SECRET = "a".repeat(32); });
  it("persists only SHA-256 hashes and sends opaque verification links", async () => {
    const issued = await issueCustomerLoginLink("Buyer@Example.Test");
    expect(issued.token).toMatch(/^[A-Za-z0-9_-]{43}$/); const call = mocks.calls.find((entry) => entry.text.includes("retail_issue_customer_login_token"));
    expect(call?.values).not.toContain(issued.token); expect(call?.values?.[1]).toBe(crypto.createHash("sha256").update(issued.token).digest("hex"));
    expect(customerAccountVerifyUrl(issued.token, "ar")).toContain("/api/retail/customer-auth/verify?token=");
  });
  it("redeems a link into a separate hashed session", async () => {
    const token = crypto.randomBytes(32).toString("base64url"); const redeemed = await redeemCustomerLoginLink(token);
    expect(redeemed?.customer.email).toBe("buyer@example.test"); const call = mocks.calls.find((entry) => entry.text.includes("retail_redeem_customer_login_token"));
    expect(call?.values).not.toContain(token); expect(call?.values).not.toContain(redeemed?.session); expect(call?.values?.[0]).toBe(crypto.createHash("sha256").update(token).digest("hex"));
  });
  it("makes account-access email retries deterministic without persisting its bearer", async () => {
    const notificationId = "e88cf331-2f3e-4e92-9e6d-c2f8a4454f1c";
    const first = await issueNotificationCustomerLoginLink("buyer@example.test", notificationId);
    const second = await issueNotificationCustomerLoginLink("buyer@example.test", notificationId);
    expect(second.token).toBe(first.token); const call = mocks.calls.find((entry) => entry.text.includes("retail_issue_notification_customer_login_token"));
    expect(call?.values).not.toContain(first.token); expect(call?.values?.[2]).toBe(crypto.createHash("sha256").update(first.token).digest("hex"));
  });
  it("uses the Workspace mailbox as reply-to for login email", async () => {
    process.env.RETAIL_RESEND_API_KEY = "test-key";
    process.env.RETAIL_EMAIL_FROM = "accounts@example.test";
    process.env.RETAIL_EMAIL_REPLY_TO = "support@example.test";
    const fetcher = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    const token = crypto.randomBytes(32).toString("base64url");
    await expect(sendCustomerLoginEmail("buyer@example.test", token, "en", fetcher)).resolves.toBe(true);
    const message = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));
    expect(message.reply_to).toBe("support@example.test");
  });
  it("keeps uniform request responses and atomically claims one-time tokens in SQL", () => {
    const migration = read("migrations/20260821_retail_customer_accounts.sql"); const request = read("app/api/retail/customer-auth/request-link/route.ts"); const runner = read("scripts/run-retail-migrations.mjs");
    expect(migration).toContain("used_at IS NULL"); expect(migration).toContain("INSERT INTO retail_customer_sessions"); expect(migration).toContain("retail_customer_account"); expect(migration).toContain("lower(COALESCE(o.checkout_email,snap.customer_snapshot->>'email',''))=c.email");
    expect(migration).toContain("retail_customer_marketing_consents"); expect(migration).toContain("withdrawn_at"); expect(migration).toContain("retail_record_customer_marketing_consent");
    expect(migration).toContain("retail_withdraw_customer_marketing_consent");
    expect(migration).toContain("account_intent"); expect(migration).toContain("account_access"); expect(migration).toContain("retail_queue_customer_account_access");
    expect(migration).toContain("SET expires_at=GREATEST(expires_at,p_expires_at)");
    expect(migration).toContain("used_at IS NULL AND revoked_at IS NULL");
    expect(request).toContain("status: 202"); expect(request).not.toContain("account_not_found"); expect(request).toContain("after(() => sendCustomerLoginEmail"); expect(request).not.toContain("await sendCustomerLoginEmail"); expect(runner).toContain("20260821_retail_customer_accounts.sql");
  });
});
