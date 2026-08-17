import Link from "next/link";
import { notFound } from "next/navigation";

import { noonRetailProducts } from "@/src/data/noon-products";
import { getPageMetadata } from "@/src/data/site";
import { PageHero } from "@/src/components/page-hero";
import {
  getNoonMarketLabel,
  getNoonStoreLinks,
  type NoonRetailProduct,
} from "@/src/lib/noon-retail";
import { isWholesaleLocale, withLocale } from "@/src/lib/i18n";
import {
  buildRetailBreadcrumbJsonLd,
  buildRetailItemListJsonLd,
  serializeJsonLd,
} from "@/src/lib/seo";

type ProductCategory = {
  id: string;
  label: string;
  products: NoonRetailProduct[];
};

const beadCountRules = [
  { id: "33-beads", label: "33 beads", labelAr: "33 حبة", test: /\b33\s*(?:beads?|حبة)/i },
  { id: "99-beads", label: "99 beads", labelAr: "99 حبة", test: /\b99\s*(?:beads?|حبة)/i },
] as const;

function slugifyCategory(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getMaterialCategory(product: NoonRetailProduct, locale: "en" | "ar") {
  return {
    id: slugifyCategory(product.material.en) || "other-materials",
    label: product.material[locale],
  };
}

function getBeadCountCategory(product: NoonRetailProduct, locale: "en" | "ar") {
  const searchable = [
    product.title.en,
    product.title.ar,
    product.summary.en,
    product.summary.ar,
    ...(product.tags ?? []).flatMap((tag) => [tag.en, tag.ar]),
  ].join(" ");
  const match = beadCountRules.find((category) => category.test.test(searchable));

  if (!match) {
    return {
      id: "other-counts",
      label: locale === "en" ? "Other counts" : "أعداد أخرى",
    };
  }

  return {
    id: match.id,
    label: locale === "en" ? match.label : match.labelAr,
  };
}

function groupProducts(
  products: NoonRetailProduct[],
  getCategory: (product: NoonRetailProduct) => { id: string; label: string },
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
  product: NoonRetailProduct;
}) {
  const material = getMaterialCategory(product, locale).label;
  const beadCount = getBeadCountCategory(product, locale).label;

  return (
    <article
      id={product.slug}
      className="group scroll-mt-28 overflow-hidden rounded-[1.5rem] border border-border/70 bg-white/80 shadow-[0_16px_36px_rgba(40,28,17,0.08)]"
    >
      <div className="relative overflow-hidden bg-[#eee3d1]">
        <img
          src={product.heroImage}
          alt={product.title[locale]}
          className="aspect-[4/3] w-full object-cover object-[center_40%] transition duration-500 group-hover:scale-105"
        />
      </div>
      <div className="space-y-4 p-5">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-accent-deep">
            {material} / {beadCount}
          </p>
          <h3 className="noor-title mt-2 text-3xl leading-tight">
            {product.title[locale]}
          </h3>
          <p className="mt-3 text-sm leading-7 text-muted">
            {product.summary[locale]}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 pt-1">
          {product.retailLinks.noonUae ? (
            <a
              href={product.retailLinks.noonUae}
              target="_blank"
              rel="noreferrer"
              className="latin-ui rounded-full bg-[#1f1a15] px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-deep"
            >
              Buy on Noon UAE
            </a>
          ) : null}
          {product.retailLinks.noonSaudi ? (
            <a
              href={product.retailLinks.noonSaudi}
              target="_blank"
              rel="noreferrer"
              className="latin-ui rounded-full bg-[#1f1a15] px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-deep"
            >
              Buy on Noon Saudi
            </a>
          ) : null}
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

export async function generateMetadata({ params }: PageProps<"/[locale]/noon">) {
  const { locale } = await params;

  if (!isWholesaleLocale(locale)) {
    return {};
  }

  return getPageMetadata(
    locale,
    "noon",
    locale === "en"
      ? "Shop TranquilBeads on Noon UAE and Saudi"
      : "تسوق TranquilBeads على نون الإمارات والسعودية",
  );
}

export default async function NoonRetailPage({
  params,
}: PageProps<"/[locale]/noon">) {
  const { locale } = await params;

  if (!isWholesaleLocale(locale)) {
    notFound();
  }

  const storeLinks = getNoonStoreLinks();
  const materialCategories = groupProducts(noonRetailProducts, (product) =>
    getMaterialCategory(product, locale),
  );
  const beadCountCategories = groupProducts(noonRetailProducts, (product) =>
    getBeadCountCategory(product, locale),
  );
  const retailItemListJsonLd = buildRetailItemListJsonLd(
    locale,
    "/noon",
    locale === "en"
      ? "TranquilBeads Noon retail catalog"
      : "كتالوج TranquilBeads على نون",
    noonRetailProducts.map((product) => ({
      slug: product.slug,
      title: product.title[locale],
      heroImage: product.heroImage,
      markets: product.markets.map((market) => getNoonMarketLabel(market, locale)),
    })),
  );
  const retailBreadcrumbJsonLd = buildRetailBreadcrumbJsonLd(
    locale,
    "/noon",
    locale === "en" ? "Noon Retail" : "نون للتجزئة",
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
        eyebrow={locale === "en" ? "Noon UAE & Saudi" : "نون الإمارات والسعودية"}
        title={
          locale === "en"
            ? "Shop TranquilBeads on Noon"
            : "تسوق TranquilBeads على نون"
        }
        description={
          locale === "en"
            ? "Selected TranquilBeads products now have direct Buy on Noon options for UAE and Saudi shoppers. Retail customers can buy regionally through Noon, while distributors can still request catalog pricing and wholesale support here."
            : "تملك منتجات مختارة من TranquilBeads خيارات شراء مباشرة عبر نون الإمارات والسعودية. يمكن لعملاء التجزئة الشراء إقليميًا عبر نون، بينما يستطيع الموزعون طلب كتالوج وأسعار الجملة من هنا."
        }
        actions={
          <>
            <a
              href={storeLinks.uae}
              target="_blank"
              rel="noreferrer"
              className="latin-ui rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-deep"
            >
              Buy on Noon UAE
            </a>
            <a
              href={storeLinks.saudi}
              target="_blank"
              rel="noreferrer"
              className="latin-ui rounded-full border border-accent/35 px-6 py-3 text-sm font-semibold text-accent-deep transition hover:bg-accent/10"
            >
              Buy on Noon Saudi
            </a>
          </>
        }
      />

      <section className="noor-container">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="noor-kicker text-xs font-semibold text-accent-deep">
              {locale === "en" ? "Organized Noon catalog" : "كتالوج نون منظم"}
            </p>
            <h2 className="noor-title mt-2 text-4xl">
              {locale === "en" ? "Browse by material and bead count" : "تصفح حسب الخامة وعدد الخرز"}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
              {locale === "en"
                ? "Noon products are grouped by their first image, then arranged by material with quick bead-count paths for retail shoppers in the UAE and Saudi Arabia."
                : "تُدمج منتجات نون حسب الصورة الأولى ثم تُرتب حسب الخامة مع مسارات سريعة لعدد الخرز لعملاء الإمارات والسعودية."}
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
              aria-label={locale === "en" ? "Noon catalog sections" : "أقسام كتالوج نون"}
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
                      {category.products.length} {locale === "en" ? "Noon options" : "خيارًا على نون"}
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

            <section className="space-y-5" aria-labelledby="noon-bead-count-heading">
              <div>
                <p className="noor-kicker text-xs font-semibold text-accent-deep">
                  {locale === "en" ? "Bead count index" : "فهرس عدد الخرز"}
                </p>
                <h3 id="noon-bead-count-heading" className="noor-title mt-2 text-3xl">
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
                          {product.material[locale]}
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
