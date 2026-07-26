import { describe, expect, it, vi } from "vitest";

import { verifyPaypalWebhook } from "@/src/lib/retail/paypal";

describe("PayPal webhook verification", () => {
  it("uses PayPal's verification endpoint with the received transmission headers and raw event", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ verification_status: "SUCCESS" }), { status: 200 }));
    const event = { id: "WH-1", event_type: "PAYMENT.CAPTURE.COMPLETED" };
    const request = new Request("https://example.com/api/retail/webhook", {
      method: "POST",
      headers: {
        "paypal-auth-algo": "SHA256withRSA",
        "paypal-cert-url": "https://api-m.paypal.com/cert",
        "paypal-transmission-id": "transmission-id",
        "paypal-transmission-sig": "signature",
        "paypal-transmission-time": "2026-07-26T00:00:00Z",
      },
      body: JSON.stringify(event),
    });

    await expect(verifyPaypalWebhook(request.headers, event, { webhookId: "webhook-id", accessToken: "token", baseUrl: "https://api-m.sandbox.paypal.com", fetcher })).resolves.toBe(true);
    expect(fetcher).toHaveBeenCalledWith("https://api-m.sandbox.paypal.com/v1/notifications/verify-webhook-signature", expect.objectContaining({ method: "POST" }));
  });

  it("fails closed when a required PayPal signature header is absent", async () => {
    await expect(verifyPaypalWebhook(new Headers(), {}, { webhookId: "webhook-id", accessToken: "token", baseUrl: "https://api-m.sandbox.paypal.com", fetcher: fetch })).resolves.toBe(false);
  });
});
