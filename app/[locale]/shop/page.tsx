import { notFound } from "next/navigation";

import { RetailShop } from "@/src/components/retail-shop";
import { PageHero } from "@/src/components/page-hero";
import { getRetailCopy } from "@/src/data/retail/copy";
import { getRetailRuntimeConfig } from "@/src/lib/retail/config";
import { isLocale, withLocale } from "@/src/lib/i18n";
import { SITE_URL } from "@/src/lib/seo";
import { listStorefrontProducts, listStorefrontShippingZones } from "@/src/lib/retail/operations";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/shop">) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const title = locale === "ar" ? "متجر التجزئة" : "Retail Shop";
  const description = locale === "ar" ? "كتالوج التجزئة قيد الإعداد." : "Direct-retail catalog in preparation.";
  return { title, description, alternates: { canonical: `${SITE_URL}${withLocale(locale, "/shop")}`, languages: { en: `${SITE_URL}/en/shop`, ar: `${SITE_URL}/ar/shop` } } };
}

export default async function ShopPage({ params }: PageProps<"/[locale]/shop">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = getRetailCopy(locale);
  const config = getRetailRuntimeConfig();
  const zones = await listStorefrontShippingZones();
  const products = (await listStorefrontProducts()).filter((p) => Boolean(p.images[0]?.url)).map((p) => ({ sku:p.sku, name:{en:p.title_en,ar:p.title_ar}, description:{en:p.description_en,ar:p.description_ar}, image:p.images[0]!.url, priceMinor:Number(p.amount_minor), currency:"USD" as const, available:Number(p.available)>0, stock:Number(p.available) }));
  const enabled = config.enabled && products.length > 0;
  return <div className="space-y-12 pt-8 md:space-y-16"><PageHero eyebrow={copy.eyebrow} title={copy.title} description={copy.description} /><RetailShop locale={locale} products={products} zones={zones} paypalClientId={config.enabled ? config.paypalClientId : undefined} currency="USD" enabled={enabled} copy={copy} /></div>;
}
