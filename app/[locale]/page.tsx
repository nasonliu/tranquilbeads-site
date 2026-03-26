import Link from "next/link";
import { notFound } from "next/navigation";

import { collections, getPageCopy, getPageMetadata, getProductsByCollection, siteSettings } from "@/src/data/site";
import { CollectionCard } from "@/src/components/collection-card";
import { PageHero } from "@/src/components/page-hero";
import { getDir, isLocale, withLocale } from "@/src/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    return {};
  }

  return getPageMetadata(
    locale,
    "home",
    locale === "en" ? "Premium Tasbih For Wholesale" : "تسابيح راقية لشركاء الجملة",
  );
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const copy = getPageCopy(locale);
  const featuredCollections = collections.filter((item) => item.featured);
  const signatureProducts = getProductsByCollection("signature-tasbih").slice(0, 8);

  return (
    <div className="space-y-14 pt-6 md:space-y-20">
      <PageHero
        eyebrow={copy.hero.eyebrow}
        title={copy.hero.title}
        description={copy.hero.description}
        actions={
          <>
            <Link
              href={withLocale(locale, "/contact")}
              className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-deep"
            >
              {copy.hero.primaryCta}
            </Link>
            <a
              href={siteSettings.whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="latin-ui rounded-full border border-accent/35 px-6 py-3 text-sm font-semibold text-accent-deep transition hover:bg-accent/10"
            >
              {copy.hero.secondaryCta}
            </a>
          </>
        }
        aside={
          <>
            <div className="noor-panel noor-pattern rounded-[1.75rem] p-6">
              <p className="text-xs uppercase tracking-[0.24em] text-accent-deep">
                {copy.hero.featuredLabel}
              </p>
              <div className="mt-5 grid gap-4">
                {siteSettings.socialProof.map((metric) => (
                  <div
                    key={metric.value}
                    className="rounded-[1.2rem] border border-white/60 bg-white/55 p-4"
                  >
                    <p className="noor-title text-4xl text-foreground">{metric.value}</p>
                    <p className="mt-2 text-sm text-muted">{metric.label[locale]}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[1.75rem] border border-accent/20 bg-[#1f1a15] p-6 text-[#efe6d8] shadow-[0_18px_40px_rgba(33,24,16,0.22)]">
              <p className="text-xs uppercase tracking-[0.24em] text-[#c8a06d]">
                {locale === "en" ? "Why distributors stay" : "لماذا يستمر الشركاء"}
              </p>
              <p className="mt-4 text-sm leading-7 text-[#e9dcc8]">
                {copy.hero.metricsIntro}
              </p>
            </div>
          </>
        }
      />

      <section className="noor-container grid gap-6 md:grid-cols-3">
        {[
          locale === "en"
            ? "Curated collections that feel premium on shelf from day one."
            : "مجموعات منسقة تمنح الرف حضورًا فاخرًا من اليوم الأول.",
          locale === "en"
            ? "Bilingual-ready packaging for international, GCC, and cultural retail."
            : "تغليف جاهز باللغتين للأسواق الدولية والخليجية ومتاجر الثقافة.",
          locale === "en"
            ? "Focused assortments that are easy for buyers to understand and reorder."
            : "تشكيلات مركزة يسهل على المشتري فهمها وإعادة طلبها.",
        ].map((item) => (
          <div key={item} className="noor-panel rounded-[1.5rem] p-6 text-sm leading-7 text-muted">
            {item}
          </div>
        ))}
      </section>

      <section className="noor-container space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="noor-kicker text-xs font-semibold text-accent-deep">
              {copy.hero.featuredLabel}
            </p>
            <h2 className="noor-title mt-3 text-4xl">
              {locale === "en"
                ? "Elegant assortments with distributor logic"
                : "تشكيلات أنيقة بمنطق يناسب التوزيع"}
            </h2>
          </div>
          <Link
            href={withLocale(locale, "/collections")}
            className="text-sm font-semibold text-accent-deep"
          >
            {locale === "en" ? "View all collections" : "عرض جميع المجموعات"}
          </Link>
        </div>

        <div className="grid gap-6">
          {featuredCollections.map((collection) => (
            <CollectionCard
              key={collection.slug}
              name={collection.name[locale]}
              description={collection.description[locale]}
              image={collection.heroImage}
              href={withLocale(locale, "/collections")}
              ctaLabel={locale === "en" ? "Explore collection" : "استعرض المجموعة"}
            />
          ))}
        </div>
      </section>

      <section className="noor-container space-y-6">
        <div>
          <p className="noor-kicker text-xs font-semibold text-accent-deep">
            {locale === "en" ? "From the catalog" : "من الكتالوج"}
          </p>
          <h2 className="noor-title mt-3 text-4xl">
            {locale === "en" ? "Browse our product range" : "تصفح مجموعتنا"}
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {signatureProducts.map((product) => (
            <Link
              key={product.slug}
              href={withLocale(locale, `/collections/signature-tasbih/${product.slug}`)}
              className="group space-y-2"
            >
              <div className="overflow-hidden rounded-2xl border border-border/60 bg-white">
                <img
                  src={product.image}
                  alt={product.title[locale]}
                  className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <p className="text-xs font-medium text-muted line-clamp-1">
                {product.title[locale]}
              </p>
              <p className="text-xs text-accent/70 line-clamp-1">
                {product.material[locale]}
              </p>
            </Link>
          ))}
        </div>
        <Link
          href={withLocale(locale, "/collections")}
          className="inline-block rounded-full border border-accent/35 px-6 py-3 text-sm font-semibold text-accent-deep transition hover:bg-accent/10"
        >
          {locale === "en" ? "View all products" : "عرض جميع المنتجات"}
        </Link>
      </section>

      <section className="noor-container">
        <div className="grid gap-6 rounded-[2rem] border border-border/70 bg-[linear-gradient(140deg,_rgba(255,251,245,0.86),_rgba(237,228,214,0.9))] px-6 py-8 shadow-[0_24px_50px_rgba(40,28,17,0.12)] md:grid-cols-[1.1fr_0.9fr] md:px-8">
          <div>
            <p className="noor-kicker text-xs font-semibold text-accent-deep">
              {locale === "en" ? "Wholesale readiness" : "جاهزية الجملة"}
            </p>
            <h2 className="noor-title mt-3 text-4xl">
              {locale === "en"
                ? "Designed for buyers who need confidence, not clutter"
                : "مصمم للمشترين الذين يحتاجون إلى الثقة لا الفوضى"}
            </h2>
          </div>
          <div
            className={`grid gap-3 text-sm leading-7 text-muted ${
              getDir(locale) === "rtl" ? "text-right" : ""
            }`}
          >
            <p>
              {locale === "en"
                ? "Our first-edition catalog keeps the offer sharp: tasbih-led hero products, giftable support items, and packaging options that help teams launch faster."
                : "يحافظ كتالوج الإصدار الأول على عرض مركز: منتجات أساسية من التسابيح، وعناصر داعمة قابلة للإهداء، وخيارات تغليف تساعد الفرق على الإطلاق بسرعة."}
            </p>
            <p>
              {locale === "en"
                ? "You get a cleaner story, simpler reorders, and a website that can be deployed fast on Vercel without dragging in unnecessary commerce complexity."
                : "تحصل على قصة عرض أوضح، وإعادة طلب أسهل، وموقع يمكن نشره بسرعة على Vercel دون تعقيدات تجارة إلكترونية غير ضرورية."}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
