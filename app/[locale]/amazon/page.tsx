import Link from "next/link";
import { notFound } from "next/navigation";

import { amazonRetailProducts } from "@/src/data/amazon-products";
import { getPageMetadata } from "@/src/data/site";
import { PageHero } from "@/src/components/page-hero";
import {
  amazonMarkets,
  getAmazonSearchLinks,
  type AmazonRetailProduct,
} from "@/src/lib/amazon-retail";
import { isLocale, withLocale } from "@/src/lib/i18n";
import {
  buildRetailBreadcrumbJsonLd,
  buildRetailItemListJsonLd,
  serializeJsonLd,
} from "@/src/lib/seo";

type ProductCategory = {
  id: string;
  label: string;
  products: AmazonRetailProduct[];
};

const materialCategoryRules = [
  { id: "amber", label: "Amber", test: /amber|bernstein/i },
  { id: "hematite", label: "Hematite", test: /hematite|hämatit/i },
  { id: "kuka-wood", label: "Kuka wood", test: /kuka|wood|holz/i },
  { id: "agate", label: "Agate", test: /agate|achat/i },
  { id: "coral-look", label: "Coral look", test: /coral|korallen/i },
  { id: "glass", label: "Glass and glow", test: /glass|luminous|glow/i },
  { id: "stone-style", label: "Stone style", test: /amazonit|aurora|crystal|stone/i },
] as const;

const beadCountRules = [
  { id: "33-beads", label: "33 beads", test: /\b33\s*(?:beads?|perlen)/i },
  { id: "45-beads", label: "45 beads", test: /\b45\s*(?:beads?|perlen)/i },
  { id: "99-beads", label: "99 beads", test: /\b99\s*(?:beads?|perlen)/i },
] as const;

function getMaterialCategory(product: AmazonRetailProduct) {
  return (
    materialCategoryRules.find((category) => category.test.test(product.title)) ?? {
      id: "other-materials",
      label: "Other materials",
    }
  );
}

function getBeadCountCategory(product: AmazonRetailProduct) {
  return (
    beadCountRules.find((category) => category.test.test(product.title)) ?? {
      id: "other-counts",
      label: "Other counts",
    }
  );
}

function groupProducts(
  products: AmazonRetailProduct[],
  getCategory: (product: AmazonRetailProduct) => { id: string; label: string },
) {
  const categoryMap = new Map<string, ProductCategory>();

  for (const product of products) {
    const category = getCategory(product);
    const existing = categoryMap.get(category.id);

    if (existing) {
      existing.products.push(product);
      continue;
    }

    categoryMap.set(category.id, {
      id: category.id,
      label: category.label,
      products: [product],
    });
  }

  return Array.from(categoryMap.values()).sort(
    (first, second) => second.products.length - first.products.length,
  );
}

function ProductCard({
  locale,
  product,
}: {
  locale: "en" | "ar";
  product: AmazonRetailProduct;
}) {
  const material = getMaterialCategory(product).label;
  const beadCount = getBeadCountCategory(product).label;

  return (
    <article
      id={product.slug}
      className="group scroll-mt-28 overflow-hidden rounded-[1.5rem] border border-border/70 bg-white/80 shadow-[0_16px_36px_rgba(40,28,17,0.08)]"
    >
      <div className="relative overflow-hidden bg-[#eee3d1]">
        <img
          src={product.heroImage}
          alt={product.title}
          className="aspect-[4/3] w-full object-cover object-[center_40%] transition duration-500 group-hover:scale-105"
        />
      </div>
      <div className="space-y-4 p-5">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-accent-deep">
            {material} / {beadCount} / ASIN {product.asin}
          </p>
          <h3 className="noor-title mt-2 line-clamp-3 text-2xl leading-tight">
            {product.title}
          </h3>
        </div>
        <div className="flex flex-wrap gap-3 pt-1">
          {product.markets.map((market) => {
            const href = product.retailLinks[market];
            if (!href) return null;

            return (
              <a
                key={market}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="latin-ui rounded-full bg-[#1f1a15] px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-deep"
              >
                Buy on Amazon {market}
              </a>
            );
          })}
          <Link
            href={withLocale(locale, "/contact")}
            className="rounded-full border border-accent/30 px-4 py-2 text-sm font-semibold text-accent-deep transition hover:bg-accent/10"
          >
            {locale === "en" ? "Ask wholesale" : "اسأل عن الجملة"}
          </Link>
        </div>
      </div>
    </article>
  );
}

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "ar" }];
}

