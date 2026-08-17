import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("retail atomic capture and customer finalization", () => {
  it("wraps payment application and customer finalization in one database function", () => {
    const migration = readFileSync("migrations/20260822_retail_atomic_capture_customer_finalize.sql", "utf8");
    expect(migration).toContain("retail_apply_paypal_capture_and_finalize");
    expect(migration).toContain("retail_apply_paypal_capture(");
    expect(migration).toContain("retail_finalize_customer_post_capture");
  });

  it("uses the atomic wrapper for direct capture and webhook processing", () => {
    const db = readFileSync("src/lib/retail/db.ts", "utf8");
    const matches = db.match(/retail_apply_paypal_capture_and_finalize/g) ?? [];
    expect(matches).toHaveLength(2);
    expect(db).toContain('outcome === "duplicate" && eventType === "PAYMENT.CAPTURE.COMPLETED"');
  });
});
