import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({ default: () => <span /> }));
import { loadRetailPaypalSdk, RetailShop } from "@/src/components/retail-shop";
import { RetailReferenceCurrencyProvider, RetailReferenceCurrencyToolbar } from "@/src/components/retail-reference-currency";
import { getRetailCopy } from "@/src/data/retail/copy";
import { localizeRetailVariantOptions } from "@/src/data/retail/types";
import type { ReferenceCurrencySnapshot } from "@/src/lib/retail/reference-currency";

const product = { sku: "sku-new", name: { en: "New", ar: "جديد" }, description: { en: "d", ar: "و" }, image: "/retail.jpg", priceMinor: 100, currency: "USD" as const, available: true, stock: 2 };
const variantProduct = { sku: "bracelet", name: { en: "Bracelet", ar: "سوار", zh: "手链" }, description: { en: "d", ar: "و", zh: "描述" }, image: "/retail.jpg", priceMinor: 100, currency: "USD" as const, available: true, stock: 3, variants: [
  { sku: "bracelet-red", name: { en: "Red", ar: "أحمر", zh: "红色" }, options: { colour: "Red" }, priceMinor: 100, available: true, stock: 3 },
  { sku: "bracelet-blue", name: { en: "Blue", ar: "أزرق", zh: "蓝色" }, options: { colour: "Blue" }, priceMinor: 120, available: false, stock: 0 },
] };
const zones = [{ country: "US", name: { en: "United States", ar: "الولايات المتحدة" }, shippingMinor: 250, freeShippingThresholdMinor: null, taxRateBps: 500 }];
const quote = { currency: "USD" as const, subtotalMinor: 100, shippingMinor: 250, taxMinor: 18, totalMinor: 368, shippingMethod: "standard" as const };
const copy = getRetailCopy("en");
const referenceSnapshot: ReferenceCurrencySnapshot = { base: "USD", asOf: "2026-07-29T16:00:00.000Z", source: "test source", version: "test-v1", rateMicros: { USD: 1_000_000, AED: 3_672_500, SAR: 3_750_000, CNY: 6_766_300, EUR: 878_730, GBP: 752_500 } };
const localizedOptions = {
  en: { Colour: "Red", Size: "Small" },
  ar: { "اللون": "أحمر", "المقاس": "صغير" },
  zh: { "颜色": "红色", "尺寸": "小号" },
};

afterEach(() => { document.body.replaceChildren(); window.localStorage.clear(); delete window.paypal; vi.unstubAllGlobals(); });

function fillCheckout() {
  for (const [label, value] of [["Email", "buyer@example.com"], ["Recipient", "Buyer"], ["Address line 1", "1 Main St"], ["City", "Austin"], ["Postal code", "78701"], ["Phone", "5551112222"]]) fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fireEvent.change(screen.getByLabelText("Country"), { target: { value: "US" } });
  fireEvent.click(screen.getByRole("checkbox"));
}

