import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({ default: () => <span /> }));
import { RetailShop } from "@/src/components/retail-shop";

const product = { sku: "sku-new", name: { en: "New", ar: "جديد" }, description: { en: "d", ar: "و" }, image: "/retail.jpg", priceMinor: 100, currency: "USD" as const, available: true };
const copy = { cart: "Cart", checkout: "Pay", add: "Add", emptyCart: "Empty", unavailable: "Unavailable" };

afterEach(() => { document.body.replaceChildren(); delete window.paypal; vi.unstubAllGlobals(); });

describe("retail PayPal SDK lifecycle", () => {
  it("does not render an unmounted loading instance, but renders the replacement with its own container", async () => {
    const renderButton = vi.fn();
    const first = render(<RetailShop locale="en" products={[product]} enabled paypalClientId="client" currency="USD" copy={copy} />);
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    await vi.waitFor(() => expect(document.querySelector("script")).not.toBeNull());
    const script = document.querySelector("script")!;
    first.unmount();
    render(<RetailShop locale="ar" products={[product]} enabled paypalClientId="client" currency="USD" copy={copy} />);
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    window.paypal = { Buttons: vi.fn(() => ({ render: renderButton })) };
    script.dispatchEvent(new Event("load"));
    await vi.waitFor(() => expect(renderButton).toHaveBeenCalledTimes(1));
    expect(renderButton.mock.calls[0][0]).toBeInstanceOf(HTMLElement);
  });

  it("clears the purchased cart so a later checkout receives a new request id", async () => {
    let options: Parameters<NonNullable<typeof window.paypal>["Buttons"]>[0] | undefined;
    window.paypal = { Buttons: vi.fn((value) => { options = value; return { render: vi.fn() }; }) };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    render(<RetailShop locale="en" products={[{ ...product, stock: 2 }]} enabled paypalClientId="client-clear" currency="USD" copy={copy} />);
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    await vi.waitFor(() => expect(options).toBeDefined());
    await options!.onApprove({ orderID: "PAYPAL-1" });
    await vi.waitFor(() => expect(screen.getByText("Empty")).toBeInTheDocument());
    expect(screen.getByRole("status")).toHaveTextContent("Order received.");
  });

  it("keeps the cart but discards an expired checkout request id before retrying", async () => {
    let options: Parameters<NonNullable<typeof window.paypal>["Buttons"]>[0] | undefined;
    const requestIds: string[] = [];
    window.paypal = { Buttons: vi.fn((value) => { options = value; return { render: vi.fn() }; }) };
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("/orders")) {
        const body = JSON.parse(String(init?.body)) as { requestId: string };
        requestIds.push(body.requestId);
        return new Response(JSON.stringify({ ok: true, orderId: `PAYPAL-${requestIds.length}` }), { status: 200 });
      }
      return new Response(JSON.stringify({ ok: false, error: "checkout_expired" }), { status: 410 });
    }));
    render(<RetailShop locale="en" products={[{ ...product, stock: 2 }]} enabled paypalClientId="client-expired" currency="USD" copy={copy} />);
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    await vi.waitFor(() => expect(options).toBeDefined());
    await expect(options!.createOrder()).resolves.toBe("PAYPAL-1");
    await options!.onApprove({ orderID: "PAYPAL-1" });
    expect(screen.getByText("sku-new × 1")).toBeInTheDocument();
    await vi.waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Checkout expired. Please try again."));
    await expect(options!.createOrder()).resolves.toBe("PAYPAL-2");
    expect(requestIds).toHaveLength(2);
    expect(requestIds[1]).not.toBe(requestIds[0]);
  });
});
