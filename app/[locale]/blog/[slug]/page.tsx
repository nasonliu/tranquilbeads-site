import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";

import { isLocale, withLocale } from "@/src/lib/i18n";
import { blogArticles } from "@/src/data/blog-articles";

export function generateStaticParams() {
  return (
    ["en", "ar"].flatMap((locale) =>
      blogArticles.map((article) => ({ locale, slug: article.slug })),
    )
  );
}

export async function generateMetadata({ params }: { params: Record<string, string> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const article = blogArticles.find((a) => a.slug === slug);
  if (!article) return {};

  const title = locale === "en" ? article.title_en : article.title_ar;
  const description = locale === "en" ? article.intro_en : article.intro_ar;

  return {
    title: `${title} | TranquilBeads`,
    description,
    alternates: {
      canonical: `https://www.tranquilbeads.com/${locale}/blog/${slug}`,
    },
    openGraph: {
      title: `${title} | TranquilBeads`,
      description,
      siteName: "TranquilBeads",
      images: [{ url: `https://www.tranquilbeads.com${article.heroImage}` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | TranquilBeads`,
      description,
    },
  };
}

type BlogParams = { params: Record<string, string> };
export default async function BlogArticlePage({ params }: BlogParams) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  const article = blogArticles.find((a) => a.slug === slug);
  if (!article) notFound();

  const title = locale === "en" ? article.title_en : article.title_ar;
  const intro = locale === "en" ? article.intro_en : article.intro_ar;
  const sections = locale === "en" ? article.sections_en : article.sections_ar;
  const cta = locale === "en" ? article.cta_en : article.cta_ar;

  return (
    <div className="noor-container py-12 md:py-16">
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

        {/* Related Products */}
        <div className="mt-8 rounded-2xl border border-border/60 p-6">
          <h3 className="mb-4 text-sm font-semibold">
            {locale === "en" ? "Related Wholesale Products" : "منتجات بالجملة ذات صلة"}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href={withLocale(locale, "/collections/signature-tasbih/natural-kuka-wood-tasbih")}
              className="group flex items-center gap-3 rounded-xl border border-border/60 p-3 transition-colors hover:border-accent/30"
            >
              <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-50">
                <Image src="/images/real-products/natural-kuka-wood/hero.jpeg" alt="Kuka Wood" fill className="object-cover" sizes="48px" />
              </div>
              <div>
                <p className="text-xs font-semibold group-hover:text-accent-deep">
                  {locale === "en" ? "Natural Kuka Wood Tasbih" : "سبحان خشب كوكا طبيعي"}
                </p>
                <p className="text-xs text-muted">MOQ 100 pcs</p>
              </div>
            </Link>
            <Link
              href={withLocale(locale, "/collections/gift-sets/baltic-amber-gift-set")}
              className="group flex items-center gap-3 rounded-xl border border-border/60 p-3 transition-colors hover:border-accent/30"
            >
              <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-50">
                <Image src="/images/real-products/baltic-amber/hero.jpeg" alt="Baltic Amber" fill className="object-cover" sizes="48px" />
              </div>
              <div>
                <p className="text-xs font-semibold group-hover:text-accent-deep">
                  {locale === "en" ? "Baltic Amber Gift Set" : "مجموعة هدايا كهرمان بلطيقي"}
                </p>
                <p className="text-xs text-muted">MOQ 100 pcs</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
