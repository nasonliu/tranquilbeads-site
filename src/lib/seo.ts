import type { Metadata } from "next";

import type { Collection, Product } from "@/src/lib/catalog-types";
import type { Locale } from "@/src/lib/i18n";
import { withLocale } from "@/src/lib/i18n";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.tranquilbeads.com";

const brand = "TranquilBeads";

function compactText(input: string, maxLength = 155) {
  const normalized = input.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized
    .slice(0, maxLength - 1)
    .replace(/\s+\S*$/, "")
    .replace(/[,\s;:-]+$/, "")}.`;
}

export function absoluteUrl(pathOrUrl: string) {
  if (/^https?:\/\//.test(pathOrUrl)) {
    return pathOrUrl;
  }

  return `${SITE_URL}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

export function getRealProductImages(product: Product) {
  return [product.image, ...product.gallery.map((item) => item.image)]
    .filter((image) =>
      image.startsWith("/images/real-products/") ||
      image.startsWith("/images/imported/") ||
      image.startsWith("/images/noon/") ||
      image.startsWith("https://m.media-amazon.com/"),
    )
    .map(absoluteUrl);
}

export function getProductSeoTitle(product: Product, locale: Locale) {
  if (locale === "ar") {
    return `${product.title.ar} بالجملة`;
  }

  return `${product.title.en} Wholesale`;
}

export function getProductSeoDescription(product: Product, locale: Locale) {
  if (locale === "ar") {
    return compactText(
      `${product.summary.ar} متاح لمشتري الجملة والتجزئة الثقافية مع حد أدنى 100 قطعة ودعم تغليف خاص.`,
      155,
    );
  }

  return compactText(
    `${product.summary.en} Wholesale tasbih sourcing with MOQ 100 pcs, private label packaging, and export support.`,
    155,
  );
}

export function getCollectionSeoTitle(collection: Collection, locale: Locale) {
  if (locale === "ar") {
    return `${collection.name.ar} بالجملة`;
  }

  return `${collection.name.en} Wholesale Collection`;
}

export function getCollectionSeoDescription(collection: Collection, locale: Locale) {
  if (locale === "ar") {
    return compactText(
      `${collection.description.ar} تشكيلة مناسبة لمشتري الجملة وبرامج الهدايا والتجزئة الثقافية.`,
      155,
    );
  }

  return compactText(
    `${collection.description.en} Built for wholesale buyers, boutique retailers, museum shops, and gifting programs.`,
    155,
  );
}

export function buildProductMetadata(
  locale: Locale,
  collection: Collection,
  product: Product,
): Metadata {
  const title = getProductSeoTitle(product, locale);
  const description = getProductSeoDescription(product, locale);
  const path = `/collections/${collection.slug}/${product.slug}`;
  const images = getRealProductImages(product);

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}${withLocale(locale, path)}`,
      languages: {
        en: `${SITE_URL}${withLocale("en", path)}`,
        ar: `${SITE_URL}${withLocale("ar", path)}`,
      },
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: `${SITE_URL}${withLocale(locale, path)}`,
      siteName: brand,
      images: images.map((url) => ({ url })),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images,
    },
  };
}

export function buildCollectionMetadata(
  locale: Locale,
  collection: Collection,
): Metadata {
  const title = getCollectionSeoTitle(collection, locale);
  const description = getCollectionSeoDescription(collection, locale);
  const path = `/collections/${collection.slug}`;
  const image = absoluteUrl(collection.heroImage);

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}${withLocale(locale, path)}`,
      languages: {
        en: `${SITE_URL}${withLocale("en", path)}`,
        ar: `${SITE_URL}${withLocale("ar", path)}`,
      },
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: `${SITE_URL}${withLocale(locale, path)}`,
      siteName: brand,
      images: [{ url: image }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export function buildProductJsonLd(
  locale: Locale,
  collection: Collection,
  product: Product,
) {
  const productUrl = `${SITE_URL}${withLocale(
    locale,
    `/collections/${collection.slug}/${product.slug}`,
  )}`;
  const images = getRealProductImages(product);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${productUrl}#product`,
    name: product.title[locale],
    description: getProductSeoDescription(product, locale),
    image: images,
    brand: {
      "@type": "Brand",
      name: brand,
    },
    category: collection.name[locale],
    material: product.material[locale],
    url: productUrl,
    isRelatedTo: product.tags[locale].slice(0, 6).map((tag) => ({
      "@type": "Thing",
      name: tag,
    })),
  };
}

export function buildBreadcrumbJsonLd(
  locale: Locale,
  collection: Collection,
  product?: Product,
) {
  const items = [
    {
      "@type": "ListItem",
      position: 1,
      name: locale === "ar" ? "الرئيسية" : "Home",
      item: `${SITE_URL}${withLocale(locale)}`,
    },
    {
      "@type": "ListItem",
      position: 2,
      name: locale === "ar" ? "المجموعات" : "Collections",
      item: `${SITE_URL}${withLocale(locale, "/collections")}`,
    },
    {
      "@type": "ListItem",
      position: 3,
      name: collection.name[locale],
      item: `${SITE_URL}${withLocale(locale, `/collections/${collection.slug}`)}`,
    },
  ];

  if (product) {
    items.push({
      "@type": "ListItem",
      position: 4,
      name: product.title[locale],
      item: `${SITE_URL}${withLocale(
        locale,
        `/collections/${collection.slug}/${product.slug}`,
      )}`,
    });
  }

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}
