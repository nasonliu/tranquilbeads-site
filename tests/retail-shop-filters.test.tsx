import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({ default: () => <span /> }));

import { RetailShop } from "@/src/components/retail-shop";
import { getRetailCopy } from "@/src/data/retail/copy";

afterEach(() => { window.localStorage.clear(); window.history.replaceState({}, "", "/en/shop"); });

const zones = [{ country: "AE", name: { en: "United Arab Emirates", ar: "الإمارات العربية المتحدة" }, shippingMinor: 0, freeShippingThresholdMinor: null, taxRateBps: 0 }];

const products = [
  {
    sku: "kuka", slug: "kuka", name: { en: "Kuka Tasbih", ar: "مسبحة كوكا" }, description: { en: "Kuka wood", ar: "خشب كوكا" }, image: "/kuka.jpg", priceMinor: 2000, currency: "USD" as const, available: true, stock: 4,
    variants: [
      { sku: "kuka-33-8", name: { en: "33 / 8 mm", ar: "٣٣ / ٨ مم" }, options: {}, priceMinor: 2000, available: true, stock: 2 },
      { sku: "kuka-99-6", name: { en: "99 / 6 mm", ar: "٩٩ / ٦ مم" }, options: {}, priceMinor: 2600, available: true, stock: 2 },
    ],
    filterVariants: [
      { material: "Kuka wood", beadCount: "33", diameter: "8 mm" },
      { material: "Kuka wood", beadCount: "99", diameter: "6 mm" },
    ],
  },
  {
    sku: "amber", slug: "amber", name: { en: "Amber Tasbih", ar: "مسبحة كهرمان" }, description: { en: "Amber", ar: "كهرمان" }, image: "/amber.jpg", priceMinor: 4000, currency: "USD" as const, available: true, stock: 1,
    variants: [{ sku: "amber-33-10", name: { en: "33 / 10 mm", ar: "٣٣ / ١٠ مم" }, options: {}, priceMinor: 4000, available: true, stock: 1 }],
    filterVariants: [{ material: "Amber", beadCount: "33", diameter: "10 mm" }],
  },
  {
    sku: "unavailable", slug: "unavailable", name: { en: "Hidden", ar: "مخفي" }, description: { en: "d", ar: "و" }, image: "/hidden.jpg", priceMinor: 1000, currency: "USD" as const, available: false, stock: 0,
    variants: [{ sku: "hidden-33-8", name: { en: "Hidden", ar: "مخفي" }, options: {}, priceMinor: 1000, available: false, stock: 0 }],
    filterVariants: [],
  },
];

function renderShop(initialFilters?: { material?: string[]; beadCount?: string[]; diameter?: string[] }) {
  return render(<RetailShop locale="en" products={products} zones={zones} enabled paypalClientId="test-client" currency="USD" copy={getRetailCopy("en")} initialFilters={initialFilters} />);
}

describe("retail shop category filters", () => {
  it("derives chips from sellable SKU facets, supports same-facet OR and keeps the selection shareable", () => {
    renderShop();
    expect(screen.getByRole("button", { name: "Kuka wood" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Amber" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Hidden" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Kuka wood" }));
    expect(screen.getByRole("heading", { name: "Kuka Tasbih" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Amber Tasbih" })).not.toBeInTheDocument();
    expect(window.location.search).toBe("?material=Kuka+wood");

    fireEvent.click(screen.getByRole("button", { name: "Amber" }));
    expect(screen.getByRole("heading", { name: "Kuka Tasbih" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Amber Tasbih" })).toBeInTheDocument();
    expect(window.location.search).toContain("material=Kuka+wood");
    expect(window.location.search).toContain("material=Amber");
  });

  it("uses AND across facets on a single sellable SKU, clears filters, and does not mutate the cart", () => {
    renderShop({ material: ["Kuka wood"], beadCount: ["33"] });
    expect(screen.getByRole("heading", { name: "Kuka Tasbih" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Amber Tasbih" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "6 mm" }));
    expect(screen.getByText("No available products match these filters.")).toBeInTheDocument();
    expect(window.localStorage.getItem("noor-retail-cart-v1")).toBe("{}");

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByRole("heading", { name: "Kuka Tasbih" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Amber Tasbih" })).toBeInTheDocument();
    expect(window.location.search).toBe("");
  });

  it("renders Arabic facet labels and honors an Arabic URL-derived initial selection", () => {
    const arabicProducts = products.map((product) => ({ ...product, filterVariants: product.filterVariants?.map((variant) => ({
      material: variant.material === "Kuka wood" ? "خشب كوكا" : variant.material === "Amber" ? "كهرمان" : variant.material,
      beadCount: variant.beadCount,
      diameter: variant.diameter,
    })) }));
    render(<RetailShop locale="ar" products={arabicProducts} zones={zones} enabled paypalClientId="test-client-ar" currency="USD" copy={getRetailCopy("ar")} initialFilters={{ material: ["خشب كوكا"] }} />);
    expect(screen.getByRole("heading", { name: "مسبحة كوكا" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "مسبحة كهرمان" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "خشب كوكا" })).toHaveAttribute("aria-pressed", "true");
  });
});
