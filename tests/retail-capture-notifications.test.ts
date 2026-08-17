import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  after: vi.fn(),
  auditRetailEvent: vi.fn(),
  capturePaypalOrder: vi.fn(),
  claimRetailCapture: vi.fn(),
  consumeRetailRateLimit: vi.fn(),
  deliverRetailNotifications: vi.fn(),
  finalizeRetailCustomerPostCapture: vi.fn(),
  getPaypalAccessToken: vi.fn(),
  getRetailOrder: vi.fn(),
  getPaypalOrderDetails: vi.fn(),
  getPaypalOrderState: vi.fn(),
  markRetailOrderCaptured: vi.fn(),
  restoreRetailOrderAfterCaptureFailure: vi.fn(),
}));

vi.mock("next/server", () => ({ after: mocks.after }));
vi.mock("@/src/lib/retail/gate", () => ({
  getRetailPaymentGate: () => ({
    enabled: true,
    config: {
      paypalClientId: "client-id",
      paypalClientSecret: "client-secret",
      paypalBaseUrl: "https://api-m.sandbox.paypal.com",
    },
  }),
}));
vi.mock("@/src/lib/retail/notification-delivery", () => ({ deliverRetailNotificationsWithDiagnostics: mocks.deliverRetailNotifications }));
vi.mock("@/src/lib/retail/paypal", () => ({
  capturePaypalOrder: mocks.capturePaypalOrder,
  getPaypalAccessToken: mocks.getPaypalAccessToken,
  getPaypalOrderDetails: mocks.getPaypalOrderDetails,
  getPaypalOrderState: mocks.getPaypalOrderState,
}));
vi.mock("@/src/lib/retail/rate-limit", () => ({ consumeRetailRateLimit: mocks.consumeRetailRateLimit }));
vi.mock("@/src/lib/retail/db", () => ({
  auditRetailEvent: mocks.auditRetailEvent,
  claimRetailCapture: mocks.claimRetailCapture,
  finalizeRetailCustomerPostCapture: mocks.finalizeRetailCustomerPostCapture,
  getRetailOrder: mocks.getRetailOrder,
  markRetailOrderCaptured: mocks.markRetailOrderCaptured,
  restoreRetailOrderAfterCaptureFailure: mocks.restoreRetailOrderAfterCaptureFailure,
}));

import { POST } from "@/app/api/retail/capture/route";

const requestId = "11111111-1111-4111-8111-111111111111";
const currentOrder = {
  client_request_id: requestId,
  status: "approved",
  subtotal_minor: 1733,
  shipping_minor: 500,
  tax_minor: 0,
  discount_minor: 0,
  shipping_method: "standard",
  checkout_shipping: {
    recipient: "Buyer",
    line1: "1 Test St",
    city: "Test",
    region: "CA",
    postalCode: "94105",
    country: "US",
  },
  items_snapshot: [{ sku: "TEST-33", quantity: 1, unitAmountMinor: 1733 }],
};

describe("retail capture notification delivery", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.consumeRetailRateLimit.mockResolvedValue(true);
    mocks.getPaypalAccessToken.mockResolvedValue("access-token");
    mocks.getRetailOrder.mockResolvedValue(currentOrder);
    mocks.claimRetailCapture.mockResolvedValue({ currency: "USD", amount_minor: 2233 });
    mocks.capturePaypalOrder.mockResolvedValue("capture-id");
    mocks.getPaypalOrderDetails.mockResolvedValue({
      customer: { email: "buyer@example.test", name: "Buyer" },
      shipping: currentOrder.checkout_shipping,
      breakdown: null,
    });
    mocks.markRetailOrderCaptured.mockResolvedValue(true);
    mocks.finalizeRetailCustomerPostCapture.mockResolvedValue(true);
    mocks.deliverRetailNotifications.mockResolvedValue({ processed: 2, sent: 2, failed: 0, configured: true });
  });

  it("schedules the idempotent outbox sender after a successful capture", async () => {
    const response = await POST(new Request("https://example.test/api/retail/capture", {
      method: "POST",
      body: JSON.stringify({ orderId: "paypal-order-id", requestId }),
    }));

    expect(response.status).toBe(200);
    expect(mocks.markRetailOrderCaptured).toHaveBeenCalledOnce();
    expect(mocks.after).toHaveBeenCalledOnce();
    await mocks.after.mock.calls[0]![0]();
    expect(mocks.deliverRetailNotifications).toHaveBeenCalledOnce();
  });

  it("also drains pending notifications when capture is replayed", async () => {
    mocks.getRetailOrder.mockResolvedValue({ ...currentOrder, status: "captured" });

    const response = await POST(new Request("https://example.test/api/retail/capture", {
      method: "POST",
      body: JSON.stringify({ orderId: "paypal-order-id", requestId }),
    }));

    expect(response.status).toBe(200);
    expect(mocks.capturePaypalOrder).not.toHaveBeenCalled();
    expect(mocks.finalizeRetailCustomerPostCapture).toHaveBeenCalledWith("paypal-order-id");
    expect(mocks.after).toHaveBeenCalledOnce();
    await mocks.after.mock.calls[0]![0]();
    expect(mocks.deliverRetailNotifications).toHaveBeenCalledOnce();
  });
});
