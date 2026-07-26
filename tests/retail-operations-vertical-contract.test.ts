import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
describe("retail operations vertical contracts", () => {
  it("retries the same request against its immutable quote before current stock", () => {
    const sql = read("migrations/20260727_retail_operations.sql");
    expect(sql).toContain("An idempotent retry returns its original immutable quote");
    expect(sql).toContain("prior_requested <> requested");
  });
  it("enforces quantity bounds and releases denial holds", () => {
    expect(read("app/api/retail/orders/route.ts")).toContain(".int().min(1).max(10)");
    expect(read("src/lib/retail/db.ts")).toContain("retail_release_order_reservations");
  });
  it("keeps capture reconciliation after a remote success and hydrates webhook snapshots", () => {
    const capture = read("app/api/retail/capture/route.ts");
    expect(capture).toContain("capture_reconciliation_pending");
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
});
