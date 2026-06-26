import type { Locale } from "@/src/lib/i18n";

export type NoonMarket = "uae" | "saudi";

export type LocalizedString = Record<Locale, string>;

export type NoonRetailSeed = {
  market: NoonMarket;
  slug: string;
  title: LocalizedString;
  summary: LocalizedString;
  material: LocalizedString;
  heroImage: string;
  firstImageFingerprint: string;
  noonUrl: string;
  tags?: LocalizedString[];
};

export type NoonRetailProduct = Omit<NoonRetailSeed, "market" | "noonUrl"> & {
  markets: NoonMarket[];
  retailLinks: {
    noonUae?: string;
    noonSaudi?: string;
  };
};

const noonStoreLinks = {
  uae: "https://www.noon.com/uae-en/tranquilbeads/",
  saudi: "https://www.noon.com/saudi-en/tranquilbeads/",
} as const;

const marketOrder: NoonMarket[] = ["uae", "saudi"];

function linkKeyForMarket(market: NoonMarket) {
  return market === "uae" ? "noonUae" : "noonSaudi";
}

function sortMarkets(markets: NoonMarket[]) {
  return [...markets].sort(
    (first, second) => marketOrder.indexOf(first) - marketOrder.indexOf(second),
  );
}

export function getNoonStoreLinks() {
  return noonStoreLinks;
}

export function getNoonMarketLabel(market: NoonMarket, locale: Locale) {
  if (locale === "ar") {
    return market === "uae" ? "نون الإمارات" : "نون السعودية";
  }

  return market === "uae" ? "Noon UAE" : "Noon Saudi";
}

export function buildNoonRetailCatalog(seeds: NoonRetailSeed[]) {
  const productsByFirstImage = new Map<string, NoonRetailProduct>();

  for (const seed of seeds) {
    const dedupeKey = seed.firstImageFingerprint || seed.heroImage;
    const existing = productsByFirstImage.get(dedupeKey);
    const linkKey = linkKeyForMarket(seed.market);

    if (!existing) {
      productsByFirstImage.set(dedupeKey, {
        slug: seed.slug,
        title: seed.title,
        summary: seed.summary,
        material: seed.material,
        heroImage: seed.heroImage,
        firstImageFingerprint: dedupeKey,
        tags: seed.tags ?? [],
        markets: [seed.market],
        retailLinks: {
          [linkKey]: seed.noonUrl,
        },
      });
      continue;
    }

    existing.retailLinks[linkKey] = seed.noonUrl;

    if (!existing.markets.includes(seed.market)) {
      existing.markets = sortMarkets([...existing.markets, seed.market]);
    }

    const knownTags = new Set(existing.tags?.map((tag) => tag.en));
    for (const tag of seed.tags ?? []) {
      if (!knownTags.has(tag.en)) {
        existing.tags?.push(tag);
      }
    }
  }

  return Array.from(productsByFirstImage.values());
}
