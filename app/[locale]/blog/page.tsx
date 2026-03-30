import Link from "next/link";
import { notFound } from "next/navigation";

import { isLocale, withLocale } from "@/src/lib/i18n";

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

const blogPosts = [
  {
    slug: "how-to-identify-real-amber-tasbih",
    title: { en: "How to Identify Real Amber Tasbih vs Fake", ar: "كيفية التعرف على السبح الكهرماني الحقيقي مقابل المزيف" },
    description: { en: "Amber tasbih commands premium pricing — but fakes are everywhere. Learn the 5 tests wholesale buyers can do in 2 minutes.", ar: "تحظى السباح الكهرمانية بسعر متميز — لكن المزيفات منتشرة. تعلم 5 اختبارات في دقيقتين." },
    readTime: { en: "5 min read", ar: "5 دقائق للقراءة" },
    category: { en: "Buyer's Guide", ar: "دليل المشتري" },
    icon: "🟡",
  },
  {
    slug: "kuka-wood-tasbih-authenticity-guide",
    title: { en: "Kuka Wood Tasbih: How to Verify Quality", ar: "سبحان خشب الكوكا: كيفية التحقق من الجودة" },
    description: { en: "Kuka wood tasbih is one of the most counterfeited prayer beads. Three key checks: grain, weight, and scent.", ar: "سبحان خشب الكوكا من أكثر السباح المقلدة. ثلاثة فحوصات رئيسية: الحبوب والوزن والرائحة." },
    readTime: { en: "6 min read", ar: "6 دقائق للقراءة" },
    category: { en: "Buyer's Guide", ar: "دليل المشتري" },
    icon: "🪵",
  },
];

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
            ? "Practical authentication guides for wholesale tasbih buyers. Know what you're sourcing — every time."
            : "أدلة التحقق العملي لمشتري التسابيح بالجملة. اعرف ما تطلبه في كل مرة."}
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {blogPosts.map((post) => (
          <Link
            key={post.slug}
            href={withLocale(locale, `/blog/${post.slug}`)}
            className="group space-y-4"
          >
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-gray-50">
              <div className="aspect-[16/9] flex items-center justify-center bg-gradient-to-br from-amber-100 to-amber-50">
                <span className="text-6xl opacity-40">{post.icon}</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-3 text-xs text-muted">
                <span className="rounded-full bg-accent/10 px-3 py-1 text-accent-deep">{post.category[locale]}</span>
                <span>{post.publishedAt}</span>
                <span>{post.readTime[locale]}</span>
              </div>
              <h2 className="mt-2 text-xl font-semibold group-hover:text-accent-deep transition-colors">{post.title[locale]}</h2>
              <p className="mt-2 text-sm text-muted line-clamp-2">{post.description[locale]}</p>
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
