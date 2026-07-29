import { notFound } from "next/navigation";

import { RetailProductDetail } from "@/src/components/retail-product-detail";
import { toRetailProduct } from "@/src/data/retail/product-view-model";
import { isLocale, withLocale } from "@/src/lib/i18n";
import { SITE_URL } from "@/src/lib/seo";
import { getStorefrontV3ProductBySlug } from "@/src/lib/retail/storefront-v3";

export const dynamic = "force-dynamic";

function localized(locale: "en" | "ar" | "zh", values: { en: string; ar: string; zh?: string | null }) {
  return values[locale] ?? values.en;
}

async function load(slug: string, locale: "en" | "ar" | "zh") {
  const record = await getStorefrontV3ProductBySlug(slug);
  if (!record) return undefined;
  const product = toRetailProduct(record, locale);
  return { record, product };
}

export async function generateMetadata({ params }: PageProps<"/[locale]/shop/[slug]">) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const found = await load(slug, locale);
  if (!found) return {};
  const title = localized(locale, { en: found.record.title_en, ar: found.record.title_ar, zh: found.record.title_zh });
  const description = localized(locale, { en: found.record.description_en, ar: found.record.description_ar, zh: found.record.description_zh });
  return { title, description, alternates: { canonical: `${SITE_URL}${withLocale(locale, `/shop/${encodeURIComponent(slug)}`)}`, languages: { en: `${SITE_URL}/en/shop/${encodeURIComponent(slug)}`, ar: `${SITE_URL}/ar/shop/${encodeURIComponent(slug)}`, zh: `${SITE_URL}/zh/shop/${encodeURIComponent(slug)}` } } };
}

export default async function RetailProductPage({ params }: PageProps<"/[locale]/shop/[slug]">) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const found = await load(slug, locale);
  if (!found) notFound();
  return <RetailProductDetail locale={locale} product={found.product} images={found.record.images.map((image) => image.url)} />;
}
