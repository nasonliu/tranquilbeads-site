// @vitest-environment node
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actor = { id: "legacy-admin", name: "Legacy administrator", role: "owner" as const, legacy: true };
const mocks = vi.hoisted(() => ({
  assertSameOrigin: vi.fn(),
  requireRetailAdmin: vi.fn(),
  changeRetailAdminPassword: vi.fn(),
  clearRetailAdminSession: vi.fn(),
}));

vi.mock("@/src/lib/retail/admin-auth", () => ({
  assertSameOrigin: mocks.assertSameOrigin,
  requireRetailAdmin: mocks.requireRetailAdmin,
  changeRetailAdminPassword: mocks.changeRetailAdminPassword,
  clearRetailAdminSession: mocks.clearRetailAdminSession,
}));

import { POST } from "@/app/api/admin/retail/auth/password/route";

function request(body: Record<string, unknown>) {
  return new Request("https://preview.example/api/admin/retail/auth/password", {
    method: "POST",
    headers: { origin: "https://preview.example", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("retail admin password rotation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.assertSameOrigin.mockResolvedValue(undefined);
    mocks.requireRetailAdmin.mockResolvedValue(actor);
    mocks.changeRetailAdminPassword.mockResolvedValue(undefined);
    mocks.clearRetailAdminSession.mockResolvedValue(undefined);
  });

  it("changes the authenticated actor credential, then clears the current session", async () => {
    const response = await POST(request({ currentPassword: "old-pass-8", newPassword: "new-pass-8", confirmPassword: "new-pass-8" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, requiresSignIn: true });
    expect(mocks.changeRetailAdminPassword).toHaveBeenCalledWith(actor, "old-pass-8", "new-pass-8");
    expect(mocks.clearRetailAdminSession).toHaveBeenCalledOnce();
  });

  it("rejects a mismatched confirmation before changing anything", async () => {
    const response = await POST(request({ currentPassword: "old-pass-8", newPassword: "new-pass-8", confirmPassword: "different-8" }));
    expect(response.status).toBe(400);
    expect(mocks.changeRetailAdminPassword).not.toHaveBeenCalled();
    expect(mocks.clearRetailAdminSession).not.toHaveBeenCalled();
  });

  it("returns a safe current-password error and keeps the session", async () => {
    mocks.changeRetailAdminPassword.mockRejectedValue(new Error("current_password_invalid"));
    const response = await POST(request({ currentPassword: "wrong-pass", newPassword: "new-pass-8", confirmPassword: "new-pass-8" }));
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ ok: false, error: "current_password_invalid" });
    expect(mocks.clearRetailAdminSession).not.toHaveBeenCalled();
  });

  it("stores only a salted hash and registers the migration", () => {
    const migration = readFileSync("migrations/20260831_retail_admin_password_credentials.sql", "utf8");
    const runner = readFileSync("scripts/run-retail-migrations.mjs", "utf8");
    expect(migration).toContain("password_salt CHAR(32)");
    expect(migration).toContain("password_hash CHAR(64)");
    expect(migration).toContain("credential_version UUID");
    expect(migration).not.toMatch(/^\s*password\s+/m);
    expect(runner).toContain("20260831_retail_admin_password_credentials.sql");
  });
});
