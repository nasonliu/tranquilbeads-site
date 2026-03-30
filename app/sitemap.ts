import type { MetadataRoute } from "next";

import { collections, products } from "@/src/data/site";
import { locales, withLocale } from "@/src/lib/i18n";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.tranquilbeads.com";

const guides = [
  "how-to-identify-real-amber-tasbih",
  "kuka-wood-tasbih-authenticity-guide",
  "what-is-tasbih-beginner-guide-for-retailers",
  "how-to-choose-tasbih-for-daily-use",
  "tasbih-gift-ideas-father-husband-special-occasions",
  "why-people-keep-tasbih-in-their-cars",
  "natural-stone-vs-synthetic-beads-tasbih",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["/", "/collections", "/wholesale", "/contact", "/blog"];

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
      ...locales.flatMap((locale) =>
        guides.map((slug) => ({
          url: `${baseUrl}${withLocale(locale, `/blog/${slug}`)}`,
          lastModified: new Date(),
        })),
      ),
    ],
  );
}
