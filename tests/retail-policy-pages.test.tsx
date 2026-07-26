import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PrivacyPage, { generateMetadata as privacyMetadata } from "@/app/[locale]/privacy/page";
import ShippingReturnsPage, { generateMetadata as shippingMetadata } from "@/app/[locale]/shipping-returns/page";
import TermsPage, { generateMetadata as termsMetadata } from "@/app/[locale]/terms/page";
import LocaleLayout from "@/app/[locale]/layout";

describe("retail policy pages", () => {
  it("renders the English privacy notice with PayPal and order-data handling", async () => {
    render(await PrivacyPage({ params: Promise.resolve({ locale: "en" }) }));

    expect(screen.getByRole("heading", { level: 1, name: /privacy policy/i })).toBeInTheDocument();
    expect(screen.getByText(/PayPal as a third-party payment service/i)).toBeInTheDocument();
    expect(screen.getByText(/contact, order and delivery-address information/i)).toBeInTheDocument();
    expect(screen.getByText(/sales@tranquilbeads\.com/i)).toBeInTheDocument();
  });

  it("renders Arabic terms with the checkout terms version, delivery scope and tracking", async () => {
    render(await TermsPage({ params: Promise.resolve({ locale: "ar" }) }));

    expect(screen.getByRole("heading", { level: 1, name: /شروط البيع/i })).toBeInTheDocument();
    expect(screen.getByText(/2026-07-28/)).toBeInTheDocument();
    expect(screen.getByText(/البلدان المهيأة حالياً في صفحة الدفع/i)).toBeInTheDocument();
    expect(screen.getByText(/معلومات التتبع/i)).toBeInTheDocument();
  });

  it("keeps return and refund requests subject to review without invented guarantees", async () => {
    render(await ShippingReturnsPage({ params: Promise.resolve({ locale: "en" }) }));

    expect(screen.getByText(/contact sales@tranquilbeads\.com/i)).toBeInTheDocument();
    expect(screen.getByText(/Requests are reviewed before any return or refund is approved/i)).toBeInTheDocument();
    expect(screen.getByText(/does not promise a fixed return window/i)).toBeInTheDocument();
  });

  it("uses locale-specific canonical metadata for all retail policy routes", async () => {
    const params = { params: Promise.resolve({ locale: "en" }) };
    await expect(privacyMetadata(params)).resolves.toMatchObject({
      alternates: { canonical: "https://www.tranquilbeads.com/en/privacy" },
    });
    await expect(termsMetadata(params)).resolves.toMatchObject({
      alternates: { canonical: "https://www.tranquilbeads.com/en/terms" },
    });
    await expect(shippingMetadata(params)).resolves.toMatchObject({
      alternates: { canonical: "https://www.tranquilbeads.com/en/shipping-returns" },
    });
  });

  it("keeps the three retail policy links in the localized footer", async () => {
    render(await LocaleLayout({ children: <div>Content</div>, params: Promise.resolve({ locale: "en" }) }));

    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/en/privacy");
    expect(screen.getByRole("link", { name: "Terms of sale" })).toHaveAttribute("href", "/en/terms");
    expect(screen.getByRole("link", { name: "Shipping & returns" })).toHaveAttribute("href", "/en/shipping-returns");
  });
});
