import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.ComponentProps<"a">) => <a href={href} {...props}>{children}</a>,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: navigation.push }) }));

import { addRetailCart, RetailCartProvider } from "@/src/components/retail-cart";
import { loadRetailPaypalSdk, RetailCheckoutPage } from "@/src/components/retail-checkout";

const zones = [{
  country: "US",
  name: { en: "United States", ar: "الولايات المتحدة" },
  shippingMinor: 250,
  freeShippingThresholdMinor: null,
  taxRateBps: 500,
}];
const quote = {
  currency: "USD" as const,
  subtotalMinor: 100,
  shippingMinor: 250,
  taxMinor: 18,
  discountMinor: 25,
  promotionCode: "SUMMER",
  totalMinor: 343,
  shippingMethod: "standard" as const,
};

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
  window.localStorage.clear();
  delete window.paypal;
  navigation.push.mockReset();
  vi.unstubAllGlobals();
});

function renderCheckout(clientId = "checkout-client", locale: "en" | "ar" = "en") {
  return render(
    <RetailCartProvider>
      <RetailCheckoutPage locale={locale} zones={zones} enabled paypalClientId={clientId} />
    </RetailCartProvider>,
  );
}

async function fillCheckout() {
  await screen.findByRole("button", { name: "Confirm price" });
  for (const [label, value] of [
    ["Email", "buyer@example.com"],
    ["Recipient", "Buyer"],
    ["Address line 1", "1 Main St"],
    ["City", "Austin"],
    ["Postal code", "78701"],
    ["Phone", "5551112222"],
  ]) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
  fireEvent.change(screen.getByLabelText("Country"), { target: { value: "US" } });
  fireEvent.click(screen.getByLabelText("I accept the terms of sale"));
}

function quoteResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("retail checkout", () => {
  it("localizes checkout fields and consent in Arabic", async () => {
    renderCheckout("arabic-client", "ar");
    addRetailCart("sku-1", 1, 2);
    expect(await screen.findByLabelText("البريد الإلكتروني")).toBeTruthy();
    expect(screen.getByLabelText("الدولة")).toBeTruthy();
    expect(screen.getByLabelText("أوافق على شروط البيع")).toBeTruthy();
    expect(screen.getByRole("button", { name: "تأكيد السعر" })).toBeTruthy();
  });

  it("sends promotion, account and marketing choices in quote and order payloads, and shows the discount", async () => {
    let paypal: Parameters<NonNullable<typeof window.paypal>["Buttons"]>[0] | undefined;
    window.paypal = { Buttons: vi.fn((config) => { paypal = config; return { render: vi.fn() }; }) };
    const fetcher = vi.fn(async (url: RequestInfo | URL, _init?: RequestInit) => {
      if (String(url).includes("quote")) return quoteResponse({ ok: true, quote });
      if (String(url).includes("orders")) return quoteResponse({ ok: true, orderId: "PAYPAL-1" });
      return quoteResponse({ ok: true, requestId: "request-1" });
    });
    vi.stubGlobal("fetch", fetcher);

    renderCheckout("payload-checkout-client");
    addRetailCart("sku-1", 1, 2);
    await fillCheckout();
    fireEvent.click(screen.getByLabelText("Create or access an account by email"));
    fireEvent.click(screen.getByLabelText("Email me product news and offers (optional)"));
    fireEvent.change(screen.getByLabelText("Promotion code"), { target: { value: " SUMMER " } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() => expect(paypal).toBeDefined());
    expect(screen.getByText("Discount (SUMMER)")).toBeTruthy();

    const quotePayload = JSON.parse(String(fetcher.mock.calls[0]![1]?.body));
    expect(quotePayload).toMatchObject({
      items: [{ variantSku: "sku-1", quantity: 1 }],
      promotionCode: "SUMMER",
      checkout: {
        email: "buyer@example.com",
        accountIntent: "create_or_access",
        marketingConsent: true,
        termsAccepted: true,
      },
    });

    await expect(paypal!.createOrder()).resolves.toBe("PAYPAL-1");
    const orderPayload = JSON.parse(String(fetcher.mock.calls[1]![1]?.body));
    expect(orderPayload).toMatchObject({
      expectedTotalMinor: 343,
      items: [{ variantSku: "sku-1", quantity: 1 }],
      promotionCode: "SUMMER",
      checkout: { accountIntent: "create_or_access", marketingConsent: true },
    });
    expect(JSON.stringify(window.localStorage)).not.toContain("buyer@example.com");
  });

  it.each([
    ["invalid_promotion", "This promotion code is not available. Check it and try again."],
    ["checkout_expired", "Checkout expired. Please try again."],
  ])("shows a clear error for %s", async (error, copy) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(quoteResponse({ ok: false, error }, 422)));
    renderCheckout(`error-${error}-client`);
    addRetailCart("sku-1", 1, 2);
    await fillCheckout();
    fireEvent.change(screen.getByLabelText("Promotion code"), { target: { value: "CODE" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(await screen.findByRole("status")).toHaveTextContent(copy);
  });

  it("loads one PayPal script per key and removes a failed script so the same key can retry", async () => {
    const clientId = "sdk-retry-client";
    const first = loadRetailPaypalSdk(clientId, "USD");
    const same = loadRetailPaypalSdk(clientId, "USD");
    expect(same).toBe(first);
    const firstScript = document.querySelector("script")!;
    firstScript.dispatchEvent(new Event("error"));
    await expect(first).rejects.toThrow("paypal_sdk_failed");
    expect(document.querySelector("script")).toBeNull();

    const retry = loadRetailPaypalSdk(clientId, "USD");
    expect(retry).not.toBe(first);
    const retryScript = document.querySelector("script")!;
    window.paypal = { Buttons: vi.fn(() => ({ render: vi.fn() })) };
    retryScript.dispatchEvent(new Event("load"));
    await expect(retry).resolves.toBeUndefined();
  });

  it("does not render duplicate PayPal buttons after an unrelated checkout rerender", async () => {
    const renderButton = vi.fn();
    window.paypal = { Buttons: vi.fn(() => ({ render: renderButton })) };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(quoteResponse({ ok: true, quote })));
    const view = renderCheckout("rerender-client");
    addRetailCart("sku-1", 1, 2);
    await fillCheckout();
    fireEvent.click(screen.getByRole("button", { name: "Confirm price" }));
    await waitFor(() => expect(renderButton).toHaveBeenCalledTimes(1));

    view.rerender(
      <RetailCartProvider>
        <RetailCheckoutPage locale="en" zones={zones} enabled paypalClientId="rerender-client" />
      </RetailCartProvider>,
    );
    await waitFor(() => expect(renderButton).toHaveBeenCalledTimes(1));
  });

  it("drops an expired request id and can create a new order after a fresh quote", async () => {
    let paypal: Parameters<NonNullable<typeof window.paypal>["Buttons"]>[0] | undefined;
    window.paypal = { Buttons: vi.fn((config) => { paypal = config; return { render: vi.fn() }; }) };
    let orderCalls = 0;
    const fetcher = vi.fn(async (url: RequestInfo | URL, _init?: RequestInit) => {
      if (String(url).includes("quote")) return quoteResponse({ ok: true, quote });
      if (String(url).includes("orders")) {
        orderCalls += 1;
        return orderCalls === 1
          ? quoteResponse({ ok: false, error: "checkout_expired" }, 410)
          : quoteResponse({ ok: true, orderId: "PAYPAL-NEW" });
      }
      return quoteResponse({ ok: true });
    });
    vi.stubGlobal("fetch", fetcher);
    renderCheckout("expired-checkout-client");
    addRetailCart("sku-1", 1, 2);
    await fillCheckout();
    fireEvent.click(screen.getByRole("button", { name: "Confirm price" }));
    await waitFor(() => expect(paypal).toBeDefined());

    await act(async () => {
      await expect(paypal!.createOrder()).rejects.toThrow("order_failed");
      paypal!.onError();
    });
    expect(await screen.findByRole("status")).toHaveTextContent("Checkout expired. Please confirm the price and try again.");
    const firstRequest = JSON.parse(String(fetcher.mock.calls.find(([url]) => String(url).includes("orders"))?.[1]?.body)).requestId;

    fireEvent.click(screen.getByRole("button", { name: "Confirm price" }));
    await waitFor(() => expect(window.paypal!.Buttons).toHaveBeenCalledTimes(2));
    await expect(paypal!.createOrder()).resolves.toBe("PAYPAL-NEW");
    const orderRequests = fetcher.mock.calls
      .filter(([url]) => String(url).includes("orders"))
      .map(([, init]) => JSON.parse(String(init?.body)).requestId);
    expect(orderRequests[1]).not.toBe(firstRequest);
  });

  it("clears the cart and navigates to confirmation after capture", async () => {
    let paypal: Parameters<NonNullable<typeof window.paypal>["Buttons"]>[0] | undefined;
    window.paypal = { Buttons: vi.fn((config) => { paypal = config; return { render: vi.fn() }; }) };
    const fetcher = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      if (String(url).includes("quote")) return quoteResponse({ ok: true, quote });
      if (String(url).includes("orders")) return quoteResponse({ ok: true, orderId: "PAYPAL-1" });
      const requestId = JSON.parse(String(init?.body)).requestId;
      return quoteResponse({ ok: true, orderId: "PAYPAL-1", requestId });
    });
    vi.stubGlobal("fetch", fetcher);
    renderCheckout("capture-checkout-client");
    addRetailCart("sku-1", 1, 2);
    await fillCheckout();
    fireEvent.click(screen.getByRole("button", { name: "Confirm price" }));
    await waitFor(() => expect(paypal).toBeDefined());
    await paypal!.createOrder();
    await act(async () => { await paypal!.onApprove({ orderID: "PAYPAL-1" }); });
    expect(navigation.push).toHaveBeenCalledWith(expect.stringMatching(/^\/en\/shop\/order\/[0-9a-f-]{36}$/));
    expect(await screen.findByText("Your bag is empty.")).toBeTruthy();
  });

  it("clears customer details when PayPal is cancelled", async () => {
    let paypal: Parameters<NonNullable<typeof window.paypal>["Buttons"]>[0] | undefined;
    window.paypal = { Buttons: vi.fn((config) => { paypal = config; return { render: vi.fn() }; }) };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(quoteResponse({ ok: true, quote })));
    renderCheckout("cancel-checkout-client");
    addRetailCart("sku-1", 1, 2);
    await fillCheckout();
    fireEvent.click(screen.getByRole("button", { name: "Confirm price" }));
    await waitFor(() => expect(paypal).toBeDefined());
    await act(async () => { paypal!.onCancel(); });
    expect(screen.getByLabelText("Email")).toHaveValue("");
    expect(await screen.findByRole("status")).toHaveTextContent("Payment was cancelled");
  });
});
