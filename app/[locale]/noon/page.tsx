import Link from "next/link";
import { notFound } from "next/navigation";

import { noonRetailProducts } from "@/src/data/noon-products";
import { getPageMetadata } from "@/src/data/site";
import { PageHero } from "@/src/components/page-hero";
import {
  getNoonMarketLabel,
  getNoonStoreLinks,
  type NoonMarket,
} from "@/src/lib/noon-retail";
import { getDir, isLocale, withLocale } from "@/src/lib/i18n";

const marketBadgeClass: Record<NoonMarket, string> = {
  uae: "border-[#d8b57a]/50 bg-[#fff6e6] text-[#7a5525]",
  saudi: "border-[#7b8a63]/45 bg-[#eef4e7] text-[#526238]",
};

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "ar" }];
}

export async function generateMetadata({ params }: PageProps<"/[locale]/noon">) {
  const { locale } = await params;

  if (!isLocale(locale)) {
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

  if (!isLocale(locale)) {
    notFound();
  }

  const storeLinks = getNoonStoreLinks();
  const isRtl = getDir(locale) === "rtl";

  return (
    <div className="space-y-12 pt-8 md:space-y-16">
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
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="noor-kicker text-xs font-semibold text-accent-deep">
              {locale === "en" ? "Deduped retail catalog" : "كتالوج تجزئة مدمج"}
            </p>
            <h2 className="noor-title mt-2 text-4xl">
              {locale === "en" ? "Available through Noon" : "متاح عبر نون"}
            </h2>
          </div>
          <Link
            href={withLocale(locale, "/contact")}
            className="rounded-full border border-accent/30 px-5 py-3 text-sm font-semibold text-accent-deep transition hover:bg-accent/10"
          >
            {locale === "en" ? "Wholesale inquiry" : "طلب جملة"}
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {noonRetailProducts.map((product) => (
            <article
              key={product.slug}
              className="group overflow-hidden rounded-[1.75rem] border border-border/70 bg-white/80 shadow-[0_16px_36px_rgba(40,28,17,0.08)]"
            >
              <div className="relative overflow-hidden bg-[#eee3d1]">
                <img
                  src={product.heroImage}
                  alt={product.title[locale]}
                  className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div
                  className={`absolute left-4 top-4 flex flex-wrap gap-2 ${
                    isRtl ? "right-4 left-auto justify-end" : ""
                  }`}
                >
                  {product.markets.map((market) => (
                    <span
                      key={market}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${marketBadgeClass[market]}`}
                    >
                      {getNoonMarketLabel(market, locale)}
                    </span>
                  ))}
                </div>
              </div>
              <div className="space-y-4 p-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-accent-deep">
                    {product.material[locale]}
                  </p>
                  <h3 className="noor-title mt-2 text-3xl leading-tight">
                    {product.title[locale]}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-muted">
                    {product.summary[locale]}
                  </p>
                </div>
                {product.tags?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {product.tags.map((tag) => (
                      <span
                        key={tag.en}
                        className="rounded-full border border-border/70 bg-background-soft px-3 py-1 text-xs text-muted"
                      >
                        {tag[locale]}
                      </span>
                    ))}
                  </div>
                ) : null}
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
          ))}
        </div>
      </section>
    </div>
  );
}
