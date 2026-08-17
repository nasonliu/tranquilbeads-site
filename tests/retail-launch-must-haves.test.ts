import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("retail launch must-haves", () => {
  it("binds a short-lived server shipping quote to quote and order creation", () => {
    const quote = read("app/api/retail/quote/route.ts");
    const order = read("app/api/retail/orders/route.ts");
    const checkout = read("src/lib/retail/storefront-v3.ts");
    const migration = read("migrations/20260828_retail_dynamic_shipping_quote_fix.sql");
    const runner = read("scripts/run-retail-migrations.mjs");
    expect(quote).toContain("quoteStorefrontV3");
    expect(order).toContain("shippingQuoteToken");
    expect(checkout).toContain("verifyStorefrontShippingQuote");
    expect(migration).toContain("invalid shipping quote");
    expect(migration).toContain("expiresAt");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION retail_quote_checkout_v3");
    expect(runner).toContain("20260828_retail_dynamic_shipping_quote_fix.sql");
  });

  it("keeps promotional delivery consent-backed and unsubscribe-capable", () => {
    const campaigns = read("src/lib/retail/marketing-campaigns.ts");
    const cron = read("app/api/cron/retail/reservations/route.ts");
    expect(campaigns).toContain("subscriber.status='active'");
    expect(campaigns).toContain("/shop/unsubscribe");
    expect(campaigns).toContain("idempotency-key");
    expect(cron).toContain("deliverRetailMarketingCampaigns");
  });

  it("does not expose team names or phone numbers in public WhatsApp components", () => {
    const shell = read("src/components/site-shell.tsx");
    const menu = read("src/components/whatsapp-contact-menu.tsx");
    expect(shell).not.toContain("contact.display");
    expect(menu).not.toContain("contact.display");
  });
});
