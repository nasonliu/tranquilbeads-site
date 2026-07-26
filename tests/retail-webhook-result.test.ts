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
    const source = readFileSync("src/lib/retail/db.ts", "utf8");
    expect(source).toContain("status = 'captured' AND capture_id = ${captureId}");
  });
});