describe("retail storefront checkout", () => {
  it.each([
    ["en", "Colour", "Red", "Size", "Small"],
    ["ar", "اللون", "أحمر", "المقاس", "صغير"],
    ["zh", "颜色", "红色", "尺寸", "小号"],
  ] as const)("flattens %s option labels and selects the matching variant", (locale, colourKey, colourValue, sizeKey, sizeValue) => {
    const matching = { sku: `localized-${locale}`, name: { en: "Red small", ar: "أحمر صغير", zh: "红色小号" }, options: localizeRetailVariantOptions(localizedOptions, locale), priceMinor: 100, available: true, stock: 3 };
    const other = { sku: `other-${locale}`, name: { en: "Blue small", ar: "أزرق صغير", zh: "蓝色小号" }, options: { [colourKey]: locale === "ar" ? "أزرق" : locale === "zh" ? "蓝色" : "Blue", [sizeKey]: sizeValue }, priceMinor: 120, available: true, stock: 3 };
    const localizedProduct = { ...variantProduct, variants: [matching, other] };
    render(<RetailShop locale={locale} products={[localizedProduct]} zones={zones} enabled paypalClientId={`client-${locale}`} currency="USD" copy={getRetailCopy(locale)} />);
    expect(screen.getByText(colourKey)).toBeInTheDocument();
    expect(screen.getByText(sizeKey)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: colourValue }));
    fireEvent.click(screen.getByRole("button", { name: sizeValue }));
    expect(screen.getByRole("button", { name: new RegExp(getRetailCopy(locale).add) })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: new RegExp(getRetailCopy(locale).add) }));
    expect(window.localStorage.getItem("noor-retail-cart-v1")).toContain(`\"localized-${locale}\":1`);
  });

  it("falls back to English option labels for missing localized entries", () => {
    expect(localizeRetailVariantOptions({ en: { Colour: "Red", Size: "Small" }, zh: {} }, "zh")).toEqual({ Colour: "Red", Size: "Small" });
    expect(localizeRetailVariantOptions({ colour: "Red" }, "ar")).toEqual({ colour: "Red" });
  });

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
    const chineseVariantProduct = { ...variantProduct, variants: [
      { ...variantProduct.variants[0], options: { "颜色": "红色" } },
      { ...variantProduct.variants[1], options: { "颜色": "蓝色" } },
    ] };
    render(<RetailShop locale="zh" products={[chineseVariantProduct]} zones={zones} enabled paypalClientId="client-variant" currency="USD" copy={getRetailCopy("zh")} />);
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

  it("shows a persisted reference currency without changing USD quote or order payloads", async () => {
    let options: Parameters<NonNullable<typeof window.paypal>["Buttons"]>[0] | undefined;
    const requests: Array<{ url: string; body: Record<string, unknown> }> = [];
    window.paypal = { Buttons: vi.fn((value) => { options = value; return { render: vi.fn() }; }) };
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      requests.push({ url: String(input), body });
      if (String(input).includes("/quote")) return new Response(JSON.stringify({ ok: true, quote }), { status: 200 });
      return new Response(JSON.stringify({ ok: true, orderId: "PAYPAL-USD" }), { status: 200 });
    }));
    render(<RetailReferenceCurrencyProvider snapshot={referenceSnapshot}>
      <RetailReferenceCurrencyToolbar locale="zh" />
      <RetailShop locale="zh" products={[product]} zones={zones} enabled paypalClientId="client-reference" currency="USD" copy={getRetailCopy("zh")} />
    </RetailReferenceCurrencyProvider>);
    fireEvent.change(screen.getByLabelText("显示币种（参考价）"), { target: { value: "AED" } });
    expect(await screen.findByText(/≈ AED\s*3\.67/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "加入购物车 New" }));
    fireEvent.change(screen.getByLabelText("电子邮箱"), { target: { value: "buyer@example.com" } });
    fireEvent.change(screen.getByLabelText("收件人"), { target: { value: "Buyer" } });
    fireEvent.change(screen.getByLabelText("地址第一行"), { target: { value: "1 Main St" } });
    fireEvent.change(screen.getByLabelText("城市"), { target: { value: "Austin" } });
    fireEvent.change(screen.getByLabelText("邮政编码"), { target: { value: "78701" } });
    fireEvent.change(screen.getByLabelText("联系电话"), { target: { value: "5551112222" } });
    fireEvent.change(screen.getByLabelText("国家/地区"), { target: { value: "US" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "确认价格" }));
    await vi.waitFor(() => expect(options).toBeDefined());
    await expect(options!.createOrder()).resolves.toBe("PAYPAL-USD");
    expect(requests[0].body).not.toHaveProperty("currency");
    expect(requests[0].body).not.toHaveProperty("rateMicros");
    expect(requests[1].body).toMatchObject({ expectedTotalMinor: 368 });
    expect(requests[1].body).not.toHaveProperty("currency");
    expect(requests[1].body).not.toHaveProperty("rateMicros");
    expect(window.localStorage.getItem("noor-retail-cart-v1")).toBe('{"sku-new":1}');
    expect(window.localStorage.getItem("noor-retail-reference-currency-v1")).toBe("AED");
    expect(screen.getAllByText(/PayPal 将以 USD 结算/)).toHaveLength(2);
  });
});
