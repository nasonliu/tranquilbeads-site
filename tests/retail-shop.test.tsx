import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({ default: () => <span /> }));
import { loadRetailPaypalSdk, RetailShop } from "@/src/components/retail-shop";
import { getRetailCopy } from "@/src/data/retail/copy";

const product = { sku: "sku-new", name: { en: "New", ar: "جديد" }, description: { en: "d", ar: "و" }, image: "/retail.jpg", priceMinor: 100, currency: "USD" as const, available: true, stock: 2 };
const variantProduct = { sku: "bracelet", name: { en: "Bracelet", ar: "سوار", zh: "手链" }, description: { en: "d", ar: "و", zh: "描述" }, image: "/retail.jpg", priceMinor: 100, currency: "USD" as const, available: true, stock: 3, variants: [
  { sku: "bracelet-red", name: { en: "Red", ar: "أحمر", zh: "红色" }, options: { colour: "Red" }, priceMinor: 100, available: true, stock: 3 },
  { sku: "bracelet-blue", name: { en: "Blue", ar: "أزرق", zh: "蓝色" }, options: { colour: "Blue" }, priceMinor: 120, available: false, stock: 0 },
] };
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
  it("uses Chinese storefront copy and English catalog fallback", () => {
    render(<RetailShop locale="zh" products={[product]} zones={zones} enabled paypalClientId="client-zh" currency="USD" copy={getRetailCopy("zh")} />);
    expect(screen.getByRole("button", { name: "加入购物车 New" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "加入购物车 New" }));
    expect(screen.getByText("配送地址")).toBeInTheDocument();
  });

  it("requests PayPal's Simplified Chinese SDK locale", () => {
    void loadRetailPaypalSdk("client-zh", "USD", "zh");
    expect(document.querySelector('script[src*="locale=zh_CN"]')).not.toBeNull();
  });

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

  it("removes legacy checkout storage and never persists checkout PII", () => {
    window.localStorage.setItem("noor-retail-checkout-v1", JSON.stringify({ email: "saved@example.com", phone: "5551112222", line1: "1 Saved Road", termsAccepted: true }));
    render(<RetailShop locale="en" products={[product]} zones={zones} enabled paypalClientId="client" currency="USD" copy={copy} />);
    fireEvent.click(screen.getByRole("button", { name: "Add to cart New" }));
    expect(screen.getByLabelText("Email")).toHaveValue("");
    expect(screen.getByLabelText("Phone")).toHaveValue("");
    expect(screen.getByLabelText("Address line 1")).toHaveValue("");
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    fillCheckout();
    expect(window.localStorage.getItem("noor-retail-checkout-v1")).toBeNull();
    const persistedValues = Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.getItem(window.localStorage.key(index) ?? "")).join(" ");
    expect(persistedValues).not.toContain("buyer@example.com");
    expect(persistedValues).not.toContain("1 Main St");
    expect(persistedValues).not.toContain("5551112222");
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

  it("requires a sellable variant, persists its SKU, and sends an optional promotion only for server calculation", async () => {
    const discountedQuote = { ...quote, subtotalMinor: 100, discountMinor: 10, totalMinor: 358, promotionCode: "SAVE10" };
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, quote: discountedQuote }), { status: 200 }));
    vi.stubGlobal("fetch", fetcher);
    render(<RetailShop locale="zh" products={[variantProduct]} zones={zones} enabled paypalClientId="client-variant" currency="USD" copy={getRetailCopy("zh")} />);
    expect(screen.getByRole("button", { name: "加入购物车 手链" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "红色" }));
    fireEvent.click(screen.getByRole("button", { name: "加入购物车 手链 红色" }));
    expect(window.localStorage.getItem("noor-retail-cart-v1")).toContain('"bracelet-red":1');
    fireEvent.change(screen.getByLabelText("电子邮箱"), { target: { value: "buyer@example.com" } });
    fireEvent.change(screen.getByLabelText("收件人"), { target: { value: "Buyer" } });
    fireEvent.change(screen.getByLabelText("地址第一行"), { target: { value: "1 Main St" } });
    fireEvent.change(screen.getByLabelText("城市"), { target: { value: "Austin" } });
    fireEvent.change(screen.getByLabelText("邮政编码"), { target: { value: "78701" } });
    fireEvent.change(screen.getByLabelText("联系电话"), { target: { value: "5551112222" } });
    fireEvent.change(screen.getByLabelText("国家/地区"), { target: { value: "US" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.change(screen.getByLabelText("优惠码"), { target: { value: "SAVE10" } });
    fireEvent.click(screen.getByRole("button", { name: "确认价格" }));
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalled());
    const request = JSON.parse(String(fetcher.mock.calls[0][1].body));
    expect(request).toMatchObject({ items: [{ variantSku: "bracelet-red", quantity: 1 }], promotionCode: "SAVE10" });
    await vi.waitFor(() => expect(screen.getByText("−USD 0.10")).toBeInTheDocument());
    expect(screen.getByText(/已应用: SAVE10/)).toBeInTheDocument();
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

  it("clears in-memory checkout PII after PayPal cancellation", async () => {
    let options: Parameters<NonNullable<typeof window.paypal>["Buttons"]>[0] | undefined;
    window.paypal = { Buttons: vi.fn((value) => { options = value; return { render: vi.fn() }; }) };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, quote }), { status: 200 })));
    render(<RetailShop locale="en" products={[product]} zones={zones} enabled paypalClientId="client-cancel" currency="USD" copy={copy} />);
    fireEvent.click(screen.getByRole("button", { name: "Add to cart New" }));
    fillCheckout();
    fireEvent.click(screen.getByRole("button", { name: "Confirm price" }));
    await vi.waitFor(() => expect(options).toBeDefined());
    options!.onCancel();
    await vi.waitFor(() => expect(screen.getByLabelText("Email")).toHaveValue(""));
    expect(screen.getByLabelText("Phone")).toHaveValue("");
    expect(screen.getByLabelText("Address line 1")).toHaveValue("");
    expect(window.localStorage.getItem("noor-retail-checkout-v1")).toBeNull();
  });

  it("clears checkout PII after successful PayPal capture", async () => {
    let options: Parameters<NonNullable<typeof window.paypal>["Buttons"]>[0] | undefined;
    window.paypal = { Buttons: vi.fn((value) => { options = value; return { render: vi.fn() }; }) };
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/quote")) return new Response(JSON.stringify({ ok: true, quote }), { status: 200 });
      return new Response(JSON.stringify({ ok: true, requestId: "request-1" }), { status: 200 });
    }));
    render(<RetailShop locale="en" products={[product]} zones={zones} enabled paypalClientId="client-success" currency="USD" copy={copy} />);
    fireEvent.click(screen.getByRole("button", { name: "Add to cart New" }));
    fillCheckout();
    fireEvent.click(screen.getByRole("button", { name: "Confirm price" }));
    await vi.waitFor(() => expect(options).toBeDefined());
    await options!.onApprove({ orderID: "PAYPAL-1" });
    await vi.waitFor(() => expect(screen.getByText("Your cart is empty.")).toBeInTheDocument());
    expect(window.localStorage.getItem("noor-retail-checkout-v1")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Add to cart New" }));
    expect(screen.getByLabelText("Email")).toHaveValue("");
    expect(screen.getByLabelText("Phone")).toHaveValue("");
    expect(screen.getByLabelText("Address line 1")).toHaveValue("");
  });
});
