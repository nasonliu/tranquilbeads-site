import type { MetadataRoute } from "next";

import { blogArticles } from "@/src/data/blog-articles";
import { collections, products } from "@/src/data/site";
import { locales, withLocale } from "@/src/lib/i18n";
import { SITE_URL, absoluteUrl, getRealProductImages } from "@/src/lib/seo";

const baseUrl = SITE_URL;

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    { path: "/", changeFrequency: "weekly" as const, priority: 1 },
    { path: "/collections", changeFrequency: "weekly" as const, priority: 0.95 },
    { path: "/wholesale", changeFrequency: "monthly" as const, priority: 0.9 },
    { path: "/contact", changeFrequency: "monthly" as const, priority: 0.75 },
    { path: "/blog", changeFrequency: "weekly" as const, priority: 0.75 },
    { path: "/amazon", changeFrequency: "weekly" as const, priority: 0.65 },
    { path: "/noon", changeFrequency: "weekly" as const, priority: 0.65 },
    { path: "/shop", changeFrequency: "weekly" as const, priority: 0.55 },
  ];

  const marketingLocales = locales.filter((locale) => locale !== "zh");
  const chinesePolicyPaths = ["/privacy", "/terms", "/shipping-returns"];
  return [
    ...marketingLocales.flatMap((locale) =>
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
      ...blogArticles.map((article) => ({
        url: `${baseUrl}${withLocale(locale, `/blog/${article.slug}`)}`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: article.slug.includes("authenticity") || article.slug.includes("identify-real")
          ? 0.78
          : 0.72,
        images: [absoluteUrl(article.heroImage)],
      })),
    ],
    ),
    ...chinesePolicyPaths.map((path) => ({ url: `${baseUrl}${withLocale("zh", path)}`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.3 })),
  ];
}
