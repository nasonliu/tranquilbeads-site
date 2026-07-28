/** Chinese storefront fields are optional until existing catalog rows are translated. */
export type RetailLocaleText = { en: string; ar: string; zh?: string };

export type RetailProduct = {
  sku: string;
  name: RetailLocaleText;
  description: RetailLocaleText;
  image: string;
  priceMinor: number;
  currency: "USD";
  available: boolean;
  stock?: number;
  variants?: RetailProductVariant[];
};

export type RetailProductVariant = {
  sku: string;
  name: RetailLocaleText;
  options: Record<string, string>;
  priceMinor: number;
  available: boolean;
  stock: number;
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
};
