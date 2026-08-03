import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { authenticateRetailAdmin, createRetailAdminSession, readRetailAdminSession, consumeRetailAdminLoginFailure, verifyRetailAdminSession } from "@/src/lib/retail/admin-auth";
import { detectRetailImage } from "@/src/lib/retail/upload-validation";

describe("retail admin security helpers", () => {
  it("rejects missing sessions", () => expect(verifyRetailAdminSession(undefined)).toBe(false));

  it("issues a v3 session bound to the configured operator credential", () => {
    const priorSecret = process.env.ADMIN_RETAIL_SESSION_SECRET;
    const priorOperators = process.env.ADMIN_RETAIL_OPERATORS_JSON;
    process.env.ADMIN_RETAIL_SESSION_SECRET = "s".repeat(32);
    process.env.ADMIN_RETAIL_OPERATORS_JSON = JSON.stringify([{ id: "ops-1", name: "Ops", role: "operations", password: "p".repeat(16) }]);
    const actor = { id: "ops-1", name: "Ops", role: "operations" as const, legacy: false };
    const session = createRetailAdminSession(actor, 1_000);
    expect(readRetailAdminSession(session, 1_001)).toEqual(actor);
    expect(JSON.parse(Buffer.from(session.split(".")[0]!, "base64url").toString())).toMatchObject({ v: 3, id: "ops-1" });
    if (priorSecret === undefined) delete process.env.ADMIN_RETAIL_SESSION_SECRET; else process.env.ADMIN_RETAIL_SESSION_SECRET = priorSecret;
    if (priorOperators === undefined) delete process.env.ADMIN_RETAIL_OPERATORS_JSON; else process.env.ADMIN_RETAIL_OPERATORS_JSON = priorOperators;
  });

  it("accepts eight-character admin passwords and fails closed at seven", () => {
    const priorPassword = process.env.ADMIN_RETAIL_PASSWORD;
    const priorSecret = process.env.ADMIN_RETAIL_SESSION_SECRET;
    const priorOperators = process.env.ADMIN_RETAIL_OPERATORS_JSON;
    try {
      process.env.ADMIN_RETAIL_SESSION_SECRET = "s".repeat(32);
      process.env.ADMIN_RETAIL_PASSWORD = "12345678";
      process.env.ADMIN_RETAIL_OPERATORS_JSON = JSON.stringify([{ id: "ops-8", name: "Ops", role: "operations", password: "abcdefgh" }]);
      expect(authenticateRetailAdmin("12345678")).toMatchObject({ id: "legacy-admin", role: "owner" });
      expect(authenticateRetailAdmin("abcdefgh", "ops-8")).toMatchObject({ id: "ops-8", role: "operations" });
      process.env.ADMIN_RETAIL_PASSWORD = "1234567";
      expect(() => authenticateRetailAdmin("1234567")).toThrow("retail_admin_not_configured");
      process.env.ADMIN_RETAIL_PASSWORD = "12345678";
      process.env.ADMIN_RETAIL_OPERATORS_JSON = JSON.stringify([{ id: "ops-7", name: "Ops", role: "operations", password: "abcdefg" }]);
      expect(authenticateRetailAdmin("abcdefg", "ops-7")).toBeNull();
    } finally {
      if (priorPassword === undefined) delete process.env.ADMIN_RETAIL_PASSWORD; else process.env.ADMIN_RETAIL_PASSWORD = priorPassword;
      if (priorSecret === undefined) delete process.env.ADMIN_RETAIL_SESSION_SECRET; else process.env.ADMIN_RETAIL_SESSION_SECRET = priorSecret;
      if (priorOperators === undefined) delete process.env.ADMIN_RETAIL_OPERATORS_JSON; else process.env.ADMIN_RETAIL_OPERATORS_JSON = priorOperators;
    }
  });

  it("keeps the API and browser password boundary aligned at eight", () => {
    expect(readFileSync("app/api/admin/retail/login/route.ts", "utf8")).toContain("password: z.string().min(8)");
    expect(readFileSync("app/admin/retail/ui.tsx", "utf8")).toContain("minLength={8}");
  });

  it("fails closed when login failure storage is unavailable", async () => {
    const priorDatabaseUrl = process.env.DATABASE_URL;
    const priorRetailDatabaseUrl = process.env.RETAIL_DATABASE_URL;
    const priorIdentity = process.env.RETAIL_DATABASE_IDENTITY;
    delete process.env.DATABASE_URL;
    delete process.env.RETAIL_DATABASE_URL;
    delete process.env.RETAIL_DATABASE_IDENTITY;

    await expect(consumeRetailAdminLoginFailure(new Request("http://localhost", { headers: { "x-vercel-forwarded-for": "203.0.113.9" } })))
      .rejects.toThrow("retail_database_identity_unavailable");

    if (priorDatabaseUrl) process.env.DATABASE_URL = priorDatabaseUrl;
    else delete process.env.DATABASE_URL;
    if (priorRetailDatabaseUrl) process.env.RETAIL_DATABASE_URL = priorRetailDatabaseUrl;
    else delete process.env.RETAIL_DATABASE_URL;
    if (priorIdentity) process.env.RETAIL_DATABASE_IDENTITY = priorIdentity;
    else delete process.env.RETAIL_DATABASE_IDENTITY;
  });

  it("requires the Vercel trusted-client header before attempting admin login limiting", async () => {
    await expect(consumeRetailAdminLoginFailure(new Request("http://localhost"), "ops-1"))
      .rejects.toThrow("admin_login_identity_unavailable");
  });

  it("persists only session and credential digests, never a raw token identifier or password", () => {
    const migration = readFileSync("migrations/20260801_retail_admin_sessions.sql", "utf8");
    const auth = readFileSync("src/lib/retail/admin-auth.ts", "utf8");
    expect(migration).toContain("session_hash CHAR(64)");
    expect(migration).toContain("credential_version_hash CHAR(64)");
    expect(migration).not.toMatch(/^\s*jti\s+/m);
    expect(migration).not.toMatch(/^\s*password\s+/m);
    expect(auth).toContain("validateRetailAdminSession");
    expect(auth).toContain("revokeRetailAdminSession");
  });

  it("identifies only supported image magic", () => {
    expect(detectRetailImage(new Uint8Array([137, 80, 78, 71, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe("image/png");
    expect(detectRetailImage(new Uint8Array([1, 2, 3]))).toBeNull();
  });
});
