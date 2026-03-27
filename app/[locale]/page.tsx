import Link from "next/link";
import { notFound } from "next/navigation";

import {
  collections,
  getPageCopy,
  getPageMetadata,
  getProductBySlug,
  getProductsByCollection,
  siteSettings,
} from "@/src/data/site";
import { CollectionCard } from "@/src/components/collection-card";
import { PageHero } from "@/src/components/page-hero";
import { getDir, isLocale, withLocale } from "@/src/lib/i18n";

// Top 5 products data from sales analysis (1688 data, March 2026)
const topProducts = [
  {
    slug: "natural-kuka-wood-tasbih",
    collection: "signature-tasbih",
    rank: "1",
    sales30d: 220,
    totalSales: 783,
    rating: 4.8,
    moq: "100 pcs",
    tag: locale => locale === "en" ? "🔥 Top Seller" : "🔥 الأكثر مبيعًا",
    category: { en: "Men's Beads", ar: "خرز رجالي" },
  },
  {
    slug: "golden-hematite-medallion-tasbih",
    collection: "signature-tasbih",
    rank: "2",
    sales30d: 96,
    totalSales: 357,
    rating: 4.69,
    moq: "100 pcs",
    tag: locale => locale === "en" ? "🔥 Top Seller" : "🔥 الأكثر مبيعًا",
    category: { en: "Premium Tasbih", ar: "مسبحة فاخرة" },
  },
  {
    slug: "lacquer-art-33-bead-tasbih",
    collection: "signature-tasbih",
    rank: "3",
    sales30d: 81,
    totalSales: 235,
    rating: 4.4,
    moq: "100 pcs",
    tag: locale => locale === "en" ? "Bestseller" : "الأكثر مبيعًا",
    category: { en: "Giftable Tasbih", ar: "مسبحة مناسبة للهدايا" },
  },
  {
    slug: "terahertz-road-safety-pendant",
    collection: "cultural-accents",
    rank: "4",
    sales30d: 46,
    totalSales: 105,
    rating: 4.69,
    moq: "100 pcs",
    tag: locale => locale === "en" ? "Hot" : "ساخن",
    category: { en: "Car Accessories", ar: "إكسسوارات السيارة" },
  },
  {
    slug: "baltic-amber-gift-set",
    collection: "gift-sets",
    rank: "5",
    sales30d: 35,
    totalSales: 107,
    rating: 5.0,
    moq: "100 pcs",
    tag: locale => locale === "en" ? "New" : "جديد",
    category: { en: "Gift Sets", ar: "مجموعات هدايا" },
  },
];

// Trust metrics data
const trustMetrics = [
  {
    value: "50,000+",
    label: { en: "Monthly Capacity (pcs)", ar: "الطاقة الشهرية (قطعة)" },
    icon: "🏭",
  },
  {
    value: "5+",
    label: { en: "Years in Production", ar: "سنوات في الإنتاج" },
    icon: "📅",
  },
  {
    value: "35%",
    label: { en: "Repeat Order Rate", ar: "معدل إعادة الطلب" },
    icon: "🔄",
  },
  {
    value: "100%",
    label: { en: "QC Inspected", ar: "فحص جودة 100%" },
    icon: "✅",
  },
];

// Procurement-friendly collection categories
const procurementCategories = [
  {
    name: { en: "Bestsellers", ar: "الأكثر مبيعًا" },
    description: { en: "Top performers by actual sales data", ar: "الأفضل أداءً حسب بيانات المبيعات الفعلية" },
    icon: "🔥",
    href: "/collections/signature-tasbih",
    color: "from-amber-50 to-orange-50",
  },
  {
    name: { en: "Car Accessories", ar: "إكسسوارات السيارة" },
    description: { en: "Rearview hanging tasbih & worry beads", ar: "تسابيح تعليق المرآة وإكسسوارات السيارة" },
    icon: "🚗",
    href: "/collections/signature-tasbih",
    color: "from-blue-50 to-cyan-50",
  },
  {
    name: { en: "Gift-Ready Sets", ar: "مجموعات جاهزة للإهداء" },
    description: { en: "Premium packaging, bilingual labels", ar: "تغليف فاخر، ملصقات ثنائية اللغة" },
    icon: "🎁",
    href: "/collections/gift-sets",
    color: "from-pink-50 to-rose-50",
  },
  {
    name: { en: "By Material", ar: "حسب الخامة" },
    description: { en: "Amber, Kuka wood, Agate, Oud & more", ar: "كهرماني، خشب الكوكا، عقيق، عود والمزيد" },
    icon: "💎",
    href: "/collections/signature-tasbih",
    color: "from-emerald-50 to-teal-50",
  },
];

