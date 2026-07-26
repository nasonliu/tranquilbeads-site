import { notFound } from "next/navigation";

import { RetailShop } from "@/src/components/retail-shop";
import { PageHero } from "@/src/components/page-hero";
import { retailCatalog } from "@/src/data/retail/catalog";
import { getRetailCopy } from "@/src/data/retail/copy";
import { getRetailRuntimeConfig } from "@/src/lib/retail/config";
import { isLocale, withLocale } from "@/src/lib/i18n";
import { SITE_URL } from "@/src/lib/seo";

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
  const activeProduct = retailCatalog.find((product) => product.available);
  const enabled = config.enabled && Boolean(activeProduct);
  return <div className="space-y-12 pt-8 md:space-y-16"><PageHero eyebrow={copy.eyebrow} title={copy.title} description={copy.description} /><RetailShop locale={locale} products={retailCatalog} paypalClientId={config.enabled ? config.paypalClientId : undefined} currency={activeProduct?.currency} enabled={enabled} copy={copy} /></div>;
}