export async function generateMetadata({ params }: PageProps<"/[locale]/amazon">) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    return {};
  }

  return getPageMetadata(
    locale,
    "amazon",
    locale === "en"
      ? "Buy TranquilBeads on Amazon Gulf and Europe"
      : "تسوق TranquilBeads على أمازون الخليج وأوروبا",
  );
}

export default async function AmazonRetailPage({
  params,
}: PageProps<"/[locale]/amazon">) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const searchLinks = getAmazonSearchLinks();
  const materialCategories = groupProducts(amazonRetailProducts, getMaterialCategory);
  const beadCountCategories = groupProducts(amazonRetailProducts, getBeadCountCategory);
  const retailItemListJsonLd = buildRetailItemListJsonLd(
    locale,
    "/amazon",
    locale === "en"
      ? "TranquilBeads Amazon retail catalog"
      : "كتالوج TranquilBeads على أمازون",
    amazonRetailProducts,
  );
  const retailBreadcrumbJsonLd = buildRetailBreadcrumbJsonLd(
    locale,
    "/amazon",
    locale === "en" ? "Amazon Retail" : "أمازون للتجزئة",
  );

  return (
    <div className="space-y-12 pt-8 md:space-y-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(retailItemListJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(retailBreadcrumbJsonLd) }}
      />
      <PageHero
        eyebrow={locale === "en" ? "Amazon Gulf & Europe" : "أمازون الخليج وأوروبا"}
        title={
          locale === "en"
            ? "Buy TranquilBeads on Amazon"
            : "تسوق TranquilBeads على أمازون"
        }
        description={
          locale === "en"
            ? "Selected TranquilBeads Amazon products are grouped by their first image so shoppers see one clean product card with Gulf options and Germany-synced European buy links."
            : "تجمع منتجات TranquilBeads المختارة على أمازون حسب الصورة الأولى حتى يرى المتسوق بطاقة واضحة واحدة مع خيارات الخليج وروابط أوروبا المتزامنة من ألمانيا."
        }
        actions={
          <>
            {amazonMarkets.map((market, index) => (
              <a
                key={market}
                href={searchLinks[market]}
                target="_blank"
                rel="noreferrer"
                className={`latin-ui rounded-full px-6 py-3 text-sm font-semibold transition ${
                  index === 0
                    ? "bg-accent text-white hover:bg-accent-deep"
                    : "border border-accent/35 text-accent-deep hover:bg-accent/10"
                }`}
              >
                Buy on Amazon {market}
              </a>
            ))}
          </>
        }
      />

      <section id="amazon-products" className="noor-container">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="noor-kicker text-xs font-semibold text-accent-deep">
              {locale === "en" ? "Organized Amazon catalog" : "كتالوج أمازون منظم"}
            </p>
            <h2 className="noor-title mt-2 text-4xl">
              {locale === "en" ? "Browse by material and bead count" : "تصفح حسب الخامة وعدد الخرز"}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
              {locale === "en"
                ? "Amazon listings are grouped by first image, then organized into practical material sections. Bead-count links below help buyers jump to 33, 45, and 99 bead formats without losing the regional Amazon buy options."
                : "تُدمج قوائم أمازون حسب الصورة الأولى ثم تُنظم حسب الخامة. تساعد روابط عدد الخرز المشترين على الوصول إلى صيغ 33 و45 و99 خرزة مع بقاء خيارات الشراء الإقليمية."}
            </p>
          </div>
          <Link
            href={withLocale(locale, "/contact")}
            className="rounded-full border border-accent/30 px-5 py-3 text-sm font-semibold text-accent-deep transition hover:bg-accent/10"
          >
            {locale === "en" ? "Wholesale inquiry" : "طلب جملة"}
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <nav
              aria-label={locale === "en" ? "Amazon catalog sections" : "أقسام كتالوج أمازون"}
              className="rounded-[1.5rem] border border-border/70 bg-white/75 p-5 shadow-[0_14px_30px_rgba(40,28,17,0.08)]"
            >
              <p className="noor-kicker text-xs font-semibold text-accent-deep">
                {locale === "en" ? "Jump to" : "انتقل إلى"}
              </p>
              <div className="mt-4 space-y-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-muted">
                    {locale === "en" ? "Materials" : "الخامات"}
                  </p>
                  <div className="mt-3 grid gap-2">
                    {materialCategories.map((category) => (
                      <a
                        key={category.id}
                        href={`#material-${category.id}`}
                        className="flex items-center justify-between rounded-full border border-border/70 bg-background-soft px-4 py-2 text-sm font-semibold text-foreground transition hover:border-accent/35 hover:bg-accent/8"
                      >
                        <span>{category.label}</span>
                        <span className="text-xs text-muted">{category.products.length}</span>
                      </a>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-muted">
                    {locale === "en" ? "Bead counts" : "عدد الخرز"}
                  </p>
                  <div className="mt-3 grid gap-2">
                    {beadCountCategories.map((category) => (
                      <a
                        key={category.id}
                        href={`#count-${category.id}`}
                        className="flex items-center justify-between rounded-full border border-border/70 px-4 py-2 text-sm font-semibold text-accent-deep transition hover:border-accent/35 hover:bg-accent/8"
                      >
                        <span>{category.label}</span>
                        <span className="text-xs text-muted">{category.products.length}</span>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </nav>
          </aside>

          <div className="space-y-12">
            <div className="space-y-10">
              {materialCategories.map((category) => (
                <section
                  key={category.id}
                  id={`material-${category.id}`}
                  className="scroll-mt-28 space-y-4"
                >
                  <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/70 pb-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-accent-deep">
                        {locale === "en" ? "Material" : "الخامة"}
                      </p>
                      <h3 className="noor-title mt-1 text-3xl">{category.label}</h3>
                    </div>
                    <p className="text-sm text-muted">
                      {category.products.length} {locale === "en" ? "Amazon options" : "خيارًا على أمازون"}
                    </p>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {category.products.map((product) => (
                      <ProductCard key={product.slug} locale={locale} product={product} />
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <section className="space-y-5" aria-labelledby="bead-count-heading">
              <div>
                <p className="noor-kicker text-xs font-semibold text-accent-deep">
                  {locale === "en" ? "Bead count index" : "فهرس عدد الخرز"}
                </p>
                <h3 id="bead-count-heading" className="noor-title mt-2 text-3xl">
                  {locale === "en" ? "Quick paths by count" : "مسارات سريعة حسب العدد"}
                </h3>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {beadCountCategories.map((category) => (
                  <div
                    key={category.id}
                    id={`count-${category.id}`}
                    className="scroll-mt-28 rounded-[1.35rem] border border-border/70 bg-white/70 p-5"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <h4 className="noor-title text-2xl">{category.label}</h4>
                      <span className="text-sm text-muted">{category.products.length}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {category.products.slice(0, 12).map((product) => (
                        <a
                          key={product.slug}
                          href={`#${product.slug}`}
                          className="rounded-full border border-accent/25 px-3 py-1.5 text-xs font-semibold text-accent-deep transition hover:bg-accent/8"
                        >
                          {product.asin}
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}
