export type RetailLocaleText = { en: string; ar: string };

export type RetailProduct = {
  sku: string;
  name: RetailLocaleText;
  description: RetailLocaleText;
  image: string;
  priceMinor: number;
  currency: "USD";
  available: boolean;
  stock?: number;
};

export type RetailCartItem = { sku: string; quantity: number; unitAmount?: string };

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
  totalMinor: number;
  shippingMethod: "standard";
};
