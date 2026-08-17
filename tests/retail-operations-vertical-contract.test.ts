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
    const orders = read("app/api/retail/orders/route.ts");
    expect(orders).toContain("const variantItemDto");
    expect(orders).toContain("quantity: z.number().int().min(1).max(10)");
    expect(orders).toContain("items: z.array(variantItemDto).min(1).max(10)");
    expect(read("src/lib/retail/db.ts")).toContain("retail_release_order_reservations");
    const v3 = read("migrations/20260802_retail_variants_promotions.sql");
    expect(v3).toContain("UPDATE retail_variant_inventory_balances SET reserved=reserved-r.quantity");
    expect(v3).toContain("CASE WHEN NEW.status='expired' THEN 'expired' ELSE 'released' END");
    expect(v3).toContain("UPDATE retail_promotion_redemptions SET status='released'");
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
    expect(media).toContain('requireRetailPermission("products:write")'); expect(media).toContain("assertSameOrigin");
    const ui = read("app/admin/retail/ui.tsx");
    expect(ui).toContain("copy.productImages");
    expect(ui).toContain('"/api/admin/retail/media/outbox", "POST"');
    expect(ui).toContain("copy.retryOutbox");
  });
  it("leases notifications and serializes the complete migration run", () => {
    expect(read("src/lib/retail/notifications.ts")).toContain("status='processing' AND claimed_at<now()-interval '10 minutes'");
    const runner = read("scripts/run-retail-migrations.mjs");
    expect(runner).toContain('client.query("BEGIN")');
    expect(runner).toContain('client.query("COMMIT")');
    expect(runner).toContain("pg_advisory_lock(hashtextextended");
    expect(runner).toContain("migrationLockHeld = true");
    expect(runner).toContain("pg_advisory_unlock(hashtextextended");
    expect(runner.indexOf("pg_advisory_lock(hashtextextended")).toBeLessThan(runner.indexOf("if (migrationTarget)"));
    expect(runner.indexOf("if (migrationTarget)")).toBeLessThan(runner.indexOf("for (const name of selectedMigrationNames)"));
    expect(runner).not.toContain("pg_advisory_xact_lock");
  });
});
