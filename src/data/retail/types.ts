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
