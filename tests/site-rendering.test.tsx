import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import CollectionsPage from "@/app/[locale]/collections/page";
import CollectionDetailPage from "@/app/[locale]/collections/[collectionSlug]/page";
import ProductDetailPage from "@/app/[locale]/collections/[collectionSlug]/[productSlug]/page";
import AmazonRetailPage from "@/app/[locale]/amazon/page";
import ContactPage from "@/app/[locale]/contact/page";
import LocaleLayout from "@/app/[locale]/layout";
import NoonRetailPage from "@/app/[locale]/noon/page";
import HomePage from "@/app/[locale]/page";
import WholesalePage from "@/app/[locale]/wholesale/page";
import { getProductBySlug } from "@/src/data/site";

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
    expect(
      screen.getByRole("button", { name: /next showcase item/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByAltText(/natural kuka wood tasbih showcase/i),
    ).toBeInTheDocument();
  });

  it("uses collection-specific and product-specific homepage links", async () => {
    render(await HomePage({ params: Promise.resolve({ locale: "en" }) }));

    const giftSetHeading = screen.getByRole("heading", {
      level: 3,
      name: /gift-ready sets/i,
    });
    const giftSetCard = giftSetHeading.closest("article");
    expect(giftSetCard).not.toBeNull();
    expect(
      within(giftSetCard as HTMLElement).getByRole("link", {
        name: /explore collection/i,
      }),
    ).toHaveAttribute("href", "/en/collections/gift-sets");

    expect(
      screen
        .getAllByRole("link", { name: /baltic amber gift set/i })
        .some((link) => link.getAttribute("href") === "/en/collections/gift-sets/baltic-amber-gift-set"),
    ).toBe(true);
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

  it("exposes both WhatsApp teams from the shared site shell", async () => {
    render(
      await LocaleLayout({
        children: <div>English layout</div>,
        params: Promise.resolve({ locale: "en" }),
      }),
    );

    expect(
      screen
        .getAllByRole("link", { name: /whatsapp \+86 189 2956 4545/i })
        .every((link) => link.getAttribute("href") === "https://wa.me/8618929564545"),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: /whatsapp \+44 7840 89109/i })
        .every((link) => link.getAttribute("href") === "https://wa.me/44784089109"),
    ).toBe(true);
    expect(screen.getByText(/uk team: \+44 7840 89109/i)).toHaveAttribute(
      "href",
      "https://wa.me/44784089109",
    );
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
    expect(
      screen
        .getAllByRole("link", { name: /chat on whatsapp · uk team/i })
        .some((link) => link.getAttribute("href") === "https://wa.me/44784089109"),
    ).toBe(true);
    expect(screen.getByText(/uk team: \+44 7840 89109/i)).toHaveAttribute(
      "href",
      "https://wa.me/44784089109",
    );
  });

  it("renders a Noon retail page with UAE and Saudi buying options", async () => {
    render(await NoonRetailPage({ params: Promise.resolve({ locale: "en" }) }));

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /shop tranquilbeads on noon/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: /buy on noon uae/i })
        .some((link) => link.getAttribute("href")?.includes("noon.com/uae-en")),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: /buy on noon saudi/i })
        .some((link) => link.getAttribute("href")?.includes("noon.com/saudi-en")),
    ).toBe(true);
    expect(screen.getByRole("navigation", { name: /noon catalog sections/i })).toBeInTheDocument();
    expect(
      screen.getAllByRole("heading", { level: 2, name: /browse by material and bead count/i })
        .length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("heading", { level: 3, name: /quick paths by count/i }).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /amber/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /33 beads/i }).length).toBeGreaterThan(0);
  });

  it("renders an Amazon retail page with Gulf and Europe buying options", async () => {
    render(await AmazonRetailPage({ params: Promise.resolve({ locale: "en" }) }));

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /buy tranquilbeads on amazon/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /buy on amazon ae/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /buy on amazon sa/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /buy on amazon de/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /buy on amazon nl/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /buy on amazon pl/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /buy on amazon se/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /buy on amazon be/i }).length).toBeGreaterThan(0);
    expect(
      screen.getByRole("navigation", { name: /amazon catalog sections/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /browse by material and bead count/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: /quick paths by count/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /amber/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /33 beads/i }).length).toBeGreaterThan(0);
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
    const product = getProductBySlug("natural-kuka-wood-tasbih");

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
        encodeURIComponent(product?.image ?? ""),
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
