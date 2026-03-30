import type { MetadataRoute } from "next";

import { collections, products } from "@/src/data/site";
import { locales, withLocale } from "@/src/lib/i18n";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.tranquilbeads.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["/", "/collections", "/wholesale", "/contact"];

  return locales.flatMap((locale) =>
    [
      ...routes.map((route) => ({
        url: `${baseUrl}${withLocale(locale, route)}`,
        lastModified: new Date(),
      })),
      ...collections.map((collection) => ({
        url: `${baseUrl}${withLocale(locale, `/collections/${collection.slug}`)}`,
        lastModified: new Date(),
      })),
      ...products.map((product) => ({
        url: `${baseUrl}${withLocale(locale, `/collections/${product.collection}/${product.slug}`)}`,
        lastModified: new Date(),
      })),
    ],
  );
}
