import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isAuthorizedRetailReservationCron } from "@/src/lib/retail/cron-auth";

const read = (path: string) => readFileSync(path, "utf8");

describe("retail final-review contracts", () => {
  it("fails closed for cron authorization and accepts only the exact bearer credential", () => {
    expect(isAuthorizedRetailReservationCron(null, "secret")).toBe(false);
    expect(isAuthorizedRetailReservationCron("Bearer wrong", "secret")).toBe(false);
    expect(isAuthorizedRetailReservationCron("Bearer secret", "secret")).toBe(true);
    expect(isAuthorizedRetailReservationCron("Bearer secret", "")).toBe(false);
  });

  it("uses the authenticated five-minute external scheduler instead of an unsupported Vercel Hobby cron", () => {
    const workflow = read(".github/workflows/retail-operations-cron.yml");
    expect(workflow).toContain('cron: "*/5 * * * *"');
    expect(workflow).toContain("secrets.RETAIL_CRON_ENDPOINT");
    expect(workflow).toContain("secrets.CRON_SECRET");
    expect(workflow).toContain('!= https://*');
    expect(workflow).toContain('Authorization: Bearer ${CRON_SECRET}');
    expect(workflow).toContain("jq -e");
    expect(workflow).toContain(".pending // 0");
    expect(workflow).toContain(".notifications.failed // 0");
    expect(() => read("vercel.json")).toThrow();
  });

  it("releases expired holds with a legal lock and runs cleanup in checkout", () => {
    const sql = read("migrations/20260727_retail_operations.sql");
    expect(sql).toContain("FOR UPDATE OF rv");
    expect(sql).toContain("PERFORM retail_release_expired_reservations()");
    expect(sql).toContain("status='expired'");
    expect(sql).toContain("RAISE EXCEPTION 'checkout_expired'");
    expect(read("app/api/cron/retail/reservations/route.ts")).toContain("isAuthorizedRetailReservationCron");
  });

  it("returns a stable gone response instead of reusing an expired PayPal order", () => {
    expect(read("app/api/retail/orders/route.ts")).toContain('error: "checkout_expired" }, { status: 410 }');
    expect(read("app/api/retail/capture/route.ts")).toContain('error: "checkout_expired" }, { status: 410 }');
  });

  it("does not prefetch marketplace or wholesale routes from the isolated shop", () => {
    const shell = read("src/components/site-shell.tsx");
    expect(shell).toContain("const isRetailShop");
    expect(shell).toContain("prefetch={isRetailShop ? false : undefined}");
  });

  it("uses signed posting totals without emitting a second net posting", () => {
    const sql = read("migrations/20260727_retail_operations.sql");
    expect(sql).toContain("retail_payment_posting_summary");
    expect(sql).not.toContain("VALUES(o.id,'net'");
    expect(read("app/api/admin/retail/ledger/export/route.ts")).toContain("posting_amount_minor");
  });

  it("keeps omitted address flags null and permits a partial product edit", () => {
    const operations = read("src/lib/retail/operations.ts");
    const productMigration = read("migrations/20260731_retail_storefront_zh.sql");
    expect(operations).toContain("${d.isDefault ?? null}::boolean");
    expect(productMigration).toContain("p_status IS DISTINCT FROM 'published'");
  });

  it("renders operational snapshot, inventory movement, bilingual description, and address fields", () => {
    const ui = read("app/admin/retail/ui.tsx");
    for (const value of ["items_snapshot", "customer_snapshot", "shipping_snapshot", 'titleKey="inventoryLedger"', "descriptionEn", "descriptionAr", "line2", "region", "postalCode", "isDefault", "archive"]) expect(ui).toContain(value);
  });
});
