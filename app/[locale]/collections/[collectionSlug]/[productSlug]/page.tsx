import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  collections,
  getCollectionBySlug,
  getPageCopy,
  getProductRelatedGuide,
  getPageMetadata,
  getProductBySlug,
  products,
} from "@/src/data/site";
import { PageHero } from "@/src/components/page-hero";
import { isLocale, locales, withLocale } from "@/src/lib/i18n";

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    collections.flatMap((collection) =>
      products
        .filter((product) => product.collection === collection.slug)
        .map((product) => ({
          locale,
          collectionSlug: collection.slug,
          productSlug: product.slug,
        })),
    ),
  );
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/collections/[collectionSlug]/[productSlug]">) {
  const { locale, collectionSlug, productSlug } = await params;

  if (!isLocale(locale)) {
    return {};
  }

  const collection = getCollectionBySlug(collectionSlug);
  const product = getProductBySlug(productSlug);

  if (!collection || !product || product.collection !== collection.slug) {
    return {};
  }

  return {
    ...getPageMetadata(locale, "collections", product.title[locale]),
    description: product.summary[locale],
    openGraph: {
      title: product.title[locale],
      description: product.summary[locale],
      images: [product.image, ...product.gallery.map((item) => item.image)],
    },
  };
}

export default async function ProductDetailPage({
  params,
}: PageProps<"/[locale]/collections/[collectionSlug]/[productSlug]">) {
  const { locale, collectionSlug, productSlug } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const collection = getCollectionBySlug(collectionSlug);
  const product = getProductBySlug(productSlug);

  if (!collection || !product || product.collection !== collection.slug) {
    notFound();
  }

  const copy = getPageCopy(locale);

  return (
    <div className="space-y-12 pt-8 md:space-y-16">
      <PageHero
        eyebrow={locale === "en" ? "Product detail" : "تفاصيل المنتج"}
        title={product.title[locale]}
        description={product.detailIntro[locale]}
        actions={
          <>
            <Link
              href={withLocale(locale, "/contact")}
              className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-deep"
            >
              {copy.hero.primaryCta}
            </Link>
            <Link
              href={withLocale(locale, `/collections/${collection.slug}`)}
              className="rounded-full border border-accent/35 px-6 py-3 text-sm font-semibold text-accent-deep transition hover:bg-accent/10"
            >
              {locale === "en" ? "Back to collection" : "العودة إلى المجموعة"}
            </Link>
          </>
        }
        aside={
          <div className="noor-panel rounded-[1.75rem] p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-accent-deep">
              {locale === "en" ? "Material" : "الخامة"}
            </p>
            <p className="mt-3 text-2xl font-semibold text-foreground">
              {product.material[locale]}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {product.tags[locale].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border/70 bg-white/55 px-3 py-1 text-xs text-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        }
      />

      <section className="noor-container grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <div className="noor-panel overflow-hidden rounded-[2rem]">
            <div className="relative aspect-[4/3] bg-[linear-gradient(135deg,_rgba(173,132,86,0.18),_rgba(25,31,22,0.04))]">
              <Image
                src={product.image}
                alt={product.heroAlt[locale]}
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {product.gallery.map((item) => (
              <div
                key={item.image}
                className="noor-panel overflow-hidden rounded-[1.35rem]"
              >
                <div className="relative aspect-square bg-[linear-gradient(135deg,_rgba(173,132,86,0.18),_rgba(25,31,22,0.04))]">
                  <Image
                    src={item.image}
                    alt={item.alt[locale]}
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="noor-panel rounded-[1.75rem] p-6 sm:p-8">
            <p className="text-sm leading-8 text-muted">{product.detailBody[locale]}</p>
            <div className="mt-6 rounded-[1.25rem] border border-accent/20 bg-accent/8 px-5 py-4 text-sm font-medium text-accent-deep">
              {product.idealFor[locale]}
            </div>
          </div>


          {product.specs.map((spec) => (
            <div
              key={`${product.slug}-${spec.label.en}`}
              className="rounded-[1.5rem] border border-border/70 bg-[#1f1a15] p-6 text-[#efe6d8]"
            >
              <p className="text-xs uppercase tracking-[0.24em] text-[#c8a06d]">
                {spec.label[locale]}
              </p>
              <p className="mt-3 text-lg font-semibold text-white">
                {spec.value[locale]}
              </p>
            </div>
          ))}

          {/* Related Buyer's Guide */}
          {(function () {
            const guide = getProductRelatedGuide(locale, product);
            if (!guide) return null;
            return (
              <a
                href={withLocale(locale, `/blog/${guide.slug}`)}
                className="group block rounded-[1.5rem] border border-accent/30 bg-[linear-gradient(135deg,_rgba(255,248,235,0.9),_rgba(252,240,220,0.95))] p-5 transition-all hover:border-accent/60 hover:shadow-lg"
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-accent-deep">
                  {locale === "en" ? "📋 Buyer's Guide" : "📋 دليل المشتري"}
                </p>
                <p className="mt-2 text-sm font-semibold leading-snug text-foreground group-hover:text-accent-deep transition-colors">
                  {guide.title}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {locale === "en" ? "Read guide →" : "اقرأ الدليل ←"}
                </p>
              </a>
            );
          })()}
        </div>
      </section>
    </div>
  );
}
