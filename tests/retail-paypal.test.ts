import { describe, expect, it, vi } from "vitest";

import { capturePaypalOrder, createPaypalOrder, parsePaypalCaptureBreakdown, parsePaypalMinorAmount } from "@/src/lib/retail/paypal";

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
});
