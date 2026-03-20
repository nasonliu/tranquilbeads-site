import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getCollectionBySlug,
  getPageCopy,
  getPageMetadata,
  getProductsByCollection,
  collections,
} from "@/src/data/site";
import { PageHero } from "@/src/components/page-hero";
import { ProductCard } from "@/src/components/product-card";
import { isLocale, locales, withLocale } from "@/src/lib/i18n";

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    collections.map((collection) => ({
      locale,
      collectionSlug: collection.slug,
    })),
  );
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/collections/[collectionSlug]">) {
  const { locale, collectionSlug } = await params;

  if (!isLocale(locale)) {
    return {};
  }

  const collection = getCollectionBySlug(collectionSlug);
  if (!collection) {
    return {};
  }

  return {
    ...getPageMetadata(locale, "collections", collection.name[locale]),
    description: collection.description[locale],
    openGraph: {
      title: collection.name[locale],
      description: collection.description[locale],
      images: [collection.heroImage],
    },
  };
}

export default async function CollectionDetailPage({
  params,
}: PageProps<"/[locale]/collections/[collectionSlug]">) {
  const { locale, collectionSlug } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const collection = getCollectionBySlug(collectionSlug);
  if (!collection) {
    notFound();
  }

  const collectionProducts = getProductsByCollection(collectionSlug);
  const copy = getPageCopy(locale);

  return (
    <div className="space-y-12 pt-8 md:space-y-16">
      <PageHero
        eyebrow={locale === "en" ? "Collection detail" : "تفاصيل المجموعة"}
        title={collection.name[locale]}
        description={collection.overview[locale]}
        actions={
          <Link
            href={withLocale(locale, "/contact")}
            className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-deep"
          >
            {copy.hero.primaryCta}
          </Link>
        }
        aside={
          <div className="space-y-4">
            <div className="noor-panel rounded-[1.75rem] p-6">
              <p className="text-xs uppercase tracking-[0.24em] text-accent-deep">
                {locale === "en" ? "Positioning" : "التموضع"}
              </p>
              <p className="mt-4 text-sm leading-7 text-muted">
                {collection.positioning[locale]}
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-accent/20 bg-[#1f1a15] p-6 text-[#efe6d8]">
              <p className="text-xs uppercase tracking-[0.24em] text-[#c8a06d]">
                {locale === "en" ? "Collection strengths" : "نقاط قوة المجموعة"}
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-[#dfcfb8]">
                {collection.highlightPoints[locale].map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          </div>
        }
      />

      <section className="noor-container grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {collectionProducts.map((product) => (
          <ProductCard
            key={product.slug}
            title={product.title[locale]}
            summary={product.summary[locale]}
            material={product.material[locale]}
            tags={product.tags[locale]}
            image={product.image}
            detailHref={withLocale(locale, `/collections/${collectionSlug}/${product.slug}`)}
            detailLabel={copy.collectionsPage.detailLabel}
            inquiryHref={withLocale(locale, "/contact")}
            inquiryLabel={copy.collectionsPage.inquiryLabel}
          />
        ))}
      </section>
    </div>
  );
}
