import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CatalogAdmin } from "@/app/admin/retail/catalog/catalog-admin";
import { PromotionsAdmin } from "@/app/admin/retail/promotions/promotions-admin";

function json(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200 });
}

describe("catalogue and promotion admin localization", () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("uses the shared Chinese setting for the variant screen and translates status values", async () => {
    localStorage.setItem("retail_admin_locale", "zh");
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === "/api/admin/retail/products") return json({ ok: true, products: [{ public_id: "product-1", sku: "TEA-001", title_en: "English tea", title_zh: "中文茶" }] });
      return json({ ok: true, variants: [{ public_id: "variant-1", sku: "TEA-001-A", product_sku: "TEA-001", title_en: "English tea", title_zh: "中文茶", amount_minor: 2500, on_hand: 8, reserved: 1, available: 7, status: "active" }] });
    }));

    render(<CatalogAdmin />);

    expect(await screen.findByRole("heading", { name: "商品变体目录" })).toBeInTheDocument();
    expect(screen.getByText("状态")).toBeInTheDocument();
    expect(screen.getByText("启用")).toBeInTheDocument();
    expect(screen.getByText("中文茶")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "English" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "English" }));
    expect(await screen.findByRole("heading", { name: "Variant catalogue" })).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
    expect(localStorage.getItem("retail_admin_locale")).toBe("en");
  });

  it("translates all promotion values and table headers while retaining English switching", async () => {
    localStorage.setItem("retail_admin_locale", "zh");
    vi.stubGlobal("fetch", vi.fn(async () => json({ ok: true, promotions: [{ id: "promotion-1", code: "SUMMER", kind: "free_shipping", amount: 0, active: false, redemptions: 3 }] })));

    render(<PromotionsAdmin />);

    expect(await screen.findByRole("heading", { name: "促销管理" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "百分比（基点）" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "固定金额" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "免运费" })).toBeInTheDocument();
    expect(screen.getByText("状态")).toBeInTheDocument();
    expect(screen.getByText("已使用")).toBeInTheDocument();
    expect(screen.getByText("已停用")).toBeInTheDocument();
    expect(screen.getAllByText("免运费").length).toBeGreaterThan(1);

    fireEvent.click(screen.getByRole("button", { name: "English" }));
    expect(await screen.findByRole("heading", { name: "Promotions" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Free shipping" })).toBeInTheDocument();
    expect(screen.getByText("Disabled")).toBeInTheDocument();
    expect(screen.getAllByText("Free shipping").length).toBeGreaterThan(1);
  });
});
