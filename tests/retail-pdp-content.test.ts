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

  it("removes internal SKU and product-code rows from the customer-facing specification list", () => {
    const product = toRetailProduct({ ...record, pdp_details: [
      { label: { en: "Material", ar: "الخامة", zh: "材质" }, value: { en: "Amber", ar: "كهرمان", zh: "琥珀" } },
      { label: { en: "Direct retail product code", ar: "رمز منتج البيع المباشر", zh: "产品代码" }, value: { en: "INTERNAL-1", ar: "INTERNAL-1", zh: "INTERNAL-1" } },
    ] }, "en");
    expect(product.details).toEqual([{ label: { en: "Material", ar: "الخامة", zh: "材质" }, value: { en: "Amber", ar: "كهرمان", zh: "琥珀" } }]);
  });

  it("filters internal SKU terminology from customer-facing highlights and A+ content", () => {
    const product = toRetailProduct({
      ...record,
      pdp_highlights: [
        { en: "Hand-finished details", ar: "تفاصيل مشغولة يدوياً", zh: "手工细节" },
        { en: "Price and availability are set per SKU.", ar: "السعر حسب SKU", zh: "价格按 SKU 设置" },
      ],
      pdp_a_plus: [
        {
          eyebrow: { en: "Craft", ar: "حرفة", zh: "工艺" },
          title: { en: "Made with care", ar: "مصنوع بعناية", zh: "用心制作" },
          body: { en: "Polished and assembled by hand.", ar: "مصقول ومجمع يدوياً.", zh: "手工抛光与组装。" },
        },
        {
          eyebrow: { en: "Options", ar: "خيارات", zh: "选项" },
          title: { en: "Choose the SKU that fits you", ar: "اختر SKU", zh: "选择 SKU" },
          body: { en: "Each SKU has its own stock.", ar: "لكل SKU مخزون.", zh: "每个 SKU 独立库存。" },
        },
      ],
    }, "en");

    expect(product.highlights?.map((item) => item.en)).toEqual(["Hand-finished details"]);
    expect(product.aPlus?.map((section) => section.title.en)).toEqual(["Made with care"]);
  });
});
