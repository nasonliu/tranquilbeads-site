import { localizeRetailVariantOptions, type RetailLocale, type RetailProduct } from "./types";

type ProductRecord = {
  sku: string; slug?: string; title_en: string; title_ar: string; title_zh?: string | null;
  description_en: string; description_ar: string; description_zh?: string | null;
  images: Array<{ url: string }>;
  variants: Array<Record<string, unknown>>;
  pdp_highlights?: unknown;
  pdp_details?: unknown;
  pdp_a_plus?: unknown;
};

type LocalizedText = { en: string; ar: string; zh?: string };
const INTERNAL_CUSTOMER_TERMS = [
  /\bsku\b/i,
  /\bskc\b/i,
  /product code/i,
  /رمز\s+(?:sku|skc|المنتج)/iu,
  /(?:商品|产品)编码/u,
];

function containsInternalCustomerTerm(value: LocalizedText) {
  return Object.values(value).some((text) => INTERNAL_CUSTOMER_TERMS.some((pattern) => pattern.test(text)));
}

function localizedText(value: unknown): LocalizedText | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const input = value as Record<string, unknown>;
  if (typeof input.en !== "string" || typeof input.ar !== "string" || typeof input.zh !== "string") return undefined;
  return { en: input.en, ar: input.ar, zh: input.zh };
}
function localizedArray(value: unknown, limit: number): LocalizedText[] | undefined {
  if (!Array.isArray(value) || value.length > limit) return undefined;
  const result = value.map(localizedText);
  if (!result.every(Boolean)) return undefined;
  const publicItems = (result as LocalizedText[]).filter((item) => !containsInternalCustomerTerm(item));
  return publicItems.length ? publicItems : undefined;
}
function productDetails(value: unknown) {
  if (!Array.isArray(value) || value.length > 12) return undefined;
  const result = value.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return undefined;
    const row = item as Record<string, unknown>; const label = localizedText(row.label); const detailValue = localizedText(row.value);
    return label && detailValue ? { label, value: detailValue } : undefined;
  });
  if (!result.every(Boolean)) return undefined;
  const internalLabels = ["sku", "skc", "product code", "retail product code", "direct retail product code", "رمز المنتج", "رمز منتج البيع المباشر", "商品编码", "产品代码"];
  const publicDetails = (result as Array<{ label: LocalizedText; value: LocalizedText }>).filter((detail) => {
    const labels = Object.values(detail.label).map((label) => label.trim().toLocaleLowerCase());
    return !labels.some((label) => internalLabels.some((internal) => label === internal || label.includes(internal)));
  });
  return publicDetails.length ? publicDetails : undefined;
}
function productAPlus(value: unknown) {
  if (!Array.isArray(value) || value.length > 6) return undefined;
  const result = value.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return undefined;
    const row = item as Record<string, unknown>; const title = localizedText(row.title); const body = localizedText(row.body);
    const eyebrow = row.eyebrow === undefined ? undefined : localizedText(row.eyebrow);
    const image = row.image === undefined ? undefined : typeof row.image === "string" ? row.image : undefined;
    return title && body && (row.eyebrow === undefined || eyebrow) && (row.image === undefined || image)
      ? { ...(eyebrow ? { eyebrow } : {}), title, body, ...(image ? { image } : {}) } : undefined;
  });
  if (!result.every(Boolean)) return undefined;
  const publicSections = (result as Array<{ eyebrow?: LocalizedText; title: LocalizedText; body: LocalizedText; image?: string }>).filter((section) =>
    !containsInternalCustomerTerm(section.title)
    && !containsInternalCustomerTerm(section.body)
    && (!section.eyebrow || !containsInternalCustomerTerm(section.eyebrow)),
  );
  return publicSections.length ? publicSections : undefined;
}

/** Shared PDP view model for public and authenticated draft previews. */
export function toRetailProduct(record: ProductRecord, locale: RetailLocale): RetailProduct {
  const variants = record.variants.map((variant) => ({
    sku: String(variant.sku),
    name: { en: String(variant.title_en || record.title_en), ar: String(variant.title_ar || variant.title_en || record.title_ar), zh: String(variant.title_zh || variant.title_en || record.title_zh || record.title_en) },
    options: localizeRetailVariantOptions(variant.option_values, locale),
    priceMinor: Number(variant.amount_minor), available: Number(variant.available) > 0, stock: Number(variant.available),
    style: variant.style_public_id && variant.style_code ? {
      publicId: String(variant.style_public_id), code: String(variant.style_code),
      name: { en: String(variant.style_title_en || variant.style_code), ar: String(variant.style_title_ar || variant.style_title_en || variant.style_code), zh: String(variant.style_title_zh || variant.style_title_en || variant.style_code) },
      options: localizeRetailVariantOptions(variant.style_option_values ?? {}, locale), position: Number(variant.style_position ?? 0), image: variant.style_image_url ? String(variant.style_image_url) : undefined,
    } : undefined,
  }));
  const highlights = localizedArray(record.pdp_highlights, 5);
  const details = productDetails(record.pdp_details);
  const aPlus = productAPlus(record.pdp_a_plus);
  return {
    sku: record.sku, slug: record.slug, name: { en: record.title_en, ar: record.title_ar, zh: record.title_zh ?? record.title_en },
    description: { en: record.description_en, ar: record.description_ar, zh: record.description_zh ?? record.description_en },
    image: record.images[0]?.url ?? "", priceMinor: variants.length ? Math.min(...variants.map((variant) => variant.priceMinor)) : 0,
    currency: "USD", available: variants.some((variant) => variant.available), stock: variants.length ? Math.max(...variants.map((variant) => variant.stock)) : 0, variants,
    ...(highlights ? { highlights } : {}), ...(details ? { details } : {}), ...(aPlus ? { aPlus } : {}),
  };
}
