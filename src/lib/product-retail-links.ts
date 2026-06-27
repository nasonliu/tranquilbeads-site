import { amazonRetailProducts } from "@/src/data/amazon-products";
import { noonRetailProducts } from "@/src/data/noon-products";
import { getAmazonMarketLabel, type AmazonMarket } from "@/src/lib/amazon-retail";
import { getNoonMarketLabel } from "@/src/lib/noon-retail";
import type { Locale } from "@/src/lib/i18n";

type RetailLink = {
  href: string;
  label: string;
  platform: "amazon" | "noon";
};

type RetailMapping = {
  amazonAsins?: string[];
  noonSlugs?: string[];
};

const productRetailMappings: Record<string, RetailMapping> = {
  "natural-kuka-wood-tasbih": {
    amazonAsins: ["B0G6BL13XY"],
    noonSlugs: ["authentic-kuka-wood-tasbih"],
  },
  "golden-hematite-medallion-tasbih": {
    amazonAsins: ["B0G511VGFK"],
    noonSlugs: ["black-hematite-99-tasbih"],
  },
  "baltic-amber-gift-set": {
    amazonAsins: ["B0GHS5GZ51"],
    noonSlugs: ["certified-baltic-amber-33"],
  },
  "lacquer-art-33-bead-tasbih": {
    amazonAsins: ["B0G6CVDLH6"],
    noonSlugs: ["hematite-compass-charm-tasbih"],
  },
  ambercube33: {
    amazonAsins: ["B0G4WKCGF5"],
    noonSlugs: ["certified-baltic-amber-33"],
  },
  redwhiteglass: {
    amazonAsins: ["B0G6BBLSJ1"],
    noonSlugs: ["premium-amber-gift-box-tasbih"],
  },
  "99blackrosewood": {
    amazonAsins: ["B0G4W881HM"],
    noonSlugs: ["authentic-kuka-wood-tasbih"],
  },
  oud2: {
    amazonAsins: ["B0G4W881HM"],
    noonSlugs: ["authentic-kuka-wood-tasbih"],
  },
  "terahertz-road-safety-pendant": {
    amazonAsins: ["B0FX9K3J17"],
    noonSlugs: ["terahertz-car-hanging-tasbih"],
  },
  kechainrose: {
    amazonAsins: ["B0FX8W5Z3B"],
    noonSlugs: ["terahertz-car-hanging-tasbih"],
  },
  zebra: {
    amazonAsins: ["B0FX9ZSPFR"],
    noonSlugs: ["natural-agate-tasbih"],
  },
  "resin-tasbih": {
    amazonAsins: ["B0FDL3122X"],
    noonSlugs: ["premium-amber-gift-box-tasbih"],
  },
};

function findAmazonProduct(asin: string) {
  return amazonRetailProducts.find((product) => (
    product.asin === asin ||
    Object.values(product.retailLinks).some((href) => href?.endsWith(`/dp/${asin}`))
  ));
}

function getAmazonLinks(asin: string, locale: Locale) {
  const product = findAmazonProduct(asin);
  if (!product) return [];

  return (["AE", "SA", "DE"] satisfies AmazonMarket[])
    .map((market) => {
      const href = product.retailLinks[market];
      if (!href) return null;

      return {
        href,
        label: locale === "ar"
          ? `الشراء عبر ${getAmazonMarketLabel(market)}`
          : `Buy on ${getAmazonMarketLabel(market)}`,
        platform: "amazon" as const,
      };
    })
    .filter((link) => link !== null);
}

function getNoonLinks(slug: string, locale: Locale) {
  const product = noonRetailProducts.find((item) => item.slug === slug);
  if (!product) return [];

  return [
    product.retailLinks.noonUae
      ? {
          href: product.retailLinks.noonUae,
          label: locale === "ar"
            ? `الشراء عبر ${getNoonMarketLabel("uae", locale)}`
            : `Buy on ${getNoonMarketLabel("uae", locale)}`,
          platform: "noon" as const,
        }
      : null,
    product.retailLinks.noonSaudi
      ? {
          href: product.retailLinks.noonSaudi,
          label: locale === "ar"
            ? `الشراء عبر ${getNoonMarketLabel("saudi", locale)}`
            : `Buy on ${getNoonMarketLabel("saudi", locale)}`,
          platform: "noon" as const,
        }
      : null,
  ].filter((link) => link !== null);
}

export function getProductRetailLinks(productSlug: string, locale: Locale): RetailLink[] {
  const mapping = productRetailMappings[productSlug];
  if (!mapping) return [];

  return [
    ...(mapping.amazonAsins ?? []).flatMap((asin) => getAmazonLinks(asin, locale)),
    ...(mapping.noonSlugs ?? []).flatMap((slug) => getNoonLinks(slug, locale)),
  ];
}
