import Link from "next/link";
import { notFound } from "next/navigation";

import { amazonRetailProducts } from "@/src/data/amazon-products";
import { getPageMetadata } from "@/src/data/site";
import { PageHero } from "@/src/components/page-hero";
import {
  amazonMarkets,
  getAmazonMarketLabel,
  getAmazonSearchLinks,
  type AmazonMarket,
} from "@/src/lib/amazon-retail";
import { getDir, isLocale, withLocale } from "@/src/lib/i18n";

const marketBadgeClass: Record<AmazonMarket, string> = {
  AE: "border-[#d8b57a]/50 bg-[#fff6e6] text-[#7a5525]",
  SA: "border-[#7b8a63]/45 bg-[#eef4e7] text-[#526238]",
  DE: "border-[#8d94a3]/45 bg-[#f0f2f6] text-[#4e5665]",
  NL: "border-[#6c9a7a]/45 bg-[#edf7ef] text-[#3f6b4d]",
  PL: "border-[#c87979]/45 bg-[#fff1f1] text-[#7a3f3f]",
  SE: "border-[#6c8eb8]/45 bg-[#edf4fb] text-[#395d88]",
  BE: "border-[#c4a15b]/45 bg-[#fff8df] text-[#765b22]",
};

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
  const isRtl = getDir(locale) === "rtl";

  return (
    <div className="space-y-12 pt-8 md:space-y-16">
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
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="noor-kicker text-xs font-semibold text-accent-deep">
              {locale === "en" ? "Deduped Amazon catalog" : "كتالوج أمازون مدمج"}
            </p>
            <h2 className="noor-title mt-2 text-4xl">
              {locale === "en" ? "Available through Amazon" : "متاح عبر أمازون"}
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
          {amazonRetailProducts.map((product) => (
            <article
              key={product.slug}
              className="group overflow-hidden rounded-[1.75rem] border border-border/70 bg-white/80 shadow-[0_16px_36px_rgba(40,28,17,0.08)]"
            >
              <div className="relative overflow-hidden bg-[#eee3d1]">
                <img
                  src={product.heroImage}
                  alt={product.title}
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
                      {getAmazonMarketLabel(market)}
                    </span>
                  ))}
                </div>
              </div>
              <div className="space-y-4 p-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-accent-deep">
                    ASIN {product.asin}
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
          ))}
        </div>
      </section>
    </div>
  );
}
