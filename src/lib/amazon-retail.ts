export const amazonMarkets = ["AE", "SA", "DE", "NL", "PL", "SE", "BE"] as const;

export type AmazonMarket = (typeof amazonMarkets)[number];

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

const marketOrder: AmazonMarket[] = [...amazonMarkets];
const germanSyncedMarkets: AmazonMarket[] = ["DE", "NL", "PL", "SE", "BE"];

const amazonDomains: Record<AmazonMarket, string> = {
  AE: "https://www.amazon.ae",
  SA: "https://www.amazon.sa",
  DE: "https://www.amazon.de",
  NL: "https://www.amazon.nl",
  PL: "https://www.amazon.pl",
  SE: "https://www.amazon.se",
  BE: "https://www.amazon.com.be",
};

export function getAmazonMarketLabel(market: AmazonMarket) {
  return `Amazon ${market}`;
}

export function getAmazonSearchLinks() {
  return Object.fromEntries(
    amazonMarkets.map((market) => [
      market,
      `${amazonDomains[market]}/s?k=TranquilBeads`,
    ]),
  ) as Record<AmazonMarket, string>;
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
    const linkedMarkets =
      seed.market === "DE" ? germanSyncedMarkets : [seed.market];
    const retailLinks = Object.fromEntries(
      linkedMarkets.map((market) => [market, getAmazonBuyUrl(market, seed.asin)]),
    ) as Partial<Record<AmazonMarket, string>>;
    const marketStatuses = Object.fromEntries(
      linkedMarkets.map((market) => [market, seed.status]),
    ) as Partial<Record<AmazonMarket, string>>;

    if (!existing) {
      productsByFirstImage.set(dedupeKey, {
        ...seed,
        slug: `${slugify(seed.title)}-${seed.asin.toLowerCase()}`,
        firstImageFingerprint: dedupeKey,
        markets: sortMarkets(linkedMarkets),
        retailLinks,
        marketStatuses,
      });
      continue;
    }

    for (const market of linkedMarkets) {
      if (!existing.markets.includes(market)) {
        existing.markets = sortMarkets([...existing.markets, market]);
      }

      if (shouldReplaceMarketLink(existing.marketStatuses[market], seed.status)) {
        existing.retailLinks[market] = retailLinks[market];
        existing.marketStatuses[market] = seed.status;
      }
    }
  }

  return Array.from(productsByFirstImage.values());
}
