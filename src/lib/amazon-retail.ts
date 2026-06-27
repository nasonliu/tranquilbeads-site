export type AmazonMarket = "AE" | "SA" | "DE";

export type AmazonRetailSeed = {
  market: AmazonMarket;
  sellerSku: string;
  asin: string;
  title: string;
  status: string;
  heroImage: string;
  firstImageFingerprint: string;
};

export type AmazonRetailProduct = Omit<AmazonRetailSeed, "market"> & {
  slug: string;
  markets: AmazonMarket[];
  retailLinks: Partial<Record<AmazonMarket, string>>;
  marketStatuses: Partial<Record<AmazonMarket, string>>;
};

const marketOrder: AmazonMarket[] = ["AE", "SA", "DE"];

const amazonDomains: Record<AmazonMarket, string> = {
  AE: "https://www.amazon.ae",
  SA: "https://www.amazon.sa",
  DE: "https://www.amazon.de",
};

export function getAmazonMarketLabel(market: AmazonMarket) {
  return `Amazon ${market}`;
}

export function getAmazonSearchLinks() {
  return {
    AE: `${amazonDomains.AE}/s?k=TranquilBeads`,
    SA: `${amazonDomains.SA}/s?k=TranquilBeads`,
    DE: `${amazonDomains.DE}/s?k=TranquilBeads`,
  } satisfies Record<AmazonMarket, string>;
}

export function getAmazonBuyUrl(market: AmazonMarket, asin: string) {
  return `${amazonDomains[market]}/dp/${asin}`;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function sortMarkets(markets: AmazonMarket[]) {
  return [...markets].sort(
    (first, second) => marketOrder.indexOf(first) - marketOrder.indexOf(second),
  );
}

function isBuyable(status: string) {
  return status.split(",").some((part) => part.trim() === "BUYABLE");
}

export function normalizeAmazonImageFingerprint(imageUrl: string) {
  return imageUrl
    .trim()
    .replace(/\?.*$/, "")
    .replace(/(\._[^./]+_)(\.[a-zA-Z]+)$/, "$2");
}

function shouldReplaceMarketLink(
  currentStatus: string | undefined,
  nextStatus: string,
) {
  if (!currentStatus) return true;
  return !isBuyable(currentStatus) && isBuyable(nextStatus);
}

export function buildAmazonRetailCatalog(seeds: AmazonRetailSeed[]) {
  const productsByFirstImage = new Map<string, AmazonRetailProduct>();

  for (const seed of seeds) {
    const dedupeKey = normalizeAmazonImageFingerprint(
      seed.firstImageFingerprint || seed.heroImage,
    );
    const existing = productsByFirstImage.get(dedupeKey);
    const buyUrl = getAmazonBuyUrl(seed.market, seed.asin);

    if (!existing) {
      productsByFirstImage.set(dedupeKey, {
        ...seed,
        slug: `${slugify(seed.title)}-${seed.asin.toLowerCase()}`,
        firstImageFingerprint: dedupeKey,
        markets: [seed.market],
        retailLinks: {
          [seed.market]: buyUrl,
        },
        marketStatuses: {
          [seed.market]: seed.status,
        },
      });
      continue;
    }

    if (!existing.markets.includes(seed.market)) {
      existing.markets = sortMarkets([...existing.markets, seed.market]);
    }

    if (shouldReplaceMarketLink(existing.marketStatuses[seed.market], seed.status)) {
      existing.retailLinks[seed.market] = buyUrl;
      existing.marketStatuses[seed.market] = seed.status;
    }
  }

  return Array.from(productsByFirstImage.values());
}
