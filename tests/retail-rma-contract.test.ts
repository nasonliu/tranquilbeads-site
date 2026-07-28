import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("retail RMA contract", () => {
  it("makes refund lifecycle states provider-backed rather than generic transitions", () => {
    const integrity = read("migrations/20260815_retail_rma_refund_integrity.sql");
    const returns = read("src/lib/retail/returns.ts");
    const refundRoute = read("app/api/admin/retail/returns/[id]/refund/route.ts");
    expect(integrity).toContain("refund lifecycle is driven by refund requests");
    expect(integrity).toContain("retail_prepare_return_refund_as_actor");
    expect(integrity).toContain("refund amount exceeds return cap");
    expect(integrity).toContain("CREATE TRIGGER retail_return_refund_completion");
    expect(returns).not.toContain('"refund_pending", "refunded"');
    expect(refundRoute).toContain("prepareAdminReturnRefund");
    expect(refundRoute).toContain("refundRequestId: prepared.refundRequestId");
    expect(returns).not.toContain("returnId: uuid.optional");
    expect(read("app/admin/retail/returns/returns-client.tsx")).toContain("/api/admin/retail/returns/${refundReturnId}/refund");
  });

  it("persists immutable order-line return quantities and a constrained lifecycle", () => {
    const migration = read("migrations/20260803_retail_rma.sql");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS retail_returns");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS retail_return_lines");
    expect(migration).toContain("retail_order_lines");
    expect(migration).toContain("return quantity exceeds purchased quantity");
    expect(migration).toContain("'requested','authorized','in_transit','received','inspected','approved','rejected','refund_pending','refunded','closed','cancelled'");
  });

  it("permits stock only on inspected sellable approval and never on refund completion", () => {
    const migration = read("migrations/20260803_retail_rma.sql");
    expect(migration).toContain("sellable restock requires inspected approval");
    expect(migration).toContain("return_restock_sellable");
    expect(migration).toContain("retail_sync_return_refund_completion");
    const trigger = migration.slice(migration.indexOf("retail_sync_return_refund_completion"), migration.indexOf("retail_admin_list_returns"));
    expect(trigger).not.toContain("retail_variant_inventory_balances SET on_hand");
  });

  it("keeps customer access token-scoped and protects all admin mutations", () => {
    expect(read("app/api/retail/customer/[token]/returns/route.ts")).toContain("listCustomerReturns(token)");
    expect(read("app/api/admin/retail/returns/[id]/route.ts")).toContain('requireRetailPermission("returns:manage")');
    expect(read("app/api/admin/retail/returns/[id]/route.ts")).toContain('requireRetailPermission("inventory:write")');
    expect(read("app/api/admin/retail/returns/[id]/route.ts")).toContain("assertSameOrigin()");
    expect(read("app/api/admin/retail/returns/[id]/refund/route.ts")).toContain('requireRetailPermission("returns:manage")');
    expect(read("app/api/admin/retail/returns/[id]/refund/route.ts")).toContain('requireRetailPermission("orders:refund")');
  });

  it("keeps notes out of list contracts and makes the PII read explicitly audited", () => {
    const migration = read("migrations/20260807_retail_rma_privacy_refund_cap.sql");
    expect(migration).toContain("DROP FUNCTION IF EXISTS retail_customer_list_returns(TEXT)");
    expect(migration).toContain("RETURNS TABLE(public_id UUID,status TEXT,reason TEXT,customer_note TEXT,refund_request_id UUID");
    expect(migration).toContain("retail_record_admin_return_notes_pii_view");
    expect(migration).toContain("return.notes.pii.view");
    expect(migration).toContain("retail_admin_list_returns(p_status TEXT,p_actor_id TEXT");
    expect(read("app/api/admin/retail/returns/route.ts")).toContain('requireRetailPermission("returns:manage")');
    expect(read("app/api/admin/retail/returns/[id]/notes/route.ts")).toContain('requireRetailPermission("orders:pii")');
    expect(read("app/admin/retail/returns/returns-client.tsx")).toContain("canViewNotes");
  });

  it("freezes a merchandise-only refund cap and enforces it inside the link RPC", () => {
    const migration = read("migrations/20260807_retail_rma_privacy_refund_cap.sql");
    expect(migration).toContain("refund_cap_minor BIGINT");
    expect(migration).toContain("refund_cap_calculation JSONB");
    expect(migration).toContain("free_shipping");
    expect(migration).toContain("shippingRefunded',false");
    expect(migration).toContain("refund amount exceeds return cap");
    expect(migration).toContain("retail_return_refund_cap(created_return)");
  });

  it("links only actionable refund states and records the terminal RMA state atomically", () => {
    const migration = read("migrations/20260810_retail_rma_refund_status.sql");
    expect(migration).toContain("'pending','completed','failed','cancelled'");
    expect(migration).toContain("WHEN 'pending' THEN target_status := 'refund_pending'");
    expect(migration).not.toContain("'prepared'");
    expect(migration).toContain("WHEN 'completed' THEN target_status := 'refunded'");
    expect(migration).toContain("refund request status is not linkable");
    expect(migration).toContain("resolved_at=CASE WHEN target_status='refunded'");
    expect(migration).toContain("SELECT * INTO prior FROM retail_return_events");
    expect(migration).toContain("OR prior.detail->>'refundRequestId' IS DISTINCT FROM p_refund::text");
    expect(migration).toContain("'refundStatus',fr.status");
  });

  it("assigns return management only to operations roles and preserves inventory separation", () => {
    const auth = read("src/lib/retail/admin-auth.ts");
    const returns = read("src/lib/retail/returns.ts");
    const permissionMigration = read("migrations/20260805_retail_rma_permissions.sql");
    expect(auth).toContain('"returns:manage"');
    expect(returns).toContain('hasRetailPermission(current, "returns:manage")');
    expect(returns).toContain('hasRetailPermission(current, "inventory:write")');
    expect(returns).toContain('hasRetailPermission(current, "orders:refund")');
    expect(permissionMigration).toContain("actor is not permitted to manage returns");
    expect(permissionMigration).toContain("actor is not permitted to restock sellable inventory");
    expect(permissionMigration).toContain("retail_assert_return_permissions");
  });

  it("asks for a restock choice and then confirms the matching approval action", () => {
    const ui = read("app/admin/retail/returns/returns-client.tsx");
    expect(ui).toContain("sellableRestock = window.confirm(t.restockChoice)");
    expect(ui).toContain("sellableRestock ? t.confirmWithRestock : t.confirmWithoutRestock");
    expect(ui).toContain('sellableRestock, idempotencyKey');
    expect(ui).toContain('href="/admin/retail/overview"');
    expect(ui).toContain('value="zh">中文');
  });
});
