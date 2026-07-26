import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({ default: () => <span /> }));
import { RetailShop } from "@/src/components/retail-shop";

const product = { sku: "sku-new", name: { en: "New", ar: "جديد" }, description: { en: "d", ar: "و" }, image: "/retail.jpg", priceMinor: 100, currency: "USD" as const, available: true };
const copy = { cart: "Cart", checkout: "Pay", add: "Add", emptyCart: "Empty", unavailable: "Unavailable" };

afterEach(() => { document.body.replaceChildren(); delete window.paypal; });

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
});
