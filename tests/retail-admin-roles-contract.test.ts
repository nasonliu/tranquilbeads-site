import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";

import { createRetailAdminSession, hasRetailPermission, readRetailAdminSession } from "@/src/lib/retail/admin-auth";

const priorSecret = process.env.ADMIN_RETAIL_SESSION_SECRET;
const priorPassword = process.env.ADMIN_RETAIL_PASSWORD;
const priorOperators = process.env.ADMIN_RETAIL_OPERATORS_JSON;
afterEach(() => {
  if (priorSecret === undefined) delete process.env.ADMIN_RETAIL_SESSION_SECRET; else process.env.ADMIN_RETAIL_SESSION_SECRET = priorSecret;
  if (priorPassword === undefined) delete process.env.ADMIN_RETAIL_PASSWORD; else process.env.ADMIN_RETAIL_PASSWORD = priorPassword;
  if (priorOperators === undefined) delete process.env.ADMIN_RETAIL_OPERATORS_JSON; else process.env.ADMIN_RETAIL_OPERATORS_JSON = priorOperators;
});

describe("retail admin roles and PII contract", () => {
  it("signs actor and role into a revocable v3 session and keeps warehouse away from order PII", () => {
    process.env.ADMIN_RETAIL_SESSION_SECRET = "s".repeat(32);
    process.env.ADMIN_RETAIL_PASSWORD = "p".repeat(16);
    process.env.ADMIN_RETAIL_OPERATORS_JSON = JSON.stringify([{ id: "warehouse-1", name: "Warehouse", role: "warehouse", password: "w".repeat(16) }]);
    const actor = { id: "warehouse-1", name: "Warehouse", role: "warehouse" as const, legacy: false };
    const session = createRetailAdminSession(actor, 1_000);
    expect(readRetailAdminSession(session, 1_001)).toEqual(actor);
    expect(hasRetailPermission(actor, "orders:fulfil")).toBe(true);
    expect(hasRetailPermission(actor, "orders:pii")).toBe(false);
  });

  it("uses an explicit PII endpoint and records a field-level audit receipt", () => {
    const migration = readFileSync("migrations/20260731_retail_admin_roles_pii.sql", "utf8");
    const route = readFileSync("app/api/admin/retail/orders/[id]/route.ts", "utf8");
    const operations = readFileSync("src/lib/retail/operations.ts", "utf8");
    expect(migration).toContain("retail_record_admin_pii_view");
    expect(migration).toContain("'order.pii.view'");
    expect(route).toContain('requireRetailPermission("orders:pii")');
    expect(route).toContain('query.get("includePii") === "1"');
    expect(operations).toContain("getAdminOrderPii");
    expect(operations).toContain("retail_record_admin_pii_view");
    expect(operations).toContain("return { shipping: rows[0].checkout_shipping }");
  });

  it("keeps the media reorder and audit list contracts aligned with the console", () => {
    const ui = readFileSync("app/admin/retail/ui.tsx", "utf8");
    const reorder = readFileSync("app/api/admin/retail/media/reorder/route.ts", "utf8");
    const audit = readFileSync("app/api/admin/retail/audit/route.ts", "utf8");
    expect(ui).toContain('"/api/admin/retail/media/reorder", "PATCH"');
    expect(reorder).toContain("export const PATCH = reorder");
    expect(reorder).toContain("export const POST = reorder");
    expect(audit).toContain("entries: rows.slice(0, limit)");
    expect(audit).toContain("hasNext");
    expect(ui).toContain('"/api/admin/retail/auth/session"');
  });
});
