import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";

import { isWholesaleLocale, withLocale } from "@/src/lib/i18n";
import { blogArticles } from "@/src/data/blog-articles";
import { getProductBySlug } from "@/src/data/site";
import { getProductRetailLinks } from "@/src/lib/product-retail-links";
import {
  buildBlogArticleJsonLd,
  buildBlogArticleMetadata,
  buildBlogBreadcrumbJsonLd,
  buildBlogFaqJsonLd,
  getBlogArticleTitle,
  serializeJsonLd,
} from "@/src/lib/seo";

export function generateStaticParams() {
  return (
    ["en", "ar"].flatMap((locale) =>
      blogArticles.map((article) => ({ locale, slug: article.slug })),
    )
  );
}

export async function generateMetadata({ params }: { params: Record<string, string> }) {
  const { locale, slug } = await params;
  if (!isWholesaleLocale(locale)) return {};
  const article = blogArticles.find((a) => a.slug === slug);
  if (!article) return {};

  return buildBlogArticleMetadata(locale, article);
}

type BlogParams = { params: Record<string, string> };
export default async function BlogArticlePage({ params }: BlogParams) {
  const { locale, slug } = await params;
  if (!isWholesaleLocale(locale)) notFound();

  const article = blogArticles.find((a) => a.slug === slug);
  if (!article) notFound();

  const title = getBlogArticleTitle(article, locale);
  const intro = locale === "en" ? article.intro_en : article.intro_ar;
  const sections = locale === "en" ? article.sections_en : article.sections_ar;
  const cta = locale === "en" ? article.cta_en : article.cta_ar;
  const faq = locale === "en" ? article.faq_en : article.faq_ar;
  const relatedProducts = article.relatedProductSlugs
    .map((productSlug) => getProductBySlug(productSlug))
    .filter((product) => product !== undefined);
  const articleJsonLd = buildBlogArticleJsonLd(locale, article);
  const breadcrumbJsonLd = buildBlogBreadcrumbJsonLd(locale, article);
  const faqJsonLd = buildBlogFaqJsonLd(locale, article);

  return (
    <div className="noor-container py-12 md:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />
      {faqJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }}
        />
      ) : null}
      <div className="mx-auto max-w-3xl">
        {/* Hero Image */}
        <div className="relative mb-8 aspect-[16/9] overflow-hidden rounded-2xl bg-gray-50">
          <Image
            src={article.heroImage}
            alt={locale === "en" ? article.heroAlt_en : article.heroAlt_ar}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 768px"
          />
        </div>

        {/* Meta */}
        <div className="mb-6 flex items-center gap-3 text-xs text-muted">
          <span className="rounded-full bg-accent/10 px-3 py-1 text-accent-deep">
            {locale === "en" ? "Buyer's Guide" : "دليل المشتري"}
          </span>
          <span>{article.readTime}</span>
        </div>

        {/* Title */}
        <h1 className="noor-title text-3xl md:text-4xl">{title}</h1>

        {/* Intro */}
        <p className="mt-4 text-lg text-muted leading-relaxed">{intro}</p>

        <div className="mt-8 h-px bg-border/50" />

        {/* Sections */}
        <div className="mt-8 space-y-8">
          {sections.map((section, i) => (
            <div key={i} className="space-y-3">
              <h2 className="text-xl font-semibold">{section.title}</h2>
              <p className="text-muted leading-relaxed">{section.body}</p>
            </div>
          ))}
        </div>

        {faq?.length ? (
          <section className="mt-12 space-y-5">
            <div>
              <p className="noor-kicker text-xs font-semibold text-accent-deep">
                {locale === "en" ? "Quick Answers" : "إجابات سريعة"}
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                {locale === "en" ? "Frequently Asked Questions" : "أسئلة شائعة"}
              </h2>
            </div>
            <div className="divide-y divide-border/60 border-y border-border/60">
              {faq.map((item) => (
                <div key={item.question} className="py-5">
                  <h3 className="font-semibold">{item.question}</h3>
                  <p className="mt-2 leading-relaxed text-muted">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* CTA */}
        <div className="mt-12 rounded-2xl border border-accent/20 bg-[linear-gradient(135deg,_rgba(255,248,235,0.8),_rgba(252,240,220,0.9))] p-6 text-center">
          <p className="text-sm font-semibold text-accent-deep">{cta}</p>
          <div className="mt-4 flex justify-center gap-3">
            <Link
              href={withLocale(locale, "/collections")}
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white hover:bg-accent/90"
            >
              {locale === "en" ? "Browse Collections" : "تصفح المجموعات"}
            </Link>
            <Link
              href={withLocale(locale, "/contact")}
              className="rounded-full border border-accent/30 px-5 py-2 text-sm font-semibold text-accent-deep hover:bg-accent/5"
            >
              {locale === "en" ? "Contact Us" : "تواصل معنا"}
            </Link>
          </div>
        </div>

        {relatedProducts.length ? (
          <section className="mt-12 border-y border-border/60 py-8">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="noor-kicker text-xs font-semibold text-accent-deep">
                  {locale === "en" ? "Products From This Guide" : "منتجات مرتبطة بهذا الدليل"}
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  {locale === "en" ? "Related Wholesale Products" : "منتجات بالجملة ذات صلة"}
                </h2>
              </div>
              <Link
                href={withLocale(locale, "/collections")}
                className="hidden text-sm font-semibold text-accent-deep hover:underline sm:inline"
              >
                {locale === "en" ? "View all" : "عرض الكل"}
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {relatedProducts.map((product) => {
                const retailLinks = getProductRetailLinks(product.slug, locale);

                return (
                <article
                  key={product.slug}
                  className="overflow-hidden rounded-xl border border-border/60 bg-white"
                >
                  <div className="relative aspect-square bg-gray-50">
                    <Image
                      src={product.image}
                      alt={`${product.title[locale]} ${locale === "en" ? "product photo" : "صورة المنتج"}`}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, 240px"
                    />
                  </div>
                  <div className="space-y-2 p-3">
                    <h3 className="text-sm font-semibold leading-snug">
                      {product.title[locale]}
                    </h3>
                    <p className="text-xs leading-relaxed text-muted line-clamp-2">
                      {product.summary[locale]}
                    </p>
                    <p className="text-xs font-semibold text-accent-deep">MOQ 100 pcs</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {retailLinks.map((link) => (
                        <a
                          key={`${product.slug}-${link.label}`}
                          href={link.href}
                          target="_blank"
                          rel="noreferrer"
                          className={
                            link.platform === "amazon"
                              ? "rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent/90"
                              : "rounded-full border border-accent/30 px-3 py-1.5 text-xs font-semibold text-accent-deep hover:bg-accent/5"
                          }
                        >
                          {link.label}
                        </a>
                      ))}
                    </div>
                    <Link
                      href={withLocale(
                        locale,
                        `/collections/${product.collection}/${product.slug}`,
                      )}
                      className="inline-flex text-xs font-semibold text-muted hover:text-accent-deep hover:underline"
                    >
                      {locale === "en" ? "View details" : "عرض التفاصيل"}
                    </Link>
                  </div>
                </article>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
