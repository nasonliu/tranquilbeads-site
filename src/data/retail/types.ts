/** Chinese storefront fields are optional until existing catalog rows are translated. */
export type RetailLocaleText = { en: string; ar: string; zh?: string };
export type RetailLocale = "en" | "ar" | "zh";
export type RetailVariantOptions = Record<string, string>;
export type RetailLocalizedVariantOptions = Partial<Record<RetailLocale, RetailVariantOptions>>;

function stringValues(value: unknown): RetailVariantOptions {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).flatMap(([key, item]) => typeof item === "string" ? [[key, item]] : []));
}

/**
 * Storefront selection must use the localized option labels that a customer
 * sees. A missing locale map falls back as a whole to English; maps are never
 * merged because translated option keys are different strings. Pre-V3 flat
 * option maps remain readable while old rows are backfilled.
 */
export function localizeRetailVariantOptions(optionValues: unknown, locale: RetailLocale): RetailVariantOptions {
  const values = stringValues(optionValues);
  const localized = Object.values(optionValues ?? {}).some((value) => value && typeof value === "object" && !Array.isArray(value));
  if (!localized) return values;
  const source = optionValues as RetailLocalizedVariantOptions;
  const english = stringValues(source.en);
  const requested = stringValues(source[locale]);
  return Object.keys(requested).length ? requested : english;
}

export type RetailProduct = {
  sku: string;
  slug?: string;
  name: RetailLocaleText;
  description: RetailLocaleText;
  image: string;
  priceMinor: number;
  currency: "USD";
  available: boolean;
  stock?: number;
  variants?: RetailProductVariant[];
  /** Product-level, localized PDP copy. It never authorizes price or stock. */
  highlights?: RetailLocaleText[];
  details?: Array<{ label: RetailLocaleText; value: RetailLocaleText }>;
  aPlus?: Array<{ eyebrow?: RetailLocaleText; title: RetailLocaleText; body: RetailLocaleText; image?: string }>;
};

export type RetailProductVariant = {
  sku: string;
  name: RetailLocaleText;
  options: RetailVariantOptions;
  priceMinor: number;
  available: boolean;
  stock: number;
  /** A style/SKC groups several sellable SKU variants under one product. */
  style?: RetailProductStyle;
};

export type RetailProductStyle = {
  publicId: string;
  code: string;
  name: RetailLocaleText;
  options: RetailVariantOptions;
  position: number;
  image?: string;
};

/** Legacy catalog helpers retain product SKU input for the V2 compatibility path. */
export type RetailCartItem = { sku: string; quantity: number; unitAmount?: string };
/** New storefront requests are keyed by sellable variant SKU, never a price supplied by the browser. */
export type RetailVariantCartItem = { variantSku: string; quantity: number };

export type RetailCheckoutError = "checkout_expired" | "invalid_cart" | "request_conflict" | "checkout_unavailable";

export type RetailShippingZone = {
  country: string;
  name: RetailLocaleText;
  shippingMinor: number;
  freeShippingThresholdMinor: number | null;
  taxRateBps: number;
  carrier?: string;
  serviceCode?: string | null;
  deliveryMinDays?: number | null;
  deliveryMaxDays?: number | null;
  dutiesMode?: "DDP" | "DAP" | "UNKNOWN";
};

export type RetailCheckout = {
  email: string;
  recipient: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  phone: string;
  termsVersion: "2026-07-28";
  termsAccepted: true;
  locale: "en" | "ar" | "zh";
  accountIntent?: "guest" | "create_or_access";
  /** Explicit opt-in only; it never controls order and delivery email. */
  marketingConsent?: boolean;
};

export type RetailQuote = {
  currency: "USD";
  subtotalMinor: number;
  shippingMinor: number;
  taxMinor: number;
  discountMinor?: number;
  totalMinor: number;
  shippingMethod: "standard";
  promotionCode?: string | null;
  promotionAutomatic?: boolean;
  shippingQuoteToken?: string;
  shippingQuote?: {
    carrier: "YunExpress";
    serviceCode: string;
    serviceName: string;
    deliveryWindow: string;
    dutiesMode: "DAP" | "DDP";
    expiresAt: string;
    package: { weightGrams: number; lengthMm: number; widthMm: number; heightMm: number; volumeCm3: number; itemCount: number };
  };
};
