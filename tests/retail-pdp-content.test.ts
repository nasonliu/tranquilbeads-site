import { describe, expect, it } from "vitest";

import { toRetailProduct } from "@/src/data/retail/product-view-model";
import { productPdpContentDto } from "@/src/lib/retail/operations";

const text = { en: "English", ar: "العربية", zh: "中文" };
const record = {
  sku: "PDP-1", slug: "pdp-1", title_en: "Product", title_ar: "منتج", title_zh: "产品",
  description_en: "Description", description_ar: "وصف", description_zh: "说明", images: [{ url: "https://example.test/image.jpg" }],
  variants: [{ sku: "PDP-1", title_en: "Product", title_ar: "منتج", title_zh: "产品", option_values: {}, amount_minor: 1000, available: 1 }],
};

describe("product PDP content", () => {
  it("validates bounded localized admin content without accepting arbitrary JSON", () => {
    expect(productPdpContentDto.parse({ idempotencyKey: "40000000-0000-4000-8000-000000000001", highlights: [text], details: [{ label: text, value: text }], aPlus: [{ title: text, body: text, image: "https://example.test/a-plus.jpg" }] }).highlights).toHaveLength(1);
    expect(() => productPdpContentDto.parse({ idempotencyKey: "40000000-0000-4000-8000-000000000001", highlights: Array.from({ length: 6 }, () => text) })).toThrow();
    expect(() => productPdpContentDto.parse({ idempotencyKey: "40000000-0000-4000-8000-000000000001", aPlus: [{ title: text, body: text, image: "http://example.test/a-plus.jpg" }] })).toThrow();
    expect(() => productPdpContentDto.parse({ idempotencyKey: "40000000-0000-4000-8000-000000000001", highlights: [{ en: "English", ar: "العربية" }] })).toThrow();
    expect(() => productPdpContentDto.parse({ idempotencyKey: "40000000-0000-4000-8000-000000000001", highlights: [{ ...text, unsafe: "no" }] })).toThrow();
  });

  it("maps only well-formed persisted content to the public camelCase contract", () => {
    const product = toRetailProduct({ ...record, pdp_highlights: [text], pdp_details: [{ label: text, value: text }], pdp_a_plus: [{ eyebrow: text, title: text, body: text, image: "https://example.test/a-plus.jpg" }] }, "zh");
    expect(product.highlights).toEqual([text]);
    expect(product.details?.[0]).toEqual({ label: text, value: text });
    expect(product.aPlus?.[0]).toEqual({ eyebrow: text, title: text, body: text, image: "https://example.test/a-plus.jpg" });
    expect(toRetailProduct({ ...record, pdp_highlights: [{ en: "missing Arabic" }] }, "en").highlights).toBeUndefined();
  });
});
