import { afterEach, describe, expect, it, vi } from "vitest";

import { deliverRetailNotificationsWithDiagnostics } from "@/src/lib/retail/notification-delivery";

describe("retail notification delivery diagnostics", () => {
  afterEach(() => vi.restoreAllMocks());

  it("reports missing configuration without logging any credential value", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(deliverRetailNotificationsWithDiagnostics(async () => ({
      processed: 0, sent: 0, failed: 0, configured: false,
    }))).resolves.toMatchObject({ configured: false });
    expect(error).toHaveBeenCalledExactlyOnceWith(
      "retail_notification_delivery_incomplete", "not_configured", 0,
    );
  });

  it("reports a bounded failed count while preserving the sender result", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(deliverRetailNotificationsWithDiagnostics(async () => ({
      processed: 3, sent: 2, failed: 1, configured: true,
    }))).resolves.toMatchObject({ processed: 3, sent: 2, failed: 1, configured: true });
    expect(error).toHaveBeenCalledExactlyOnceWith(
      "retail_notification_delivery_incomplete", "delivery_failed", 1,
    );
  });

  it("does not expose provider exception text", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(deliverRetailNotificationsWithDiagnostics(async () => {
      throw new Error("recipient@example.test bearer-secret");
    })).resolves.toEqual({ processed: 0, sent: 0, failed: 0, configured: false });
    expect(error).toHaveBeenCalledExactlyOnceWith(
      "retail_notification_delivery_incomplete", "worker_error", 0,
    );
    expect(JSON.stringify(error.mock.calls)).not.toContain("recipient@example.test");
  });
});
