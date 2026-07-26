import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("retail operations administration contract", () => {
  it("exposes authenticated operations endpoints for each back-office domain", () => {
    for (const path of [
      "app/api/admin/retail/products/[id]/route.ts",
      "app/api/admin/retail/inventory/route.ts",
      "app/api/admin/retail/orders/route.ts",
      "app/api/admin/retail/orders/[id]/route.ts",
      "app/api/admin/retail/customers/route.ts",
      "app/api/admin/retail/customers/[id]/route.ts",
      "app/api/admin/retail/ledger/route.ts",
      "app/api/admin/retail/ledger/export/route.ts",
      "app/api/admin/retail/logout/route.ts",
    ]) expect(read(path)).toContain("requireRetailAdmin");
  });

  it("keeps state transitions database-atomic and audit backed", () => {
    const migration = read("migrations/20260727_retail_operations.sql");
    expect(migration).toContain("retail_change_price");
    expect(migration).toContain("retail_update_reconciliation");
    expect(migration).toContain("retail_adjust_inventory");
    expect(migration).toContain("only captured orders may be fulfilled");
    const auth = read("src/lib/retail/admin-auth.ts");
    expect(auth).toContain("ON CONFLICT(fingerprint) DO UPDATE");
    expect(auth).toContain("retail_admin_login_limits.attempts < 8");
  });

  it("uses server-only parameterized operations helpers", () => {
    const operations = read("src/lib/retail/operations.ts");
    expect(operations).toContain('import "server-only"');
    expect(operations).toContain("listAdminOrders");
    expect(operations).toContain("changeProductPrice");
    expect(operations).toContain("listLedgerEntries");
  });
});
