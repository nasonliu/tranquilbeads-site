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
      "app/api/admin/retail/orders/[id]/refund/route.ts",
      "app/api/admin/retail/shipping/route.ts",
      "app/api/admin/retail/customers/route.ts",
      "app/api/admin/retail/customers/[id]/route.ts",
      "app/api/admin/retail/ledger/route.ts",
      "app/api/admin/retail/ledger/export/route.ts",
      "app/api/admin/retail/logout/route.ts",
    ]) expect(read(path)).toContain("requireRetailAdmin");
  });

  it("wires shipping, cancellation, and refunds into the operator console with explicit confirmation", () => {
    const ui = read("app/admin/retail/ui.tsx");
    for (const value of [
      "/api/admin/retail/shipping",
      "nameEn",
      "nameAr",
      "freeShippingThresholdMinor",
      "taxRateBps",
      "Cancel unpaid order",
      "action: \"cancel\"",
      "/refund",
      "amountMinor",
      "cannot be undone or repeated",
      "subtotal_minor",
      "shipping_minor",
      "tax_minor",
      "discount_minor",
      "checkout_email",
      "checkout_shipping",
      "refunded_minor",
    ]) expect(ui).toContain(value);
  });

  it("keeps state transitions database-atomic and audit backed", () => {
    const migration = read("migrations/20260727_retail_operations.sql");
    expect(migration).toContain("retail_change_price");
    expect(migration).toContain("retail_update_reconciliation");
    expect(migration).toContain("retail_adjust_inventory");
    expect(migration).toContain("only captured orders may be fulfilled");
    const auth = read("src/lib/retail/admin-auth.ts");
    expect(auth).toContain('import { consumeRetailRateLimit } from "./rate-limit"');
    expect(auth).toContain('consumeRetailRateLimit(request,"admin_login",8,200)');
  });

  it("uses server-only parameterized operations helpers", () => {
    const operations = read("src/lib/retail/operations.ts");
    expect(operations).toContain('import "server-only"');
    expect(operations).toContain("listAdminOrders");
    expect(operations).toContain("changeProductPrice");
    expect(operations).toContain("listLedgerEntries");
  });
});
