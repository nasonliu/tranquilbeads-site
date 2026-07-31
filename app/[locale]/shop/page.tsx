import { notFound, redirect } from "next/navigation";

import { RetailShop, type RetailShopFacet, type RetailShopFilters } from "@/src/components/retail-shop";
import { getRetailCopy } from "@/src/data/retail/copy";
import { localizeRetailVariantOptions } from "@/src/data/retail/types";
import { getRetailRuntimeConfig } from "@/src/lib/retail/config";
import { isLocale, withLocale } from "@/src/lib/i18n";
import { SITE_URL } from "@/src/lib/seo";
import { listStorefrontShippingZones } from "@/src/lib/retail/operations";
import { listStorefrontV3Products } from "@/src/lib/retail/storefront-v3";

export const dynamic = "force-dynamic";

const facetOptionNames: Record<"en" | "ar", Record<RetailShopFacet, string[]>> = {
  en: { material: ["material"], beadCount: ["bead count", "beads"], diameter: ["diameter", "bead diameter"] },
  ar: { material: ["المادة", "الخامة", "مادة"], beadCount: ["عدد الخرزات", "عدد الحبات"], diameter: ["قطر الخرزة", "القطر"] },
};

function normalizedOptionName(value: string) {
  return value.trim().toLocaleLowerCase().replace(/[\s_-]+/g, "");
}

function facetValue(options: Record<string, string>, names: string[]) {
  const keys = new Set(names.map(normalizedOptionName));
  return Object.entries(options).find(([name]) => keys.has(normalizedOptionName(name)))?.[1]?.trim() || undefined;
}

function initialFilters(search: Record<string, string | string[] | undefined>): RetailShopFilters {
  return Object.fromEntries((["material", "beadCount", "diameter"] as RetailShopFacet[]).map((facet) => {
    const values = search[facet];
    return [facet, (Array.isArray(values) ? values : values ? [values] : []).filter(Boolean)];
  })) as RetailShopFilters;
}

export async function generateMetadata({ params }: PageProps<"/[locale]/shop">) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  if (locale === "zh") return { robots: { index: false, follow: true }, alternates: { canonical: `${SITE_URL}/en/shop`, languages: { en: `${SITE_URL}/en/shop`, ar: `${SITE_URL}/ar/shop` } } };
  const title = locale === "ar" ? "متجر التجزئة" : "Retail Shop";
  const description = locale === "ar" ? "كتالوج التجزئة قيد الإعداد." : "Direct-retail catalog in preparation.";
  return { title, description, alternates: { canonical: `${SITE_URL}${withLocale(locale, "/shop")}`, languages: { en: `${SITE_URL}/en/shop`, ar: `${SITE_URL}/ar/shop` } } };
}

export default async function ShopPage({ params, searchParams }: PageProps<"/[locale]/shop">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  if (locale === "zh") redirect("/en/shop");
  const copy = getRetailCopy(locale);
  const config = getRetailRuntimeConfig();
  const zones = await listStorefrontShippingZones();
  const filters = initialFilters(await searchParams);
  const products = (await listStorefrontV3Products()).filter((p) => Boolean(p.images[0]?.url)).map((p) => ({
    sku:p.sku,
    slug:p.slug,
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
      options:localizeRetailVariantOptions(variant.option_values, locale),
      priceMinor:Number(variant.amount_minor),
      available:Number(variant.available)>0,
      stock:Number(variant.available),
    })),
    // Facets only derive from structured options on sellable SKUs; no title
    // parsing means the category result remains safe for agent-managed data.
    filterVariants:p.variants.filter((variant) => Number(variant.available)>0).map((variant) => {
      const styleOptions = localizeRetailVariantOptions(variant.style_option_values ?? {}, locale);
      const variantOptions = localizeRetailVariantOptions(variant.option_values, locale);
      const valueFor = (facet: RetailShopFacet) => facetValue(styleOptions, facetOptionNames[locale][facet]) ?? facetValue(variantOptions, facetOptionNames[locale][facet]);
      return { material:valueFor("material"), beadCount:valueFor("beadCount"), diameter:valueFor("diameter") };
    }),
  }));
  const enabled = config.enabled && products.length > 0;
  return <div className="space-y-8 pt-6 md:space-y-10">
    <section className="noor-container">
      <div className="noor-panel noor-card-glow rounded-[1.75rem] px-6 py-7 sm:px-8">
        <p className="noor-kicker text-xs font-semibold text-accent-deep">{copy.eyebrow}</p>
        <div className="mt-3 grid items-end gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(18rem,1.1fr)]">
          <h1 className="noor-title text-4xl leading-tight text-foreground sm:text-5xl">{copy.title}</h1>
          <p className="max-w-2xl text-sm leading-7 text-muted sm:text-base">{copy.description}</p>
        </div>
      </div>
    </section>
    <RetailShop locale={locale} products={products} zones={zones} paypalClientId={config.enabled ? config.paypalClientId : undefined} currency="USD" enabled={enabled} copy={copy} initialFilters={filters} />
  </div>;
}
