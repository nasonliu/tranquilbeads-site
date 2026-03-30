import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";

import { isLocale, withLocale } from "@/src/lib/i18n";
import { blogArticles } from "@/src/data/blog-articles";

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "ar" }];
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return {
    title: locale === "en"
      ? "Tasbih Buyer's Guides — Amber & Kuka Wood Authentication | TranquilBeads"
      : "أدلة مشتري التسابيح — التحقق من الكهرمان وخشب الكوكا | ترانكويل بيدز",
    description: locale === "en"
      ? "Practical authentication guides for wholesale tasbih buyers. 5-minute tests for amber and kuka wood."
      : "أدلة التحقق العملية لمشتري التسابيح بالجملة. اختبارات في 5 دقائق للكهرمان وخشب الكوكا.",
  };
}

export default async function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <div className="noor-container space-y-12 pt-8 md:space-y-16">
      <div className="text-center">
        <p className="noor-kicker text-xs font-semibold text-accent-deep">
          {locale === "en" ? "Buyer's Guides" : "أدلة المشتري"}
        </p>
        <h1 className="noor-title mt-3 text-4xl md:text-5xl">
          {locale === "en" ? "Verify Before You Buy" : "تحقق قبل أن تشتري"}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted">
          {locale === "en"
            ? "Practical guides for wholesale tasbih buyers — authentication tests, sourcing checklists, and material education."
            : "أدلة عملية لمشتري التسابيح بالجملة — اختبارات المصادقة وقوائم الفحص وتعليم المواد."}
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {blogArticles.map((post) => (
          <Link
            key={post.slug}
            href={withLocale(locale, `/blog/${post.slug}`)}
            className="group space-y-4"
          >
            <div className="overflow-hidden rounded-2xl border border-border/60">
              <div className="relative aspect-[16/9] bg-gray-50">
                <Image
                  src={post.heroImage}
                  alt={locale === "en" ? post.heroAlt_en : post.heroAlt_ar}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-3 text-xs text-muted">
                <span className="rounded-full bg-accent/10 px-3 py-1 text-accent-deep">
                  {locale === "en" ? "Buyer's Guide" : "دليل المشتري"}
                </span>
                <span>{post.readTime}</span>
              </div>
              <h2 className="mt-2 text-lg font-semibold leading-snug group-hover:text-accent-deep transition-colors">
                {locale === "en" ? post.title_en : post.title_ar}
              </h2>
              <p className="mt-2 text-sm text-muted line-clamp-2">
                {locale === "en" ? post.intro_en : post.intro_ar}
              </p>
              <p className="mt-3 text-sm font-semibold text-accent-deep">
                {locale === "en" ? "Read guide →" : "اقرأ الدليل ←"}
              </p>
            </div>
          </Link>
        ))}
      </div>

      <div className="rounded-2xl border border-accent/20 bg-[linear-gradient(135deg,_rgba(255,248,235,0.8),_rgba(252,240,220,0.9))] p-6 text-center">
        <p className="text-sm text-muted">
          {locale === "en"
            ? "Need help sourcing authentic tasbih? "
            : "تحتاج مساعدة في مصادر تسابيح أصلية؟ "}
          <Link href={withLocale(locale, "/contact")} className="font-semibold text-accent-deep underline">
            {locale === "en" ? "Request Catalog" : "اطلب الكتالوج"}
          </Link>
        </p>
      </div>
    </div>
  );
}
