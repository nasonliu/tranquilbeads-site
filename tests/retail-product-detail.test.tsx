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
  it("separates SKC style selection from SKU specification selection and persists only the sellable SKU", () => {
    render(<RetailProductDetail locale="zh" product={product} images={["/one.jpg", "/two.jpg"]} />);
    expect(screen.getByRole("heading", { name: "念珠" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "红色" }));
    expect(screen.getByText("USD 14.00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "请选择完整规格" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "33" }));
    expect(screen.getByText("beads-red-33")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "加入购物车" }));
    expect(window.localStorage.getItem("noor-retail-cart-v1")).toBe('{"beads-red-33":1}');
  });

  it("keeps unavailable SKUs non-purchasable", () => {
    render(<RetailProductDetail locale="en" product={{ ...product, variants: [{ ...product.variants[0], available: false, stock: 0 }] }} images={["/one.jpg"]} />);
    expect(screen.getByRole("button", { name: "Out of stock" })).toBeDisabled();
  });
});
