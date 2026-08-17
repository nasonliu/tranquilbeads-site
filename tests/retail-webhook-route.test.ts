import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  after: vi.fn(),
  deliverRetailNotifications: vi.fn(),
  getPaypalAccessToken: vi.fn(),
  getPaypalOrderDetails: vi.fn(),
  processVerifiedWebhook: vi.fn(),
  verifyPaypalWebhook: vi.fn(),
}));

vi.mock("next/server", () => ({ after: mocks.after }));
vi.mock("@/src/lib/retail/gate", () => ({
  getRetailPaymentGate: () => ({ enabled: true, config: {
    paypalClientId: "client-id", paypalClientSecret: "client-secret", paypalWebhookId: "webhook-id", paypalBaseUrl: "https://api-m.sandbox.paypal.com",
  } }),
}));
vi.mock("@/src/lib/retail/paypal", () => ({
  getPaypalAccessToken: mocks.getPaypalAccessToken,
  getPaypalOrderDetails: mocks.getPaypalOrderDetails,
  verifyPaypalWebhook: mocks.verifyPaypalWebhook,
}));
vi.mock("@/src/lib/retail/notification-delivery", () => ({ deliverRetailNotificationsWithDiagnostics: mocks.deliverRetailNotifications }));
vi.mock("@/src/lib/retail/db", () => ({ processVerifiedWebhook: mocks.processVerifiedWebhook }));

import { POST } from "@/app/api/retail/webhook/route";

const captureEvent = {
  id: "WH-capture", event_type: "PAYMENT.CAPTURE.COMPLETED",
  resource: { id: "capture-id", amount: { currency_code: "USD", value: "12.00" }, supplementary_data: { related_ids: { order_id: "order-id" } } },
};

describe("retail PayPal webhook route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getPaypalAccessToken.mockResolvedValue("access-token");
    mocks.verifyPaypalWebhook.mockResolvedValue(true);
    mocks.processVerifiedWebhook.mockResolvedValue("processed");
    mocks.deliverRetailNotifications.mockResolvedValue({ processed: 1, sent: 1, failed: 0, configured: true });
  });

  it("durably processes a verified capture when optional order-details enrichment fails", async () => {
    mocks.getPaypalOrderDetails.mockRejectedValue(new Error("PayPal details unavailable"));

    const response = await POST(new Request("https://example.com/api/retail/webhook", { method: "POST", body: JSON.stringify(captureEvent) }));

    expect(response.status).toBe(200);
    expect(mocks.processVerifiedWebhook).toHaveBeenCalledWith(
      captureEvent.id, captureEvent.event_type, JSON.stringify(captureEvent), captureEvent,
      { email: "", name: "" },
      { recipient: "", line1: "", line2: "", region: "", city: "", postalCode: "", country: "" },
      null, null,
    );
    expect(mocks.after).toHaveBeenCalledOnce();
    await mocks.after.mock.calls[0]![0]();
    expect(mocks.deliverRetailNotifications).toHaveBeenCalledOnce();
  });

  it("uses a duplicate verified capture to retry pending notification delivery", async () => {
    mocks.getPaypalOrderDetails.mockResolvedValue({
      customer: { email: "buyer@example.test", name: "Buyer" },
      shipping: { recipient: "Buyer", line1: "1 Test St", line2: "", region: "CA", city: "Test", postalCode: "94105", country: "US" },
      breakdown: null,
    });
    mocks.processVerifiedWebhook.mockResolvedValue("duplicate");

    const response = await POST(new Request("https://example.com/api/retail/webhook", { method: "POST", body: JSON.stringify(captureEvent) }));

    expect(response.status).toBe(200);
    expect(mocks.after).toHaveBeenCalledOnce();
    await mocks.after.mock.calls[0]![0]();
    expect(mocks.deliverRetailNotifications).toHaveBeenCalledOnce();
  });

  it("returns 503 for a verified capture without an order id", async () => {
    const event = { ...captureEvent, resource: { ...captureEvent.resource, supplementary_data: { related_ids: {} } } };

    const response = await POST(new Request("https://example.com/api/retail/webhook", { method: "POST", body: JSON.stringify(event) }));

    expect(response.status).toBe(503);
    expect(mocks.getPaypalOrderDetails).not.toHaveBeenCalled();
    expect(mocks.processVerifiedWebhook).not.toHaveBeenCalled();
  });

  it("logs only a fixed diagnostic identifier and stage when database processing fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.processVerifiedWebhook.mockRejectedValue(new Error("do not expose this failure"));

    const response = await POST(new Request("https://example.com/api/retail/webhook", { method: "POST", body: JSON.stringify(captureEvent) }));

    expect(response.status).toBe(503);
    expect(error).toHaveBeenCalledExactlyOnceWith("retail_webhook_failed", "db_process", "unknown");
    error.mockRestore();
  });
});
