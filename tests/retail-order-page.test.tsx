import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { getStorefrontOrderByRequestId } = vi.hoisted(() => ({ getStorefrontOrderByRequestId: vi.fn() }));

vi.mock("@/src/lib/retail/operations", () => ({ getStorefrontOrderByRequestId }));

import StorefrontOrderPage, { generateMetadata } from "@/app/[locale]/shop/order/[requestId]/page";

describe("storefront order confirmation page", () => {
  const requestId = "11111111-1111-4111-8111-111111111111";

  it("does not render a bearer request id or shipping PII", async () => {
    getStorefrontOrderByRequestId.mockResolvedValue({
      status: "captured",
      currency: "USD",
      amount_minor: 1234,
      checkout_shipping: {
        recipient: "Ada Customer",
        line1: "42 Private Lane",
        city: "Example City",
        postalCode: "12345",
        country: "US",
      },
    });

    render(await StorefrontOrderPage({ params: Promise.resolve({ locale: "en", requestId }) }));

    expect(screen.getByText("Paid")).toBeInTheDocument();
    expect(screen.getByText("USD 12.34")).toBeInTheDocument();
    expect(screen.queryByText(requestId)).not.toBeInTheDocument();
    expect(screen.queryByText("Ada Customer")).not.toBeInTheDocument();
    expect(screen.queryByText("42 Private Lane")).not.toBeInTheDocument();
    expect(screen.queryByText("Example City")).not.toBeInTheDocument();
    expect(screen.queryByText("12345")).not.toBeInTheDocument();
  });

  it("marks bearer URL pages as private and suppresses referrers", async () => {
    await expect(generateMetadata({ params: Promise.resolve({ locale: "en", requestId }) })).resolves.toMatchObject({
      robots: { index: false, follow: false, googleBot: { index: false, follow: false, noimageindex: true } },
      referrer: "no-referrer",
    });
  });
});
