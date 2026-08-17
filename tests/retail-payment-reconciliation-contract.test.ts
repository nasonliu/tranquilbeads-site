// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("retail payment reconciliation hardening", () => {
  it("ships a follow-up migration without mutating the 20260729 admin consistency migration", () => {
    const migration = read("migrations/20260730_retail_payment_reconciliation.sql");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION retail_cancel_order");
    expect(migration).toContain("'order requires payment reconciliation'");
    expect(migration).toContain("retail_runtime_environment");
    expect(migration).not.toContain("UPDATE retail_refund_requests");
  });

  it("fails closed before cancelling an approved or remotely capturable order", () => {
    const route = read("app/api/admin/retail/orders/[id]/route.ts");
    const migration = read("migrations/20260730_retail_payment_reconciliation.sql");
    expect(route).toMatch(/if\s*\(\s*order\.paypal_order_id\s*\)\s*throw new Error/);
    expect(migration).toContain("o.status='created' AND o.paypal_order_id IS NOT NULL");
  });

  it("retries incomplete fee accounting and pending refunds through the authenticated cron", () => {
    const db = read("src/lib/retail/db.ts");
    const cron = read("app/api/cron/retail/reservations/route.ts");
    expect(db).toContain("listRetailCapturedOrdersNeedingAccounting");
    expect(db).toContain("listRetailRefundsNeedingReconciliation");
    expect(cron).toContain("refundPaypalCapture");
    expect(cron).toContain("accountingReconciled");
    expect(cron).toContain("refundReconciled");
  });

  it("releases reservations when PayPal reverses an approval", () => {
    const db = read("src/lib/retail/db.ts");
    expect(db).toContain("CHECKOUT.PAYMENT-APPROVAL.REVERSED");
    expect(db).toContain("payment_approval_reversed");
  });
});
