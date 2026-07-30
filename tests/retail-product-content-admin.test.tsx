import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));

import { AdminProductContent, AdminProductPreview } from "@/app/admin/retail/products/components/catalog-admin";

const copy = {
  products: "Products", new: "New product", overview: "Product information", content: "Content & A+", styles: "Styles", variants: "Variants", pricing: "Price", media: "Media", preview: "Preview", loadFailed: "Load failed", saved: "Saved.", saveFailed: "Save failed", create: "Create", save: "Save changes", noProducts: "No products", productCode: "Code", slug: "Slug", titleEn: "Name", titleAr: "Arabic", titleZh: "Chinese", descriptionEn: "Description", descriptionAr: "Arabic description", descriptionZh: "Chinese description", status: "Status", draft: "Draft", published: "Published", archived: "Archived", openPreview: "Open", previewDraft: "Draft", sku: "SKU", price: "Price", onHand: "On hand", reserved: "Reserved", available: "Available", addStyle: "Add style", addSku: "Add SKU", styleName: "Style", styleCode: "Code", styleStatus: "Status", optionName: "Option", optionValue: "Value", optionNameZh: "Option Chinese", optionValueZh: "Value Chinese", addOption: "Add option", remove: "Remove", selectStyle: "Style", noStyles: "No styles", noVariants: "No variants", upload: "Upload", imageAlt: "Alt", file: "File", productPage: "Page", gallery: "Gallery", chooseProduct: "Choose", manage: "Manage", productDetails: "Product details", skuHelp: "", styleHelp: "", pricingHelp: "", mediaHelp: "", publicLinkHelp: "", emptyPreview: "", contentHelp: "Localized content", highlights: "Highlights", details: "Specifications", aPlus: "A+ content", addHighlight: "Add highlight", addDetail: "Add specification", addModule: "Add A+ module", label: "Label", value: "Value", eyebrow: "Eyebrow", body: "Body", image: "Existing media image", noContent: "No content yet.", validation: "Complete all languages.", limit: "Limit", previewContent: "Preview product page", mediaReferenced: "Used by A+", unlinkDelete: "Unlink and delete", imageReferencedError: "Unlink before deleting.",
};

function fill(label: string, value: string) { fireEvent.change(screen.getByLabelText(label), { target: { value } }); }

describe("admin product content", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("saves localized highlights, details, and A+ modules with the scoped PDP action", () => {
    const fetcher = vi.fn(async (...args: [RequestInfo | URL, RequestInit?]) => { void args; return new Response(JSON.stringify({ ok: true }), { status: 200 }); });
    vi.stubGlobal("fetch", fetcher);
    render(<AdminProductContent productId="product-1" product={{ images: [{ url: "https://cdn.example/a.jpg", alt_en: "Beads" }] }} t={copy} reload={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Add highlight" }));
    ["en", "ar", "zh"].forEach((locale) => fill(`Highlights 1 ${locale}`, `${locale} highlight`));
    fireEvent.click(screen.getByRole("button", { name: "Add specification" }));
    ["en", "ar", "zh"].forEach((locale) => { fill(`Label 1 ${locale}`, `${locale} label`); fill(`Value 1 ${locale}`, `${locale} value`); });
    fireEvent.click(screen.getByRole("button", { name: "Add A+ module" }));
    ["en", "ar", "zh"].forEach((locale) => { fill(`A+ content title 1 ${locale}`, `${locale} title`); fill(`Body 1 ${locale}`, `${locale} body`); });
    fireEvent.change(screen.getByLabelText("Existing media image 1"), { target: { value: "https://cdn.example/a.jpg" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(fetcher).toHaveBeenCalledWith("/api/admin/retail/products/product-1", expect.objectContaining({ method: "PATCH" }));
    const requestInit = fetcher.mock.calls[0]?.[1];
    expect(requestInit?.body).toBeTruthy();
    const body = JSON.parse(String(requestInit?.body));
    expect(body).toMatchObject({ action: "pdp_content", highlights: [{ en: "en highlight", ar: "ar highlight", zh: "zh highlight" }], details: [{ label: { en: "en label" }, value: { zh: "zh value" } }], aPlus: [{ title: { ar: "ar title" }, body: { en: "en body" }, image: "https://cdn.example/a.jpg" }] });
  });

  it("shows an empty state, enforces the five-highlight cap, and blocks incomplete localized fields", () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    render(<AdminProductContent productId="product-1" product={{}} t={copy} reload={vi.fn()} />);
    expect(screen.getByText("No content yet.")).toBeInTheDocument();
    for (let index = 0; index < 5; index += 1) fireEvent.click(screen.getByRole("button", { name: "Add highlight" }));
    expect(screen.getByRole("button", { name: "Add highlight" })).toBeDisabled();
    fill("Highlights 1 en", "incomplete");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(screen.getByLabelText("Highlights 1 ar")).toBeRequired();
    expect(screen.getByLabelText("Highlights 1 ar")).toBeInvalid();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("passes saved PDP content into the shared draft preview", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => String(input).includes("/variants")
      ? new Response(JSON.stringify({ ok: true, variants: [{ status: "active", style_public_id: "style-1", sku: "sku-1", title_en: "Preview", title_ar: "معاينة", title_zh: "预览", option_values: {}, amount_minor: 1000, available: 2 }] }), { status: 200 })
      : new Response(JSON.stringify({ ok: true, styles: [{ status: "active", public_id: "style-1", code: "SKC-1", title_en: "Style", title_ar: "طراز", title_zh: "款式", option_values: {}, position: 0 }] }), { status: 200 })));
    render(<AdminProductPreview productId="product-1" locale="zh" t={copy} product={{ sku: "P-1", slug: "p-1", status: "draft", title_en: "Preview", title_ar: "معاينة", title_zh: "预览商品", description_en: "Description", description_ar: "وصف", description_zh: "描述", pdp_highlights: [{ en: "English", ar: "العربية", zh: "中文卖点" }], images: [{ url: "/one.jpg" }] }} />);
    await waitFor(() => expect(screen.getByText("中文卖点")).toBeInTheDocument());
  });
});
