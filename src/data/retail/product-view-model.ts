import { localizeRetailVariantOptions, type RetailLocale, type RetailProduct } from "./types";

type ProductRecord = {
  sku: string; slug?: string; title_en: string; title_ar: string; title_zh?: string | null;
  description_en: string; description_ar: string; description_zh?: string | null;
  images: Array<{ url: string }>;
  variants: Array<Record<string, unknown>>;
};

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
  return {
    sku: record.sku, slug: record.slug, name: { en: record.title_en, ar: record.title_ar, zh: record.title_zh ?? record.title_en },
    description: { en: record.description_en, ar: record.description_ar, zh: record.description_zh ?? record.description_en },
    image: record.images[0]?.url ?? "", priceMinor: variants.length ? Math.min(...variants.map((variant) => variant.priceMinor)) : 0,
    currency: "USD", available: variants.some((variant) => variant.available), stock: variants.length ? Math.max(...variants.map((variant) => variant.stock)) : 0, variants,
  };
}
