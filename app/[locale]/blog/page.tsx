import Link from "next/link";
import Image from "next/image";
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
    title: {
      en: "How to Identify Real Amber Tasbih vs Fake",
      ar: "كيفية التعرف على السبح الكهرماني الحقيقي مقابل المزيف",
    },
    description: {
      en: "5 practical tests wholesale buyers can do in 2 minutes to verify amber authenticity.",
      ar: "5 اختبارات عملية يمكن لمشتري الجملة إجراؤها في دقيقتين للتحقق من أصالة الكهرمان.",
    },
    readTime: { en: "5 min read", ar: "5 دقائق للقراءة" },
    category: { en: "Buyer's Guide", ar: "دليل المشتري" },
    heroImage: "/images/real-products/baltic-amber/hero.jpeg",
    altImage: { en: "Real Baltic amber tasbih beads", ar: "خرزات سبح كهرماني بلطيقي أصلي" },
  },
  {
    slug: "kuka-wood-tasbih-authenticity-guide",
    title: {
      en: "Kuka Wood Tasbih: How to Verify Quality",
      ar: "سبحان خشب الكوكا: كيفية التحقق من الجودة",
    },
    description: {
      en: "Three key checks for kuka wood quality: grain, weight, and scent.",
      ar: "ثلاثة فحوصات رئيسية لجودة خشب الكوكا: الحبوب والوزن والرائحة.",
    },
    readTime: { en: "6 min read", ar: "6 دقائق للقراءة" },
    category: { en: "Buyer's Guide", ar: "دليل المشتري" },
    heroImage: "/images/real-products/natural-kuka-wood/hero.jpeg",
    altImage: { en: "Natural kuka wood tasbih", ar: "سبحان خشب كوكا طبيعي" },
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
            <div className="overflow-hidden rounded-2xl border border-border/60">
              <div className="relative aspect-[16/9] bg-gray-50">
                <Image
                  src={post.heroImage}
                  alt={post.altImage[locale]}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-3 text-xs text-muted">
                <span className="rounded-full bg-accent/10 px-3 py-1 text-accent-deep">{post.category[locale]}</span>
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
