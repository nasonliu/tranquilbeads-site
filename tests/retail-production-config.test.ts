// @vitest-environment node
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const nextConfig = readFileSync("next.config.ts", "utf8");
const workflow = readFileSync(".github/workflows/retail-ci.yml", "utf8");
const migrationRunner = readFileSync("scripts/run-retail-migrations.mjs", "utf8");
const gate = readFileSync("src/lib/retail/gate.ts", "utf8");
const tsconfig = JSON.parse(readFileSync("tsconfig.json", "utf8")) as { exclude?: string[] };

describe("retail production build configuration", () => {
  it("does not bypass TypeScript errors during a production build", () => {
    expect(nextConfig).not.toContain("ignoreBuildErrors: true");
  });

  it("generates route-aware Next.js types before clean-checkout TypeScript checks", () => {
    expect(workflow.indexOf("npm run typegen")).toBeLessThan(workflow.indexOf("npm run typecheck:retail"));
    expect(workflow.indexOf("npm run typegen")).toBeLessThan(workflow.indexOf("npm run typecheck:admin"));
  });

  it("deploys and exercises the customer-address administration migration", () => {
    const addressMigration = "20260806_retail_customer_address_admin.sql";
    expect(migrationRunner).toContain(addressMigration);
    expect(migrationRunner.indexOf("20260805_retail_rma_permissions.sql")).toBeLessThan(
      migrationRunner.indexOf(addressMigration),
    );
    expect(workflow).toContain("tests/retail-customer-address-admin.integration.sql");
  });

  it("deploys the RMA and inventory hardening migrations in order and exercises the race gate", () => {
    const addressMigration = "20260806_retail_customer_address_admin.sql";
    const rmaPrivacyMigration = "20260807_retail_rma_privacy_refund_cap.sql";
    const concurrencyMigration = "20260808_retail_concurrency_lock_order.sql";
    const releaseCatalogMigration = "20260809_retail_release_catalog_lock_order.sql";
    const rmaRefundStatusMigration = "20260810_retail_rma_refund_status.sql";
    expect(migrationRunner.indexOf(addressMigration)).toBeLessThan(migrationRunner.indexOf(rmaPrivacyMigration));
    expect(migrationRunner.indexOf(rmaPrivacyMigration)).toBeLessThan(migrationRunner.indexOf(concurrencyMigration));
    expect(migrationRunner.indexOf(concurrencyMigration)).toBeLessThan(migrationRunner.indexOf(releaseCatalogMigration));
    expect(migrationRunner.indexOf(releaseCatalogMigration)).toBeLessThan(migrationRunner.indexOf(rmaRefundStatusMigration));
    expect(workflow).toContain("npm run test:retail:concurrency");
    expect(workflow.indexOf("npm run migrate:retail")).toBeLessThan(workflow.indexOf("npm run test:retail:concurrency"));
  });

  it("does not type-check the retired duplicate src/app route tree", () => {
    expect(tsconfig.exclude).toContain("src/app");
  });

  it("applies baseline response hardening without a PayPal-breaking CSP", () => {
    expect(nextConfig).toContain('key: "X-Content-Type-Options", value: "nosniff"');
    expect(nextConfig).toContain('key: "Referrer-Policy", value: "strict-origin-when-cross-origin"');
    expect(nextConfig).toContain('key: "X-Frame-Options", value: "DENY"');
    expect(nextConfig).toContain('key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=()"');
    expect(nextConfig).not.toContain("Content-Security-Policy");
  });

  it("refuses live PayPal order creation without production shipping and email gates", () => {
    expect(gate).toContain("isRetailNotificationConfigurationValid");
    expect(gate).toContain("isRetailShippingConfigurationValid");
  });
});
