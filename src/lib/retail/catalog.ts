import type { RetailCartItem, RetailProduct } from "@/src/data/retail/types";

export type RetailOrderLine = { sku: string; quantity: number; unitAmountMinor: number };
export type RetailCheckoutAddress = { recipient: string; line1: string; line2?: string; city: string; region?: string; postalCode?: string; country: string; phone?: string };
export type RetailOrderQuote = {
  currency: string;
  totalMinor: number;
  items: RetailOrderLine[];
  subtotalMinor?: number;
  shippingMinor?: number;
  taxMinor?: number;
  discountMinor?: number;
  shippingMethod?: string;
  shipping?: RetailCheckoutAddress;
};

export function calculateRetailOrder(items: RetailCartItem[], catalog: Array<Pick<RetailProduct, "sku" | "priceMinor" | "available"> & { currency: string }>): RetailOrderQuote {
  if (!Array.isArray(items) || items.length === 0 || items.length > 25) throw new Error("invalid_cart");
  const bySku = new Map(catalog.map((product) => [product.sku, product]));
  const requestedSkus = new Set<string>();
  let currency: string | undefined;
  let totalMinor = 0;
  const resolved = items.map(({ sku, quantity }) => {
    if (requestedSkus.has(sku)) throw new Error("duplicate_sku");
    requestedSkus.add(sku);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) throw new Error("invalid_quantity");
    const product = bySku.get(sku);
    if (!product) throw new Error("unknown_sku");
    if (!product.available) throw new Error("unavailable_sku");
    if (!Number.isSafeInteger(product.priceMinor) || product.priceMinor < 1 || product.currency !== "USD") throw new Error("invalid_catalog_item");
    if (currency && currency !== product.currency) throw new Error("mixed_currency");
    currency = product.currency;
    totalMinor += product.priceMinor * quantity;
    if (!Number.isSafeInteger(totalMinor) || totalMinor > 99_999_999) throw new Error("amount_out_of_range");
    return { sku: product.sku, quantity, unitAmountMinor: product.priceMinor };
  });
  if (!currency || totalMinor < 1) throw new Error("invalid_cart");
  return { currency, totalMinor, items: resolved };
}

export function formatMinorAmount(amount: number) {
  return (amount / 100).toFixed(2);
}
