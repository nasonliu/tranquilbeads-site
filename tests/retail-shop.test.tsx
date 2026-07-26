import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({ default: () => <span /> }));
import { RetailShop } from "@/src/components/retail-shop";
import { getRetailCopy } from "@/src/data/retail/copy";

const product = { sku: "sku-new", name: { en: "New", ar: "جديد" }, description: { en: "d", ar: "و" }, image: "/retail.jpg", priceMinor: 100, currency: "USD" as const, available: true, stock: 2 };
const zones = [{ country: "US", name: { en: "United States", ar: "الولايات المتحدة" }, shippingMinor: 250, freeShippingThresholdMinor: null, taxRateBps: 500 }];
const quote = { currency: "USD" as const, subtotalMinor: 100, shippingMinor: 250, taxMinor: 18, totalMinor: 368, shippingMethod: "standard" as const };
const copy = getRetailCopy("en");

afterEach(() => { document.body.replaceChildren(); window.localStorage.clear(); delete window.paypal; vi.unstubAllGlobals(); });

function fillCheckout() {
  for (const [label, value] of [["Email", "buyer@example.com"], ["Recipient", "Buyer"], ["Address line 1", "1 Main St"], ["City", "Austin"], ["Postal code", "78701"], ["Phone", "5551112222"]]) fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fireEvent.change(screen.getByLabelText("Country"), { target: { value: "US" } });
  fireEvent.click(screen.getByRole("checkbox"));
}

describe("retail storefront checkout", () => {
  it("keeps an accessible persistent cart with quantity controls", () => {
    render(<RetailShop locale="en" products={[product]} zones={zones} enabled paypalClientId="client" currency="USD" copy={copy} />);
    fireEvent.click(screen.getByRole("button", { name: "Add to cart New" }));
    fireEvent.click(screen.getByRole("button", { name: "Increase quantity New" }));
    expect(screen.getByLabelText("New quantity")).toHaveTextContent("2");
    expect(screen.getByText("USD 2.00")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Decrease quantity New" }));
    expect(window.localStorage.getItem("noor-retail-cart-v1")).toContain('"sku-new":1');
    fireEvent.click(screen.getByRole("button", { name: "Remove New" }));
    expect(screen.getByText("Your cart is empty.")).toBeInTheDocument();
  });

  it("quotes the complete accepted checkout before loading PayPal and sends the authoritative total", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, quote }), { status: 200 }));
    vi.stubGlobal("fetch", fetcher);
    render(<RetailShop locale="en" products={[product]} zones={zones} enabled paypalClientId="client" currency="USD" copy={copy} />);
    fireEvent.click(screen.getByRole("button", { name: "Add to cart New" }));
    fillCheckout();
    fireEvent.click(screen.getByRole("button", { name: "Confirm price" }));
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledWith("/api/retail/quote", expect.anything()));
    const quoteRequest = JSON.parse(String(fetcher.mock.calls[0][1].body));
    expect(quoteRequest.checkout).toMatchObject({ email: "buyer@example.com", country: "US", termsVersion: "2026-07-28", termsAccepted: true });
    await vi.waitFor(() => expect(screen.getByText("USD 3.68")).toBeInTheDocument());
    expect(document.querySelector("script")).not.toBeNull();
  });

  it("retains the cart and resets the idempotency key when checkout expires", async () => {
    let options: Parameters<NonNullable<typeof window.paypal>["Buttons"]>[0] | undefined;
    const requestIds: string[] = [];
    window.paypal = { Buttons: vi.fn((value) => { options = value; return { render: vi.fn() }; }) };
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("/quote")) return new Response(JSON.stringify({ ok: true, quote }), { status: 200 });
      if (String(input).includes("/orders")) { const body = JSON.parse(String(init?.body)); requestIds.push(body.requestId); expect(body.expectedTotalMinor).toBe(368); return new Response(JSON.stringify({ ok: true, orderId: `PAYPAL-${requestIds.length}` }), { status: 200 }); }
      return new Response(JSON.stringify({ ok: false, error: "checkout_expired" }), { status: 410 });
    }));
    render(<RetailShop locale="en" products={[product]} zones={zones} enabled paypalClientId="client-expired" currency="USD" copy={copy} />);
    fireEvent.click(screen.getByRole("button", { name: "Add to cart New" }));
    fillCheckout();
    fireEvent.click(screen.getByRole("button", { name: "Confirm price" }));
    await vi.waitFor(() => expect(options).toBeDefined());
    await expect(options!.createOrder()).resolves.toBe("PAYPAL-1");
    await options!.onApprove({ orderID: "PAYPAL-1" });
    expect(screen.getByLabelText("New quantity")).toHaveTextContent("1");
    await vi.waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Checkout expired. Please try again."));
    await expect(options!.createOrder()).resolves.toBe("PAYPAL-2");
    expect(requestIds[1]).not.toBe(requestIds[0]);
  });
});
