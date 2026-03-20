import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import CollectionsPage from "@/app/[locale]/collections/page";
import CollectionDetailPage from "@/app/[locale]/collections/[collectionSlug]/page";
import ProductDetailPage from "@/app/[locale]/collections/[collectionSlug]/[productSlug]/page";
import ContactPage from "@/app/[locale]/contact/page";
import LocaleLayout from "@/app/[locale]/layout";
import HomePage from "@/app/[locale]/page";
import WholesalePage from "@/app/[locale]/wholesale/page";

describe("localized site rendering", () => {
  it("renders the English homepage hero and featured collections", async () => {
    render(await HomePage({ params: Promise.resolve({ locale: "en" }) }));

    expect(screen.getAllByText(/tranquilbeads/i).length).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /tasbih crafted for modern wholesale partners/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/featured collections/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /request catalog/i })).toBeInTheDocument();
  });

  it("renders the Arabic layout in RTL mode", async () => {
    const { container } = render(
      await LocaleLayout({
        children: <div>Arabic layout</div>,
        params: Promise.resolve({ locale: "ar" }),
      }),
    );

    const wrapper = container.querySelector("[data-locale-shell]");
    expect(wrapper).toHaveAttribute("lang", "ar");
    expect(wrapper).toHaveAttribute("dir", "rtl");
  });

  it("renders the collections page with collection highlights", async () => {
    render(await CollectionsPage({ params: Promise.resolve({ locale: "en" }) }));

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /signature tasbih collections/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/signature tasbih/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/gift-ready sets/i).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /explore collection/i }).length).toBeGreaterThan(1);
  });

  it("renders the wholesale page with core cooperation details", async () => {
    render(await WholesalePage({ params: Promise.resolve({ locale: "ar" }) }));

    expect(screen.getByRole("heading", { level: 1, name: /مصمم للتوزيع والجملة/i })).toBeInTheDocument();
    expect(screen.getAllByText(/موك يبدأ من/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/التغليف الخاص/i).length).toBeGreaterThan(0);
  });

  it("renders the contact page with the inquiry form fields", async () => {
    render(await ContactPage({ params: Promise.resolve({ locale: "en" }) }));

    expect(screen.getByRole("heading", { level: 1, name: /start your wholesale inquiry/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/company/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/estimated quantity/i)).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: /chat on whatsapp/i })
        .some((link) => link.getAttribute("href")?.includes("wa.me")),
    ).toBe(true);
  });

  it("renders a collection detail page with products from that series only", async () => {
    render(
      await CollectionDetailPage({
        params: Promise.resolve({
          locale: "en",
          collectionSlug: "signature-tasbih",
        }),
      }),
    );

    expect(
      screen.getByRole("heading", { level: 1, name: /signature tasbih/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/natural kuka wood tasbih/i)).toBeInTheDocument();
    expect(screen.getByText(/golden hematite medallion tasbih/i)).toBeInTheDocument();
    expect(screen.queryByText(/baltic amber gift set/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /view details/i }).length).toBeGreaterThan(1);
  });

  it("renders a nested product detail page with a large hero image and detail gallery", async () => {
    render(
      await ProductDetailPage({
        params: Promise.resolve({
          locale: "en",
          collectionSlug: "signature-tasbih",
          productSlug: "natural-kuka-wood-tasbih",
        }),
      }),
    );

    expect(
      screen.getByRole("heading", { level: 1, name: /natural kuka wood tasbih/i }),
    ).toBeInTheDocument();
    expect(screen.getByAltText(/natural kuka wood tasbih hero/i)).toHaveAttribute(
      "src",
      expect.stringContaining(
        encodeURIComponent("/images/real-products/natural-kuka-wood/hero.jpeg"),
      ),
    );
    expect(screen.getAllByAltText(/natural kuka wood tasbih detail/i).length).toBeGreaterThan(1);
    expect(screen.getAllByText(/natural kuka wood/i).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/built for boutiques, ramadan gifting, and museum-style retail/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /request catalog/i })).toHaveAttribute(
      "href",
      "/en/contact",
    );
  });
});
