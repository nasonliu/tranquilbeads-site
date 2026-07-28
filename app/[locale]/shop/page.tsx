import { notFound } from "next/navigation";

import { RetailShop } from "@/src/components/retail-shop";
import { PageHero } from "@/src/components/page-hero";
import { getRetailCopy } from "@/src/data/retail/copy";
import { getRetailRuntimeConfig } from "@/src/lib/retail/config";
import { isLocale, withLocale } from "@/src/lib/i18n";
import { SITE_URL } from "@/src/lib/seo";
import { listStorefrontShippingZones } from "@/src/lib/retail/operations";
import { listStorefrontV3Products } from "@/src/lib/retail/storefront-v3";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/shop">) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const title = locale === "ar" ? "متجر التجزئة" : locale === "zh" ? "零售商店" : "Retail Shop";
  const description = locale === "ar" ? "كتالوج التجزئة قيد الإعداد." : locale === "zh" ? "TranquilBeads 直接零售商品目录。" : "Direct-retail catalog in preparation.";
  return { title, description, alternates: { canonical: `${SITE_URL}${withLocale(locale, "/shop")}`, languages: { en: `${SITE_URL}/en/shop`, ar: `${SITE_URL}/ar/shop`, zh: `${SITE_URL}/zh/shop` } } };
}

export default async function ShopPage({ params }: PageProps<"/[locale]/shop">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = getRetailCopy(locale);
  const config = getRetailRuntimeConfig();
  const zones = await listStorefrontShippingZones();
  const products = (await listStorefrontV3Products()).filter((p) => Boolean(p.images[0]?.url)).map((p) => ({
    sku:p.sku,
    name:{en:p.title_en,ar:p.title_ar,zh:p.title_zh || p.title_en},
    description:{en:p.description_en,ar:p.description_ar,zh:p.description_zh || p.description_en},
    image:p.images[0]!.url,
    // These product-level values are display fallbacks only. Cart and checkout
    // are always keyed to a selected variant SKU.
    priceMinor:Math.min(...p.variants.map((variant) => Number(variant.amount_minor))),
    currency:"USD" as const,
    available:p.variants.some((variant) => Number(variant.available)>0),
    stock:Math.max(...p.variants.map((variant) => Number(variant.available))),
    variants:p.variants.map((variant) => ({
      sku:variant.sku,
      name:{en:variant.title_en || p.title_en,ar:variant.title_ar || p.title_ar,zh:variant.title_zh || variant.title_en || p.title_zh || p.title_en},
      options:variant.option_values ?? {},
      priceMinor:Number(variant.amount_minor),
      available:Number(variant.available)>0,
      stock:Number(variant.available),
    })),
  }));
  const enabled = config.enabled && products.length > 0;
  return <div className="space-y-12 pt-8 md:space-y-16"><PageHero eyebrow={copy.eyebrow} title={copy.title} description={copy.description} /><RetailShop locale={locale} products={products} zones={zones} paypalClientId={config.enabled ? config.paypalClientId : undefined} currency="USD" enabled={enabled} copy={copy} /></div>;
}
