import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RetailAdminConsole } from "@/app/admin/retail/ui";

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
  return { form, inputs };
}

describe("retail admin console", () => {
  afterEach(() => vi.unstubAllGlobals());

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

  it("displays the public and ledger identifiers required by follow-up forms", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => new Response(JSON.stringify(responseFor(String(input))), { status: 200 })));
    render(<RetailAdminConsole />);

    await screen.findByText(productId);
    expect(screen.getByRole("heading", { name: "Products" }).parentElement).toHaveTextContent("public_id");
    expect(screen.getByRole("heading", { name: "Customers and address book" }).parentElement).toHaveTextContent("public_id");
    expect(screen.getByRole("heading", { name: "Payment posting ledger" }).parentElement).toHaveTextContent("id");
    expect(screen.getByText(customerId)).toBeInTheDocument();
    expect(screen.getByText(ledgerId)).toBeInTheDocument();
  });
});
