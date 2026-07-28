import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { paymentKindText, shippingMethodText } from "@/app/admin/retail/admin-locale";
import { RetailAdminConsole, RetailAdminLogin, RetailAuditLog, RetailOrderDetail } from "@/app/admin/retail/ui";

const productId = "d7a4c3e5-5e57-4a1f-ae7d-0f024d3ac111";
const customerId = "ce3ca86d-c511-4899-86e4-67df350b9f39";
const ledgerId = "ebf15f42-7a50-46b7-b34b-6c81bd8e03cc";

function responseFor(path: string) {
  if (path === "/api/admin/retail/products") return { ok: true, products: [{ public_id: productId, sku: "MVP-RETAIL", slug: "mvp-retail", title_en: "MVP retail", status: "draft", amount_minor: 100, image_count: 0 }] };
  if (path === "/api/admin/retail/inventory") return { ok: true, balances: [], ledger: [] };
  if (path === "/api/admin/retail/orders") return { ok: true, orders: [] };
  if (path === "/api/admin/retail/customers") return { ok: true, customers: [{ public_id: customerId, email: "buyer@example.test", name: "Buyer", addresses: [] }] };
  if (path === "/api/admin/retail/ledger") return { ok: true, entries: [{ id: ledgerId, paypal_order_id: "ORDER-1", kind: "payment", amount_minor: 100, currency: "USD", reconciliation_status: "pending", paypal_reference: "CAPTURE-1" }], summary: {} };
  if (path === "/api/admin/retail/shipping") return { ok: true, zones: [] };
  return { ok: true, product: { public_id: productId } };
}

function fillProductDraft() {
  const form = screen.getByRole("heading", { name: "Create product draft" }).closest("form")!;
  const inputs = within(form);
  fireEvent.change(inputs.getByLabelText("sku"), { target: { value: "MVP-NEW" } });
  fireEvent.change(inputs.getByLabelText("slug"), { target: { value: "mvp-new" } });
  fireEvent.change(inputs.getByLabelText("titleEn"), { target: { value: "MVP new" } });
  fireEvent.change(inputs.getByLabelText("titleAr"), { target: { value: "اختبار" } });
  fireEvent.change(inputs.getByLabelText("descriptionEn"), { target: { value: "Test product" } });
  fireEvent.change(inputs.getByLabelText("descriptionAr"), { target: { value: "منتج اختبار" } });
  fireEvent.change(inputs.getByLabelText("amountMinor"), { target: { value: "100" } });
  fireEvent.change(inputs.getByLabelText("onHand"), { target: { value: "5" } });
  return { form, inputs };
}

function requestBody(call: [RequestInfo | URL, RequestInit?]) {
  return JSON.parse(String(call[1]?.body));
}

