// @vitest-environment node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const calls: Array<{ text: string; values: unknown[] }> = [];
  const sql = vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.join("?").replace(/\s+/g, " ");
    calls.push({ text, values });
    if (text.includes("retail_runtime_environment")) return [{ identity: process.env.RETAIL_DATABASE_IDENTITY }];
    if (text.includes("retail_issue_admin_login_token")) return [{ issued: true }];
    if (text.includes("retail_redeem_admin_login_token")) return [{ actor_id: "legacy-admin" }];
    return [];
  });
  return { calls, sql, neon: vi.fn(() => sql) };
});
vi.mock("@neondatabase/serverless", () => ({ neon: mocks.neon }));

import { retailAdminActorForEmail } from "@/src/lib/retail/admin-auth";
import { adminVerifyUrl, issueRetailAdminLoginLink, redeemRetailAdminLoginLink, sendRetailAdminLoginEmail } from "@/src/lib/retail/admin-magic-link";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("retail admin email sign-in", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.calls.splice(0);
    process.env.DATABASE_URL = "postgres://retail-test";
    process.env.RETAIL_DATABASE_IDENTITY = crypto.randomUUID();
    process.env.ADMIN_RETAIL_SESSION_SECRET = "s".repeat(32);
    process.env.ADMIN_RETAIL_PASSWORD = "p".repeat(16);
    process.env.ADMIN_RETAIL_MAGIC_LINK_EMAIL = "owner@example.test";
    process.env.ADMIN_RETAIL_MAGIC_LINK_ORIGIN = "https://preview.example.test";
    delete process.env.ADMIN_RETAIL_OPERATORS_JSON;
  });

  it("issues only for an allowlisted email and persists only a SHA-256 digest", async () => {
    const denied = await issueRetailAdminLoginLink("other@example.test");
    expect(denied.issued).toBe(false);
    const issued = await issueRetailAdminLoginLink("Owner@Example.Test");
    expect(issued.issued).toBe(true);
    expect(issued.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const call = mocks.calls.find((entry) => entry.text.includes("retail_issue_admin_login_token"));
    expect(call?.values).not.toContain(issued.token);
    expect(call?.values?.[1]).toBe(crypto.createHash("sha256").update(issued.token).digest("hex"));
  });

  it("redeems a one-time token back to the configured owner actor", async () => {
    const token = crypto.randomBytes(32).toString("base64url");
    await expect(redeemRetailAdminLoginLink(token)).resolves.toEqual({ id: "legacy-admin", name: "Legacy administrator", role: "owner", legacy: true });
    const call = mocks.calls.find((entry) => entry.text.includes("retail_redeem_admin_login_token"));
    expect(call?.values).not.toContain(token);
  });

  it("sends a preview-origin confirmation link without exposing credentials", async () => {
    process.env.RETAIL_RESEND_API_KEY = "test-key";
    process.env.RETAIL_EMAIL_FROM = "accounts@example.test";
    process.env.RETAIL_EMAIL_REPLY_TO = "support@example.test";
    const token = crypto.randomBytes(32).toString("base64url");
    const fetcher = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    await expect(sendRetailAdminLoginEmail("owner@example.test", token, fetcher)).resolves.toBe(true);
    const message = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));
    expect(message.to).toEqual(["owner@example.test"]);
    expect(message.reply_to).toBe("support@example.test");
    expect(message.html).toContain(adminVerifyUrl(token));
    expect(message.html).not.toContain("test-key");
  });

  it("uses only the configured canonical origin for admin links", () => {
    const token = crypto.randomBytes(32).toString("base64url");
    expect(adminVerifyUrl(token)).toContain("https://preview.example.test/api/admin/retail/auth/verify");
    process.env.ADMIN_RETAIL_MAGIC_LINK_ORIGIN = "https://attacker.example/path";
    expect(() => adminVerifyUrl(token)).toThrow("admin_login_unavailable");
  });

  it("fails closed when operator emails conflict with each other or the legacy owner", () => {
    process.env.ADMIN_RETAIL_OPERATORS_JSON = JSON.stringify([
      { id: "ops-1", name: "Ops", role: "operations", password: "a".repeat(16), email: "shared@example.test" },
      { id: "ops-2", name: "Ops 2", role: "viewer", password: "b".repeat(16), email: "SHARED@example.test" },
    ]);
    expect(retailAdminActorForEmail("shared@example.test")).toBeNull();
    process.env.ADMIN_RETAIL_OPERATORS_JSON = JSON.stringify([
      { id: "ops-1", name: "Ops", role: "operations", password: "a".repeat(16), email: "owner@example.test" },
    ]);
    expect(retailAdminActorForEmail("owner@example.test")).toBeNull();
  });

  it("requires an explicit POST confirmation and registers the hashed-token migration", () => {
    const verify = read("app/api/admin/retail/auth/verify/route.ts");
    const getBody = verify.slice(verify.indexOf("export async function GET"), verify.indexOf("export async function POST"));
    const migration = read("migrations/20260825_retail_admin_magic_links.sql");
    const runner = read("scripts/run-retail-migrations.mjs");
    expect(getBody).not.toContain("redeemRetailAdminLoginLink(");
    expect(verify).toContain("await assertSameOrigin()");
    expect(verify).toContain("redeemRetailAdminLoginLink(token)");
    expect(migration).toContain("token_sha256 CHAR(64)");
    expect(migration).toContain("used_at IS NULL");
    expect(migration).toContain("REVOKE ALL ON FUNCTION retail_issue_admin_login_token");
    expect(migration).toContain("REVOKE ALL ON FUNCTION retail_redeem_admin_login_token");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION retail_issue_admin_login_token");
    expect(migration).not.toMatch(/^\s*token\s+/m);
    expect(runner).toContain("20260825_retail_admin_magic_links.sql");
  });
});
