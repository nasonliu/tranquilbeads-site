import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({ default: (props: { alt: string }) => <span aria-label={props.alt} /> }));
vi.mock("next/link", () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));

import { RetailProductDetail } from "@/src/components/retail-product-detail";

afterEach(() => { document.body.replaceChildren(); window.localStorage.clear(); });

const product = {
  sku: "beads", slug: "beads", image: "/one.jpg", priceMinor: 1200, currency: "USD" as const, available: true, stock: 5,
  name: { en: "Prayer beads", ar: "مسبحة", zh: "念珠" }, description: { en: "A retail product", ar: "منتج تجزئة", zh: "零售商品" },
  variants: [
    { sku: "beads-black-33", name: { en: "Black 33", ar: "أسود 33", zh: "黑色 33" }, options: { Size: "33" }, priceMinor: 1200, available: true, stock: 5, style: { publicId: "style-black", code: "SKC-BLK", name: { en: "Black", ar: "أسود", zh: "黑色" }, options: {}, position: 1, image: "/one.jpg" } },
    { sku: "beads-red-33", name: { en: "Red 33", ar: "أحمر 33", zh: "红色 33" }, options: { Size: "33" }, priceMinor: 1400, available: true, stock: 2, style: { publicId: "style-red", code: "SKC-RED", name: { en: "Red", ar: "أحمر", zh: "红色" }, options: {}, position: 2, image: "/two.jpg" } },
    { sku: "beads-red-99", name: { en: "Red 99", ar: "أحمر 99", zh: "红色 99" }, options: { Size: "99" }, priceMinor: 1600, available: true, stock: 1, style: { publicId: "style-red", code: "SKC-RED", name: { en: "Red", ar: "أحمر", zh: "红色" }, options: {}, position: 2, image: "/two.jpg" } },
  ],
};

describe("retail product detail", () => {
  it("separates style selection from product options without exposing internal commerce codes", () => {
    render(<RetailProductDetail locale="zh" product={product} images={["/one.jpg", "/two.jpg"]} />);
    expect(screen.getByRole("heading", { name: "念珠" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "红色" }));
    expect(screen.getByText("USD 14.00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "请选择完整规格" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "33" }));
    expect(screen.queryByText("beads-red-33")).not.toBeInTheDocument();
    expect(screen.queryByText(/SKC|SKU/)).not.toBeInTheDocument();
    expect(screen.getByText("有货，可下单")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "加入购物车" }));
    expect(window.localStorage.getItem("noor-retail-cart-v1")).toBe('{"beads-red-33":1}');
  });

  it("keeps unavailable SKUs non-purchasable", () => {
    render(<RetailProductDetail locale="en" product={{ ...product, variants: [{ ...product.variants[0], available: false, stock: 0 }] }} images={["/one.jpg"]} />);
    expect(screen.getByRole("button", { name: "Out of stock" })).toBeDisabled();
  });

  it("uses the selected SKU for quantity while progressively rendering supplied merchandising content", () => {
    render(<RetailProductDetail locale="en" product={{ ...product, highlights: [{ en: "Natural stone beads", ar: "خرز حجري طبيعي" }], details: [{ label: { en: "Material", ar: "المادة" }, value: { en: "Obsidian", ar: "سبج" } }], aPlus: [{ eyebrow: { en: "Craft", ar: "الحرفية" }, title: { en: "Made to keep", ar: "صنع ليدوم" }, body: { en: "Selected for daily use.", ar: "مختار للاستخدام اليومي." }, image: "/two.jpg" }] }} images={["/one.jpg", "/two.jpg"]} />);
    expect(screen.getByRole("heading", { name: "Product highlights" })).toBeInTheDocument();
    expect(screen.getByText("Natural stone beads")).toBeInTheDocument();
    expect(screen.getByText("Material")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Made to keep" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Increase quantity" }));
    fireEvent.click(screen.getByRole("button", { name: "Add to cart" }));
    expect(window.localStorage.getItem("noor-retail-cart-v1")).toBe('{"beads-black-33":2}');
  });
});