describe("retail admin console", () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("keeps delivery redacted until a permitted full-address request succeeds", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input);
      if (path === "/api/admin/retail/orders/77") return new Response(JSON.stringify({ ok: true, order: { id: 77, paypal_order_id: "ORDER-77", currency: "USD", amount_minor: 100, items_snapshot: [], shipping_snapshot: { city: "Dubai", country: "AE", postal_code: "12345" } } }), { status: 200 });
      if (path === "/api/admin/retail/orders/77?include=pii") return new Response(JSON.stringify({ ok: true, order: { id: 77, paypal_order_id: "ORDER-77", pii: { shipping: { recipient: "Buyer", line1: "1 Test Road", city: "Dubai", country: "AE", postal_code: "12345" } } } }), { status: 200 });
      if (path === "/api/admin/retail/ledger") return new Response(JSON.stringify({ ok: true, entries: [], summary: {} }), { status: 200 });
      if (path === "/api/admin/retail/products") return new Response(JSON.stringify({ ok: true, products: [] }), { status: 200 });
      return new Response(JSON.stringify(responseFor(path)), { status: 200 });
    });
    vi.stubGlobal("fetch", fetcher);
    render(<RetailOrderDetail orderId="77" />);
    await screen.findByRole("button", { name: "Show full delivery address" });
    expect(screen.queryByText("1 Test Road")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show full delivery address" }));
    expect(await screen.findByText("1 Test Road")).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledWith("/api/admin/retail/orders/77?include=pii", expect.objectContaining({ method: "GET", cache: "no-store" }));
    expect(screen.getByRole("button", { name: "Hide full delivery address" })).toBeInTheDocument();
  });

  it("uses customer and address selectors instead of hand-entered UUIDs, with an explicit audited PII read", async () => {
    const addressId = "ce3ca86d-c511-4899-86e4-67df350b9f40";
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input);
      if (path === `/api/admin/retail/customers/${customerId}`) return new Response(JSON.stringify({ ok: true, customer: { public_id: customerId, name: "Buyer", email: "buyer@example.test", addresses: [{ id: addressId, recipient: "Buyer", line1: "1 Test Road", line2: null, city: "Dubai", region: null, postal_code: "12345", country: "AE", phone: null, is_default: true, archived_at: null }] } }), { status: 200 });
      if (path === "/api/admin/retail/customers") return new Response(JSON.stringify({ ok: true, customers: [{ public_id: customerId, email: "b***@example.test", name: "B***", addresses: [{ id: addressId, city: "Dubai", country: "AE", is_default: true, archived_at: null }] }] }), { status: 200 });
      return new Response(JSON.stringify(responseFor(path)), { status: 200 });
    });
    vi.stubGlobal("fetch", fetcher);
    render(<RetailAdminConsole section="customers" />);

    const customerSelect = await screen.findByLabelText("Select customer");
    expect(screen.queryByLabelText("Customer UUID")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Address UUID")).not.toBeInTheDocument();
    fireEvent.change(customerSelect, { target: { value: customerId } });
    expect(screen.queryByDisplayValue("1 Test Road")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "View address book to edit" }));
    expect(await screen.findByDisplayValue("1 Test Road")).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledWith(`/api/admin/retail/customers/${customerId}`, expect.objectContaining({ method: "GET", cache: "no-store" }));
    expect(screen.getByLabelText("Select address")).toHaveValue(addressId);
  });

  it("submits an optional operator ID for named-admin login while preserving legacy login", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ ok: false }), { status: 401 }));
    vi.stubGlobal("fetch", fetcher);
    render(<RetailAdminLogin />);

    fireEvent.change(screen.getByLabelText("Operator ID (optional)"), { target: { value: " inventory-manager " } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "a-valid-admin-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    expect(requestBody(fetcher.mock.calls[0])).toEqual({ actorId: "inventory-manager", password: "a-valid-admin-password" });
    expect(screen.getByText("Login unavailable.")).toBeInTheDocument();
  });

  it("sends audit filters and renders a paginated audit record", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => new Response(JSON.stringify({ ok: true, entries: [{ id: "audit-1", action: "product.updated", actor: "admin", detail: "price", created_at: "2026-07-28T00:00:00.000Z" }], page: 1, hasNext: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetcher);
    render(<RetailAuditLog />);
    await screen.findByText("product.updated");
    fireEvent.change(screen.getByLabelText("Filter by action"), { target: { value: "product.updated" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    await waitFor(() => expect(fetcher.mock.calls.some(([path]) => String(path).includes("action=product.updated"))).toBe(true));
    expect(screen.getByRole("button", { name: "Next page" })).not.toBeDisabled();
  });

  it("switches the complete admin shell and form labels to Chinese and persists the choice", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => new Response(JSON.stringify(responseFor(String(input))), { status: 200 })));
    render(<RetailAdminConsole section="products" />);

    await screen.findByText(productId);
    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "zh" } });

    expect(screen.getAllByRole("heading", { name: "商品" }).length).toBeGreaterThan(0);
    expect(screen.getAllByText("英文名称").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "保存" }).length).toBeGreaterThan(0);
    expect(localStorage.getItem("retail_admin_locale")).toBe("zh");
  });

  it("exposes optional Chinese catalog and shipping fields in the admin console", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => new Response(JSON.stringify(responseFor(String(input))), { status: 200 })));
    render(<RetailAdminConsole section="products" />);
    await screen.findByText(productId);
    const draftForm = screen.getByRole("heading", { name: "Create product draft" }).closest("form")!;
    expect(within(draftForm).getByLabelText("Title (Chinese, optional)")).toBeInTheDocument();
    expect(within(draftForm).getByLabelText("Description (Chinese, optional)")).toBeInTheDocument();
    expect(within(draftForm).getByText("Title (Chinese, optional)")).toBeInTheDocument();
  });

  it("localizes payment kinds and delivery methods in Chinese without changing English values", async () => {
    expect(paymentKindText("en", "payment")).toBe("payment");
    expect(paymentKindText("en", "reversal")).toBe("reversal");
    expect(shippingMethodText("en", "standard")).toBe("standard");
    expect(paymentKindText("zh", "net")).toBe("净额");
    const entries = ["payment", "fee", "refund", "reversal"].map((kind, index) => ({
      id: `${ledgerId}-${kind}`,
      paypal_order_id: "ORDER-DETAIL",
      kind,
      amount_minor: 100,
      currency: "USD",
      reconciliation_status: "pending",
      paypal_reference: `REF-${index}`,
      created_at: "2026-07-27T00:00:00.000Z",
    }));
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input);
      if (path === "/api/admin/retail/ledger") return new Response(JSON.stringify({ ok: true, entries, summary: {} }), { status: 200 });
      if (path === "/api/admin/retail/orders/42") return new Response(JSON.stringify({ ok: true, order: {
        id: 42,
        paypal_order_id: "ORDER-DETAIL",
        currency: "USD",
        amount_minor: 100,
        shipping_method: "standard",
        items_snapshot: [],
      } }), { status: 200 });
      return new Response(JSON.stringify(responseFor(path)), { status: 200 });
    }));
    render(<RetailAdminConsole section="finance" />);

    await screen.findByText("payment");
    expect(screen.getByText("fee")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "zh" } });
    expect(await screen.findByText("收款")).toBeInTheDocument();
    expect(screen.getAllByText("手续费").length).toBeGreaterThan(0);
    expect(screen.getAllByText("退款").length).toBeGreaterThan(0);
    expect(screen.getAllByText("冲正").length).toBeGreaterThan(0);

    render(<RetailOrderDetail orderId="42" />);
    await screen.findByText("标准配送");
  });

  it("resets a successful asynchronous form and refreshes the displayed operational readback", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => new Response(JSON.stringify(responseFor(String(input))), { status: 200 }));
    vi.stubGlobal("fetch", fetcher);
    render(<RetailAdminConsole />);

    await screen.findByText(productId);
    const { inputs } = fillProductDraft();
    fireEvent.click(inputs.getByRole("button", { name: "Save" }));

    await screen.findByText("Saved.");
    expect(inputs.getByLabelText("sku")).toHaveValue("");
    expect(fetcher).toHaveBeenCalledWith("/api/admin/retail/products", expect.objectContaining({ method: "POST" }));
    await waitFor(() => expect(fetcher.mock.calls.filter(([path]) => path === "/api/admin/retail/products")).toHaveLength(3));
  });

  it("does not report a write as saved when its required readback fails", async () => {
    let wrote = false;
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);
      if (init?.method === "POST") { wrote = true; return new Response(JSON.stringify(responseFor(path)), { status: 200 }); }
      if (wrote && path === "/api/admin/retail/inventory") return new Response(JSON.stringify({ ok: false, error: "readback_unavailable" }), { status: 503 });
      return new Response(JSON.stringify(responseFor(path)), { status: 200 });
    });
    vi.stubGlobal("fetch", fetcher);
    render(<RetailAdminConsole />);

    await screen.findByText(productId);
    const { inputs } = fillProductDraft();
    fireEvent.click(inputs.getByRole("button", { name: "Save" }));

    await screen.findByText("Write may have succeeded, but refresh failed. Refresh to confirm.");
    expect(screen.queryByText("Saved.")).not.toBeInTheDocument();
  });

  it("uses a synchronous submission lock so a double click sends only one write", async () => {
    let releaseWrite: ((response: Response) => void) | undefined;
    const fetcher = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") return new Promise<Response>(resolve => { releaseWrite = resolve; });
      return Promise.resolve(new Response(JSON.stringify(responseFor(String(input))), { status: 200 }));
    });
    vi.stubGlobal("fetch", fetcher);
    render(<RetailAdminConsole />);

    await screen.findByText(productId);
    const { inputs } = fillProductDraft();
    const save = inputs.getByRole("button", { name: "Save" });
    fireEvent.click(save);
    fireEvent.click(save);
    expect(fetcher.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
    expect(save).toBeDisabled();
    releaseWrite!(new Response(JSON.stringify(responseFor("/api/admin/retail/products")), { status: 200 }));
    await screen.findByText("Saved.");
  });

  it("reuses an inventory key after a failed request and rotates it after a confirmed write", async () => {
    let inventoryWrites = 0;
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);
      if (path === "/api/admin/retail/inventory" && init?.method === "POST") {
        inventoryWrites += 1;
        return new Response(JSON.stringify(inventoryWrites === 1 ? { ok: false, error: "temporary_failure" } : responseFor(path)), { status: inventoryWrites === 1 ? 503 : 200 });
      }
      return new Response(JSON.stringify(responseFor(path)), { status: 200 });
    });
    vi.stubGlobal("fetch", fetcher);
    render(<RetailAdminConsole />);

    await screen.findByText(productId);
    const form = screen.getByRole("heading", { name: "Adjust default-variant inventory" }).closest("form")!;
    const inputs = within(form);
    fireEvent.change(inputs.getByLabelText("productId"), { target: { value: productId } });
    fireEvent.change(inputs.getByLabelText("delta"), { target: { value: "2" } });
    fireEvent.change(inputs.getByLabelText("reason"), { target: { value: "restock" } });

    fireEvent.click(inputs.getByRole("button", { name: "Save" }));
    await screen.findByText("Save failed.");
    fireEvent.click(inputs.getByRole("button", { name: "Save" }));
    await screen.findByText("Saved.");
    fireEvent.change(inputs.getByLabelText("productId"), { target: { value: productId } });
    fireEvent.change(inputs.getByLabelText("delta"), { target: { value: "3" } });
    fireEvent.change(inputs.getByLabelText("reason"), { target: { value: "restock again" } });
    fireEvent.click(inputs.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(inventoryWrites).toBe(3));

    const writes = fetcher.mock.calls.filter(([path, init]) => path === "/api/admin/retail/inventory" && init?.method === "POST");
    expect(requestBody(writes[0]).idempotencyKey).toBe(requestBody(writes[1]).idempotencyKey);
    expect(requestBody(writes[2]).idempotencyKey).not.toBe(requestBody(writes[1]).idempotencyKey);
  });

  it("keeps a refund key for retries and rotates it only after successful readback", async () => {
    let refundWrites = 0;
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);
      if (path === "/api/admin/retail/orders/9/refund" && init?.method === "POST") {
        refundWrites += 1;
        return new Response(JSON.stringify(refundWrites === 1 ? { ok: false, error: "refund_result_unknown" } : { ok: true }), { status: refundWrites === 1 ? 503 : 200 });
      }
      return new Response(JSON.stringify(responseFor(path)), { status: 200 });
    });
    vi.stubGlobal("fetch", fetcher);
    vi.stubGlobal("confirm", vi.fn(() => true));
    render(<RetailAdminConsole />);

    await screen.findByText(productId);
    const form = screen.getByRole("heading", { name: "Refund captured order" }).closest("form")!;
    const inputs = within(form);
    fireEvent.change(inputs.getByLabelText("Order ID"), { target: { value: "9" } });
    fireEvent.change(inputs.getByLabelText("Refund amount (minor units)"), { target: { value: "100" } });
    fireEvent.change(inputs.getByLabelText("Refund reason"), { target: { value: "customer request" } });

    fireEvent.click(inputs.getByRole("button", { name: "Confirm refund" }));
    await screen.findByText("Write may have succeeded, but refresh failed. Refresh to confirm.");
    fireEvent.click(inputs.getByRole("button", { name: "Confirm refund" }));
    await screen.findByText("Refund completed.");
    fireEvent.change(inputs.getByLabelText("Order ID"), { target: { value: "9" } });
    fireEvent.change(inputs.getByLabelText("Refund amount (minor units)"), { target: { value: "100" } });
    fireEvent.change(inputs.getByLabelText("Refund reason"), { target: { value: "second refund" } });
    fireEvent.click(inputs.getByRole("button", { name: "Confirm refund" }));
    await waitFor(() => expect(refundWrites).toBe(3));

    const writes = fetcher.mock.calls.filter(([path, init]) => path === "/api/admin/retail/orders/9/refund" && init?.method === "POST");
    expect(requestBody(writes[0]).idempotencyKey).toBe(requestBody(writes[1]).idempotencyKey);
    expect(requestBody(writes[2]).idempotencyKey).not.toBe(requestBody(writes[1]).idempotencyKey);
  });

  it("displays the public and ledger identifiers required by follow-up forms", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => new Response(JSON.stringify(responseFor(String(input))), { status: 200 })));
    render(<RetailAdminConsole />);

    await screen.findByText(productId);
    expect(screen.getAllByRole("columnheader", { name: "Public ID" }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("columnheader", { name: "ID" })).toBeInTheDocument();
    expect(screen.getByText(customerId)).toBeInTheDocument();
    expect(screen.getByText(ledgerId)).toBeInTheDocument();
  });
});
