import { listStorefrontV3Products } from "@/src/lib/retail/storefront-v3";
import { localizeRetailVariantOptions } from "@/src/data/retail/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const products = (await listStorefrontV3Products()).filter((product) => Boolean(product.images[0]?.url)).map((product) => ({
      sku: product.sku, slug: product.slug, image: product.images[0]!.url,
      name: { en: product.title_en, ar: product.title_ar, zh: product.title_zh || product.title_en },
      variants: product.variants.map((variant) => ({ sku: variant.sku, name: { en: variant.title_en || product.title_en, ar: variant.title_ar || product.title_ar, zh: variant.title_zh || variant.title_en || product.title_zh || product.title_en }, options: localizeRetailVariantOptions(variant.option_values, "en"), priceMinor: Number(variant.amount_minor), available: Number(variant.available) > 0, stock: Number(variant.available) })),
    }));
    return Response.json({ ok: true, products }, { headers: { "cache-control": "no-store" } });
  } catch { return Response.json({ ok: false, products: [] }, { status: 503, headers: { "cache-control": "no-store" } }); }
}
