import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
describe("retail operations vertical contracts", () => {
  it("retries the same request against its immutable quote before current stock", () => {
    const sql = read("migrations/20260727_retail_operations.sql");
    expect(sql).toContain("An idempotent retry returns its original immutable quote");
    expect(sql).toContain("prior_requested <> requested");
  });
  it("rechecks price and publication state after taking checkout locks", () => {
    const sql = read("migrations/20260728_retail_checkout_v2.sql");
    expect(sql).toContain("Once all");
    expect(sql).toContain("p.status='published'");
    expect(sql).toContain("quoted->>'unitAmountMinor'");
    expect(sql).toContain("SELECT * INTO locked_zone FROM retail_shipping_zones");
    expect(sql).toContain("locked_shipping<>q.shipping_minor");
  });
  it("enforces quantity bounds and releases denial holds", () => {
    expect(read("src/lib/retail/operations.ts")).toContain("quantity:z.number().int().min(1).max(10)");
    expect(read("app/api/retail/orders/route.ts")).toContain("retailCartDto");
    expect(read("src/lib/retail/db.ts")).toContain("retail_release_order_reservations");
  });
  it("keeps capture reconciliation after a remote success and hydrates webhook snapshots", () => {
    const capture = read("app/api/retail/capture/route.ts");
    expect(capture).toContain("capture_reconciliation_pending");
    expect(capture.indexOf("current.client_request_id!==input.requestId")).toBeLessThan(capture.indexOf("claimRetailCapture(input.orderId)"));
    expect(capture).toContain('["CREATED","APPROVED","VOIDED","PAYER_ACTION_REQUIRED"].includes(state.status)');
    expect(capture).not.toContain("restoreRetailOrderAfterCaptureFailure(input.orderId);\n      return Response.json({ ok: false, error: \"capture_reconciliation_pending");
    const webhook = read("app/api/retail/webhook/route.ts");
    expect(webhook).toContain("getPaypalOrderDetails");
    expect(webhook).toContain("details.breakdown?.feeMinor");
  });
  it("protects admin Blob media and exposes the operator controls", () => {
    const media = read("app/api/admin/retail/media/route.ts");
    expect(media).toContain("requireRetailAdmin"); expect(media).toContain("assertSameOrigin");
    expect(read("app/admin/retail/ui.tsx")).toContain("Product images");
    expect(read("app/admin/retail/ui.tsx")).toContain("Retry blob deletion outbox");
  });
  it("leases notifications and applies each migration with an explicit transaction", () => {
    expect(read("src/lib/retail/notifications.ts")).toContain("status='processing' AND claimed_at<now()-interval '10 minutes'");
    const runner = read("scripts/run-retail-migrations.mjs");
    expect(runner).toContain("BEGIN;");
    expect(runner).toContain("COMMIT;");
  });
});
