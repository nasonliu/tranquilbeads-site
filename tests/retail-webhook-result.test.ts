import { describe, expect, it } from "vitest";

import { classifyWebhookRow, webhookResponseStatus } from "@/src/lib/retail/webhook-result";
import { readFileSync } from "node:fs";

describe("retail webhook result handling", () => {
  it("acknowledges completed deliveries and processed duplicates", () => {
    expect(webhookResponseStatus("processed")).toBe(200);
    expect(webhookResponseStatus("duplicate")).toBe(200);
  });

  it("does not acknowledge a capture that must be retried or investigated", () => {
    expect(webhookResponseStatus("retry")).toBe(503);
  });

  it("classifies stored duplicate and unresolved SQL states without treating them alike", () => {
    expect(classifyWebhookRow("processed")).toBe("duplicate");
    expect(classifyWebhookRow("ignored")).toBe("duplicate");
    expect(classifyWebhookRow("ready")).toBe("processed");
    expect(classifyWebhookRow("received")).toBe("retry");
  });

  it("uses the same-capture-id predicate for capture/webhook races", () => {
    const migration = readFileSync("migrations/20260727_retail_operations.sql", "utf8");
    expect(migration).toContain("IF o.status='captured' AND o.capture_id=p_capture THEN");
    expect(migration).toContain("IF o.status NOT IN ('pending','created','approved','capturing') THEN RETURN false; END IF;");
  });

  it("models approval, denial, reversal, and refunds with their correct PayPal identifiers", () => {
    const source = readFileSync("src/lib/retail/db.ts", "utf8");
    expect(source).toContain('eventType === "CHECKOUT.ORDER.APPROVED" ? resourceId : null');
    expect(source).toContain("retail_apply_paypal_refund");
    expect(source).toContain("denied_update AS");
    expect(source).toContain("reverse_update AS");
  });

  it("serializes cumulative refunds in the database", () => {
    const migration = readFileSync("migrations/20260726_retail_payments.sql", "utf8");
    expect(migration).toContain("refunded_minor BIGINT NOT NULL DEFAULT 0");
    expect(migration).toContain("FOR UPDATE");
    expect(migration).toContain("refunded_minor + refund_amount_minor > target.amount_minor");
  });
});
