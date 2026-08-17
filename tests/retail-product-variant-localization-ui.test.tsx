import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProductCatalogAdmin } from "@/app/admin/retail/products/components/catalog-admin";

const productId = "00000000-0000-4000-8000-000000000001";
const styleId = "00000000-0000-4000-8000-000000000002";
const variantId = "00000000-0000-4000-8000-000000000003";

function response(value: unknown) {
  return new Response(JSON.stringify(value), { status: 200 });
}

function fixtureFetch(requests: Array<{ url: string; method: string; body?: Record<string, unknown> }>) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : undefined;
    requests.push({ url, method, body });
    if (url === "/api/admin/retail/products") return response({ ok: true, products: [{ public_id: productId, sku: "KUKA", title_en: "Kuka tasbih", status: "draft" }] });
    if (url.startsWith("/api/admin/retail/catalog/styles")) return response({ ok: true, styles: [{ public_id: styleId, title_en: "Natural Kuka", title_ar: "كوكا طبيعي" }] });
    if (url.startsWith("/api/admin/retail/catalog/variants") && method === "GET") return response({ ok: true, variants: [{ public_id: variantId, style_public_id: styleId, sku: "KUKA-33-8", title_en: "33 / 8 mm", title_ar: "٣٣ / ٨ مم", title_zh: "33 / 8 毫米", status: "active", amount_minor: 2500, available: 4, option_values: { en: { "Bead count": "33", "Bead diameter": "8 mm" }, ar: { "عدد الخرز": "٣٣", "قطر الخرزة": "٨ مم" }, zh: { "珠数": "33", "珠径": "8 毫米" } } }] });
    return response({ ok: true, variant: {} });
  });
}

describe("retail SKU localized option editor", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("submits Arabic option names and values when a SKU is created", async () => {
    const requests: Array<{ url: string; method: string; body?: Record<string, unknown> }> = [];
    vi.stubGlobal("fetch", fixtureFetch(requests));
    render(<ProductCatalogAdmin kind="variants" productId={productId} />);

    await screen.findByText("KUKA-33-8");
    fireEvent.change(screen.getAllByLabelText("SKU")[0], { target: { value: "KUKA-99-6" } });
    fireEvent.change(screen.getAllByLabelText("Product name (English)")[0], { target: { value: "99 / 6 mm" } });
    fireEvent.change(screen.getAllByLabelText("Price (USD cents)")[0], { target: { value: "3200" } });
    fireEvent.change(screen.getAllByLabelText("On-hand")[0], { target: { value: "6" } });
    fireEvent.change(screen.getAllByLabelText("Option name")[0], { target: { value: "Bead count" } });
    fireEvent.change(screen.getAllByLabelText("Option value")[0], { target: { value: "99" } });
    fireEvent.change(screen.getAllByLabelText("Option name (Chinese)")[0], { target: { value: "珠数" } });
    fireEvent.change(screen.getAllByLabelText("Option value (Chinese)")[0], { target: { value: "99" } });
    fireEvent.change(screen.getAllByLabelText("Option name (AR)")[0], { target: { value: "عدد الخرز" } });
    fireEvent.change(screen.getAllByLabelText("Option value (AR)")[0], { target: { value: "٩٩" } });
    fireEvent.click(screen.getByRole("button", { name: "Add SKU" }));

    await vi.waitFor(() => expect(requests.some((request) => request.url === "/api/admin/retail/catalog/variants" && request.method === "POST")).toBe(true));
    const request = requests.find((entry) => entry.url === "/api/admin/retail/catalog/variants" && entry.method === "POST")!;
    expect(request.body?.optionValues).toEqual({ en: { "Bead count": "99" }, ar: { "عدد الخرز": "٩٩" }, zh: { "珠数": "99" } });
  });

  it("preserves and updates Arabic option values when an existing SKU is edited", async () => {
    const requests: Array<{ url: string; method: string; body?: Record<string, unknown> }> = [];
    vi.stubGlobal("fetch", fixtureFetch(requests));
    render(<ProductCatalogAdmin kind="variants" productId={productId} />);

    await screen.findByText("KUKA-33-8");
    fireEvent.click(screen.getAllByText("Save changes")[0]);
    const editor = await screen.findByText("KUKA-33-8");
    const form = editor.closest("tr")?.querySelector<HTMLFormElement>("details form");
    if (!form) throw new Error("variant editor form missing");
    fireEvent.change(within(form).getAllByLabelText("Option value (AR)")[1], { target: { value: "١٠ مم" } });
    fireEvent.click(within(form).getByRole("button", { name: "Save changes" }));

    await vi.waitFor(() => expect(requests.some((request) => request.url.endsWith(`/${variantId}`) && request.method === "PATCH")).toBe(true));
    const request = requests.find((entry) => entry.url.endsWith(`/${variantId}`) && entry.method === "PATCH")!;
    expect(request.body?.optionValues).toEqual({ en: { "Bead count": "33", "Bead diameter": "8 mm" }, ar: { "عدد الخرز": "٣٣", "قطر الخرزة": "١٠ مم" }, zh: { "珠数": "33", "珠径": "8 毫米" } });
  });
});
