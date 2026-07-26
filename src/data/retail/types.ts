export type RetailLocaleText = { en: string; ar: string };

export type RetailProduct = {
  sku: string;
  name: RetailLocaleText;
  description: RetailLocaleText;
  image: string;
  priceMinor: number;
  currency: "USD";
  available: boolean;
};

export type RetailCartItem = { sku: string; quantity: number; unitAmount?: string };