// Factory photos (generated + real)
const factoryPhotos = [
  { src: "/images/factory-packaging.jpg", label: { en: "Quality Packaging", ar: "تغليف الجودة" } },
  { src: "/images/factory-production.jpg", label: { en: "Production Line", ar: "خط الإنتاج" } },
  { src: "/images/factory-shipping.jpg", label: { en: "Export Ready", ar: "جاهز للتصدير" } },
];

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
  const rankedProducts = topProducts
    .map((entry) => {
      const product = getProductBySlug(entry.slug);
      if (!product || product.collection !== entry.collection) {
        return null;
      }

      return {
        ...entry,
        product,
      };
    })
    .filter((entry) => entry !== null);

  return (
    <div className="space-y-14 pt-6 md:space-y-20">
      {/* ── Hero ─────────────────────────────────────────────── */}
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

      {/* ── Trust Module ─────────────────────────────────────── */}
      <section className="noor-container">
        <div className="rounded-[2rem] border border-border/70 bg-white px-6 py-8 shadow-[0_8px_32px_rgba(40,28,17,0.08)] md:px-8">
          <div className="mb-6">
            <p className="noor-kicker text-xs font-semibold text-accent-deep">
              {locale === "en" ? "Trusted by partners across 12+ markets" : "موثوق به من شركاء في أكثر من 12 سوقًا"}
            </p>
            <h2 className="noor-title mt-2 text-3xl">
              {locale === "en"
                ? "Built for wholesale confidence"
                : "مصمم لثقة الجملة"}
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {trustMetrics.map((metric) => (
              <div
                key={metric.value}
                className="rounded-2xl border border-border/60 bg-[linear-gradient(140deg,_rgba(255,251,245,0.7),_rgba(245,238,222,0.7))] p-5 text-center"
              >
                <p className="text-3xl">{metric.icon}</p>
                <p className="noor-title mt-2 text-3xl text-accent-deep">
                  {metric.value}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {metric.label[locale]}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            {[
              { en: "🔬 Jewelry Certificate Available (Amber & Coral)", ar: "🔬 شهادة مجوهرات متاحة (كهرماني وخ-corals)" },
              { en: "📦 Private Label Packaging Supported", ar: "📦 تغليف خاص بالعلامة التجارية مدعوم" },
              { en: "🚢 Average 21-Day Lead Time", ar: "🚢 متوسط وقت التسليم 21 يومًا" },
            ].map((item) => (
              <div
                key={item.en}
                className="rounded-full border border-accent/25 bg-accent/5 px-4 py-2 text-xs text-accent-deep"
              >
                {locale === "en" ? item.en.split(" ")[0] + " " + item.en.split(" ").slice(1).join(" ") : item.ar}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Top 5 Bestsellers ────────────────────────────────── */}
      <section className="noor-container space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="noor-kicker text-xs font-semibold text-accent-deep">
              {locale === "en" ? "Based on real sales data" : "بناءً على بيانات المبيعات الفعلية"}
            </p>
            <h2 className="noor-title mt-2 text-4xl">
              {locale === "en" ? "🔥 Hot Products This Season" : "🔥 المنتجات الأكثر طلبًا هذا الموسم"}
            </h2>
          </div>
          <Link
            href={withLocale(locale, "/collections")}
            className="text-sm font-semibold text-accent-deep"
          >
            {locale === "en" ? "View all →" : "عرض الكل ←"}
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {rankedProducts.map((entry) => (
            <Link
              key={entry.rank}
              href={withLocale(
                locale,
                `/collections/${entry.collection}/${entry.slug}`,
              )}
              className="group relative overflow-hidden rounded-2xl border border-border/70 bg-white transition-shadow hover:shadow-lg"
            >
              {/* Rank badge */}
              <div className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-full bg-accent px-2 py-1 text-xs font-bold text-white shadow">
                #{entry.rank}
              </div>

              {/* Product image */}
              <div className="aspect-square overflow-hidden bg-gray-50">
                <img
                  src={entry.product.image}
                  alt={entry.product.title[locale]}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>

              {/* Info */}
              <div className="p-3">
                <p className="text-xs text-muted">{entry.category[locale]}</p>
                <p className="mt-1 text-sm font-semibold line-clamp-2">
                  {entry.product.title[locale]}
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                  <span className="rounded bg-accent/10 px-1.5 py-0.5 text-accent-deep">
                    ⭐ {entry.rating}
                  </span>
                  <span>MOQ {entry.moq}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="font-medium text-accent-deep">
                    {entry.sales30d}+ / 30d
                  </span>
                  <span className="text-muted">
                    Total: {entry.totalSales}+
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="rounded-2xl border border-accent/20 bg-[linear-gradient(135deg,_rgba(255,248,235,0.8),_rgba(252,240,220,0.9))] p-5">
          <p className="text-sm text-muted">
            {locale === "en"
              ? "📊 Sales data from 1688.com, March 2026. Each product ships with MOQ 100 pcs and supports private label packaging."
              : "📊 بيانات المبيعات من 1688.com، مارس 2026. كل منتج يشحن بـ موك 100 قطعة ويدعم التغليف الخاص."}
          </p>
        </div>
      </section>

      {/* ── Collections by Procurement Logic ─────────────────── */}
      <section className="noor-container space-y-6">
        <div>
          <p className="noor-kicker text-xs font-semibold text-accent-deep">
            {locale === "en" ? "Shop by purpose" : "تسوّق حسب الغرض"}
          </p>
          <h2 className="noor-title mt-2 text-4xl">
            {locale === "en"
              ? "Find products by procurement category"
              : "ابحث عن المنتجات حسب فئة الشراء"}
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {procurementCategories.map((cat) => (
            <Link
              key={cat.name.en}
              href={withLocale(locale, cat.href)}
              className={`group relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br ${cat.color} p-5 transition-transform hover:-translate-y-0.5 hover:shadow-md`}
            >
              <p className="text-3xl">{cat.icon}</p>
              <p className="mt-3 font-semibold text-foreground">
                {cat.name[locale]}
              </p>
              <p className="mt-1 text-xs text-muted line-clamp-2">
                {cat.description[locale]}
              </p>
              <p className="mt-3 text-xs font-semibold text-accent-deep">
                {locale === "en" ? "Browse →" : "تصفح ←"}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 3-column value props ──────────────────────────────── */}
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

      {/* ── Featured Collections ──────────────────────────────── */}
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
              href={withLocale(locale, `/collections/${collection.slug}`)}
              ctaLabel={locale === "en" ? "Explore collection" : "استعرض المجموعة"}
            />
          ))}
        </div>
      </section>

      {/* ── Product Range Thumbnail Grid ──────────────────────── */}
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

      {/* ── Factory & Real Content ────────────────────────────── */}
      <section className="noor-container space-y-6">
        <div>
          <p className="noor-kicker text-xs font-semibold text-accent-deep">
            {locale === "en" ? "Behind the product" : "وراء المنتج"}
          </p>
          <h2 className="noor-title mt-2 text-4xl">
            {locale === "en"
              ? "From production to your shelf"
              : "من الإنتاج إلى رفك"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            {locale === "en"
              ? "We control every step: bead selection, stringing, QC inspection, packaging, and export logistics — all under one roof."
              : "نتحكم في كل خطوة: اختيار الخرز،编织، فحص الجودة، التغليف،后勤 التصدير — كل ذلك في مكان واحد."}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {factoryPhotos.map((photo) => (
            <div key={photo.src} className="group relative overflow-hidden rounded-2xl border border-border/60">
              <img
                src={photo.src}
                alt={photo.label[locale]}
                className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                <p className="text-sm font-medium text-white">
                  {photo.label[locale]}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-accent/20 bg-[linear-gradient(135deg,_rgba(255,248,235,0.8),_rgba(252,240,220,0.9))] p-5">
          <p className="text-sm text-muted">
            {locale === "en"
              ? "Every shipment includes QC photos before dispatch. Amber and coral items come with jewelry certificates upon request."
              : "كل شحنة تتضمن صور فحص الجودة قبل الإرسال. العناصر الكهرمانية والمرجانية تأتي مع شهادات مجوهرات عند الطلب."}
          </p>
        </div>
      </section>

      {/* ── Wholesale CTA ─────────────────────────────────────── */}
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
