// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseSettlementCsv, parseSettlementJson } from "@/src/lib/retail/settlements";

const read = (path: string) => readFileSync(path, "utf8");
describe("PayPal settlement reporting import", () => {
  it("normalizes allowlisted CSV fields without retaining report PII", () => {
    const rows = parseSettlementCsv("Transaction ID,Transaction Type,Transaction Status,Currency,Gross,Fee,Net,Reference Txn ID,Payout ID,Buyer Email\nCAP-1,Payment,Completed,USD,10.00,-0.59,9.41,CAPTURE-1,PAYOUT-1,buyer@example.test\n");
    expect(rows).toEqual([{ transactionId:"CAP-1",transactionType:"Payment",transactionStatus:"Completed",currency:"USD",grossMinor:1000,feeMinor:-59,netMinor:941,relatedCaptureId:"CAPTURE-1",payoutId:"PAYOUT-1",payoutItemId:null,occurredAt:null }]);
    expect(JSON.stringify(rows)).not.toContain("buyer@example.test");
  });
  it("rejects unbalanced, non-USD, malformed, and oversized report records", () => {
    expect(() => parseSettlementJson('[{"transactionId":"x","transactionType":"payment","transactionStatus":"ok","currency":"USD","gross":"1.00","fee":"-0.01","net":"1.00"}]')).toThrow("settlement amount mismatch");
    expect(() => parseSettlementJson('[{"transactionId":"x","transactionType":"payment","transactionStatus":"ok","currency":"EUR","gross":"1.00"}]')).toThrow("invalid settlement row");
    expect(() => parseSettlementCsv('a,b\n"broken,x')).toThrow("invalid settlement csv");
  });
  it("keeps import idempotency, actor audit, payout entities, and the order-payment boundary in SQL", () => {
    const migration = read("migrations/20260802_retail_paypal_settlement.sql");
    for (const name of ["retail_paypal_settlement_imports", "retail_paypal_payouts", "retail_paypal_payout_items", "retail_paypal_settlement_matches", "retail_paypal_settlement_exceptions", "retail_import_paypal_settlement_as_actor", "retail_close_paypal_settlement_exception_as_actor", "content_sha256 CHAR(64) NOT NULL UNIQUE", "retail_attribute_admin_audit", "pg_advisory_xact_lock"]) expect(migration).toContain(name);
    expect(migration).not.toContain("UPDATE retail_orders SET");
    expect(migration).not.toContain("INSERT INTO retail_payment_ledger");
  });
  it("locks finance import/close APIs behind same-origin authenticated permissions", () => {
    const route=read("app/api/admin/retail/settlements/route.ts"), close=read("app/api/admin/retail/settlements/exceptions/[id]/close/route.ts");
    expect(route).toContain('requireRetailPermission("finance:read")'); expect(route).toContain('requireRetailPermission("finance:write")'); expect(route).toContain("assertSameOrigin()");
    expect(close).toContain('requireRetailPermission("finance:write")'); expect(close).toContain("assertSameOrigin()");
  });
});
