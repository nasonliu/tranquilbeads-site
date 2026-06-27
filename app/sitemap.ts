import type { MetadataRoute } from "next";

import { collections, products } from "@/src/data/site";
import { locales, withLocale } from "@/src/lib/i18n";
import { SITE_URL, getRealProductImages } from "@/src/lib/seo";

const baseUrl = SITE_URL;

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
  const routes = [
    { path: "/", changeFrequency: "weekly" as const, priority: 1 },
    { path: "/collections", changeFrequency: "weekly" as const, priority: 0.95 },
    { path: "/wholesale", changeFrequency: "monthly" as const, priority: 0.9 },
    { path: "/contact", changeFrequency: "monthly" as const, priority: 0.75 },
    { path: "/blog", changeFrequency: "weekly" as const, priority: 0.75 },
    { path: "/amazon", changeFrequency: "weekly" as const, priority: 0.65 },
    { path: "/noon", changeFrequency: "weekly" as const, priority: 0.65 },
  ];

  return locales.flatMap((locale) =>
    [
      ...routes.map((route) => ({
        url: `${baseUrl}${withLocale(locale, route.path)}`,
        lastModified: new Date(),
        changeFrequency: route.changeFrequency,
        priority: route.priority,
      })),
      ...collections.map((collection) => ({
        url: `${baseUrl}${withLocale(locale, `/collections/${collection.slug}`)}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: collection.featured ? 0.9 : 0.78,
      })),
      ...products.map((product) => ({
        url: `${baseUrl}${withLocale(locale, `/collections/${product.collection}/${product.slug}`)}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.86,
        images: getRealProductImages(product),
      })),
      ...guides.map((slug) => ({
        url: `${baseUrl}${withLocale(locale, `/blog/${slug}`)}`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.72,
      })),
    ],
  );
}
