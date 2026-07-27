import { existsSync, readFileSync } from "node:fs";
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

  it("splits the operator console into authenticated domain routes", () => {
    for (const path of [
      "app/admin/retail/overview/page.tsx",
      "app/admin/retail/orders/page.tsx",
      "app/admin/retail/orders/[id]/page.tsx",
      "app/admin/retail/products/page.tsx",
      "app/admin/retail/inventory/page.tsx",
      "app/admin/retail/customers/page.tsx",
      "app/admin/retail/finance/page.tsx",
      "app/admin/retail/media/page.tsx",
      "app/admin/retail/settings/page.tsx",
      "app/admin/retail/system/page.tsx",
    ]) expect(existsSync(path)).toBe(true);

    expect(read("app/admin/retail/layout.tsx")).toContain("verifyRetailAdminSession");
    expect(read("app/admin/retail/page.tsx")).toContain('redirect("/admin/retail/overview")');
  });

  it("keeps shipping, cancellation, refunds, and bilingual copy in the split console", () => {
    const ui = read("app/admin/retail/ui.tsx");
    const locale = read("app/admin/retail/admin-locale.ts");
    for (const value of [
      "/api/admin/retail/shipping",
      "nameEn",
      "nameAr",
      "freeShippingThresholdMinor",
      "taxRateBps",
      "action: \"cancel\"",
      "/refund",
      "amountMinor",
      "subtotal_minor",
      "shipping_minor",
      "tax_minor",
      "discount_minor",
      "checkout_email",
      "refunded_minor",
    ]) expect(ui).toContain(value);

    for (const value of [
      "Cancel unpaid order",
      "Refund captured order",
      "This action cannot be undone or repeated. Continue?",
      "取消未付款订单",
      "退还已捕获订单",
      "此操作不可撤销或重复，确认继续吗？",
    ]) expect(locale).toContain(value);
  });

  it("keeps admin retries and payment presentation truthful in both languages", () => {
    const ui = read("app/admin/retail/ui.tsx");
    const locale = read("app/admin/retail/admin-locale.ts");
    expect(ui).toContain('formData.set("idempotencyKey"');
    expect(ui).toContain("uploadIdempotencyKey.current ??= uuid()");
    expect(ui).toContain("shippingIdempotencyKey.current ??= uuid()");
    expect(ui).toContain("disableIdempotencyKeys.current.set(country, idempotencyKey)");
    expect(ui).toContain("submit={(data, idempotencyKey) => api(`/api/admin/retail/products/${data.productId}`");
    expect(ui).toContain('paymentEntries.length ? money(paymentTotal');
    expect(ui).toContain(">PayPal</dd>");
    expect(ui).not.toContain("PayPal {copy.sandbox}");
    expect(ui).toContain("copy.currentCatalogImage");
    expect(locale).toContain("当前商品目录图片");
    expect(locale).toContain("后台登录已失效，请重新登录。");
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
