import { describe, expect, it, vi } from "vitest";

import { capturePaypalOrder, createPaypalOrder, getPaypalOrderState, parsePaypalCaptureBreakdown, parsePaypalMinorAmount, PaypalRefundRejectedError, refundPaypalCapture } from "@/src/lib/retail/paypal";

const quote = { currency: "USD", totalMinor: 1250, items: [] };

describe("retail PayPal amounts", () => {
  it("creates with the server price and supplied idempotency key", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "ORDER-1", status: "CREATED", purchase_units: [{ amount: { currency_code: "USD", value: "12.50" } }] }), { status: 201 }));
    await expect(createPaypalOrder(quote, "token", "https://paypal.test", "request-1", fetcher)).resolves.toBe("ORDER-1");
    expect(fetcher).toHaveBeenCalledWith("https://paypal.test/v2/checkout/orders", expect.objectContaining({ headers: expect.objectContaining({ "paypal-request-id": "request-1" }), body: expect.stringContaining('"value":"12.50"') }));
  });

  it("parses only safe positive two-decimal PayPal amounts", () => {
    expect(parsePaypalMinorAmount("12.50")).toBe(1250);
    expect(parsePaypalMinorAmount("0.00")).toBeNull();
    expect(parsePaypalMinorAmount("1.2")).toBeNull();
  });

  it("accepts only internally consistent USD seller receivable breakdowns", () => {
    expect(parsePaypalCaptureBreakdown({ gross_amount: { currency_code: "USD", value: "12.50" }, paypal_fee: { currency_code: "USD", value: "0.75" }, net_amount: { currency_code: "USD", value: "11.75" } })).toEqual({ grossMinor: 1250, feeMinor: 75, netMinor: 1175 });
    expect(parsePaypalCaptureBreakdown({ gross_amount: { currency_code: "USD", value: "12.50" }, paypal_fee: { currency_code: "EUR", value: "0.75" }, net_amount: { currency_code: "USD", value: "11.75" } })).toBeNull();
    expect(parsePaypalCaptureBreakdown({ gross_amount: { currency_code: "USD", value: "12.50" }, paypal_fee: { currency_code: "USD", value: "0.75" }, net_amount: { currency_code: "USD", value: "12.00" } })).toBeNull();
  });

  it("rejects a create response whose amount differs from the server quote", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "ORDER-1", status: "CREATED", purchase_units: [{ amount: { currency_code: "EUR", value: "12.50" } }] }), { status: 201 }));
    await expect(createPaypalOrder(quote, "token", "https://paypal.test", "request-1", fetcher)).rejects.toThrow("paypal_order_failed");
  });

  it("rejects capture responses with a non-matching amount, currency, or state", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: "COMPLETED", purchase_units: [{ payments: { captures: [{ id: "CAP-1", status: "COMPLETED", amount: { currency_code: "JPY", value: "12.50" } }] } }] }), { status: 201 }));
    await expect(capturePaypalOrder("ORDER-1", quote, "token", "https://paypal.test", "capture-1", fetcher)).rejects.toThrow("paypal_capture_invalid");
  });

  it("sends an authoritative item, shipping, tax, discount, and address breakdown", async () => {
    const detailedQuote = {
      currency: "USD", subtotalMinor: 2500, shippingMinor: 500, taxMinor: 150, discountMinor: 100, totalMinor: 3050,
      items: [{ sku: "RETAIL-1", quantity: 1, unitAmountMinor: 2500 }],
      shipping: { recipient: "Buyer", line1: "Street 1", city: "Dubai", country: "AE" },
    };
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "ORDER-2", status: "CREATED", purchase_units: [{ amount: { currency_code: "USD", value: "30.50" } }] }), { status: 201 }));
    await createPaypalOrder(detailedQuote, "token", "https://paypal.test", "request-2", fetcher);
    const request = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));
    expect(request.purchase_units[0]).toMatchObject({
      amount: { value: "30.50", breakdown: { item_total: { value: "25.00" }, shipping: { value: "5.00" }, tax_total: { value: "1.50" }, discount: { value: "1.00" } } },
      items: [{ sku: "RETAIL-1", quantity: "1", unit_amount: { value: "25.00" } }],
      shipping: { name: { full_name: "Buyer" }, address: { address_line_1: "Street 1", admin_area_2: "Dubai", country_code: "AE" } },
    });
    expect(request.application_context.shipping_preference).toBe("SET_PROVIDED_ADDRESS");
  });

  it("uses idempotent PayPal refund requests and validates the returned amount", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "REFUND-1", status: "COMPLETED", amount: { currency_code: "USD", value: "10.00" } }), { status: 201 }));
    await expect(refundPaypalCapture("CAP/one", 1000, "USD", "customer request", "token", "https://paypal.test", "refund-key", fetcher)).resolves.toBe("REFUND-1");
    expect(fetcher).toHaveBeenCalledWith("https://paypal.test/v2/payments/captures/CAP%2Fone/refund", expect.objectContaining({ headers: expect.objectContaining({ "paypal-request-id": "refund-key" }), body: expect.stringContaining('"value":"10.00"') }));
  });

  it("distinguishes permanent refund rejection from an unknown remote outcome", async () => {
    const rejected = vi.fn().mockResolvedValue(new Response("invalid", { status: 422 }));
    await expect(refundPaypalCapture("CAP-1", 1000, "USD", "reason", "token", "https://paypal.test", "key-1", rejected)).rejects.toBeInstanceOf(PaypalRefundRejectedError);
    const unknown = vi.fn().mockResolvedValue(new Response("gateway", { status: 500 }));
    await expect(refundPaypalCapture("CAP-1", 1000, "USD", "reason", "token", "https://paypal.test", "key-2", unknown)).rejects.toThrow("paypal_refund_unknown");
  });

  it("recovers a completed capture from the remote order state", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: "COMPLETED", purchase_units: [{ payments: { captures: [{ id: "CAP-2", status: "COMPLETED", amount: { currency_code: "USD", value: "12.50" } }] } }] }), { status: 200 }));
    await expect(getPaypalOrderState("ORDER-2", "token", "https://paypal.test", fetcher)).resolves.toEqual({ status: "COMPLETED", captureId: "CAP-2", captureCurrency: "USD", captureAmountMinor: 1250 });
  });
});
