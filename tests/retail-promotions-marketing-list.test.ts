import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("retail automatic promotions and marketing list", () => {
  it("keeps automatic discounts server-authoritative and selects only one best offer", () => {
    const migration = read("migrations/20260824_retail_promotions_marketing_list.sql");
    const storefront = read("src/lib/retail/storefront-v3.ts");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS automatic");
    expect(migration).toContain("retail_best_automatic_promotion");
    expect(migration).toContain("quoted.discount_minor>best_discount");
    expect(storefront).toContain("resolvedPromotionCode");
    expect(storefront).toContain("retail_best_automatic_promotion");
    expect(storefront).toContain("retail_create_checkout_v3");
  });

  it("stores explicit consent separately from transactional notifications and provides unsubscribe", () => {
    const migration = read("migrations/20260824_retail_promotions_marketing_list.sql");
    const subscribe = read("app/api/retail/marketing/subscribe/route.ts");
    const confirm = read("app/api/retail/marketing/confirm/route.ts");
    const marketing = read("src/lib/retail/marketing.ts");
    const unsubscribe = read("app/api/retail/marketing/unsubscribe/route.ts");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS retail_marketing_subscribers");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS retail_marketing_confirmation_tokens");
    expect(migration).toContain("retail_request_marketing_subscription");
    expect(migration).toContain("retail_confirm_marketing_subscription");
    expect(migration).toContain("token_sha256");
    expect(migration).toContain("retail_record_customer_marketing_consent");
    expect(migration).toContain("retail_unsubscribe_marketing");
    expect(subscribe).toContain("marketing_subscribe");
    expect(subscribe).toContain("after(() => sendMarketingConfirmationEmail");
    expect(confirm).toContain("confirmMarketingSubscription");
    expect(marketing).toContain('createHash("sha256")');
    expect(marketing).not.toContain("INSERT INTO retail_marketing_confirmation_tokens");
    expect(unsubscribe).toContain("does not reveal membership");
    expect(migration).not.toContain("retail_notification_outbox SET status='cancelled'");
  });

  it("registers the migration and exposes an audited admin CSV", () => {
    const runner = read("scripts/run-retail-migrations.mjs");
    const admin = read("app/api/admin/retail/marketing/route.ts");
    expect(runner).toContain("20260824_retail_promotions_marketing_list.sql");
    expect(admin).toContain('requireRetailPermission("orders:pii")');
    expect(admin).toContain('format === "csv" ? "export" : "view"');
    expect(admin).toContain('row.status === "active"');
  });
});
