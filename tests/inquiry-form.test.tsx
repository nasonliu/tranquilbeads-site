"use client";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { InquiryForm } from "@/src/components/inquiry-form";

const baseProps = {
  locale: "en" as const,
  interestOptions: ["Tasbih", "Gift Sets", "Custom Packaging"],
  whatsappHref: "https://wa.me/971500000000",
};

describe("InquiryForm", () => {
  it("shows validation feedback when submitted empty", async () => {
    render(<InquiryForm {...baseProps} />);

    fireEvent.click(screen.getByRole("button", { name: /send inquiry/i }));

    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/company is required/i)).toBeInTheDocument();
    expect(screen.getByText(/choose an interest category/i)).toBeInTheDocument();
  });

  it("submits successfully without a backend endpoint by using the fallback workflow", async () => {
    render(<InquiryForm {...baseProps} />);

    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: "Amina Noor" },
    });
    fireEvent.change(screen.getByLabelText(/company/i), {
      target: { value: "Noor Retail Group" },
    });
    fireEvent.change(screen.getByLabelText(/country/i), {
      target: { value: "UAE" },
    });
    fireEvent.change(screen.getByLabelText(/email or whatsapp/i), {
      target: { value: "amina@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/interest category/i), {
      target: { value: "Tasbih" },
    });
    fireEvent.change(screen.getByLabelText(/estimated quantity/i), {
      target: { value: "500 pieces" },
    });
    fireEvent.change(screen.getByLabelText(/message/i), {
      target: { value: "We want a premium sandalwood tasbih assortment." },
    });

    fireEvent.click(screen.getByRole("button", { name: /send inquiry/i }));

    await waitFor(() => {
      expect(screen.getByText(/thank you — we will review your inquiry/i)).toBeInTheDocument();
    });
  });

  it("keeps the WhatsApp shortcut visible", () => {
    render(<InquiryForm {...baseProps} />);

    expect(screen.getByRole("link", { name: /chat on whatsapp/i })).toHaveAttribute(
      "href",
      "https://wa.me/971500000000",
    );
  });
});
