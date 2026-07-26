import type { RetailProduct } from "./types";

/**
 * Deliberately independent from the wholesale and marketplace catalogs.
 * Add verified direct-retail SKUs here only after their price, image, copy, and
 * fulfilment policy have been approved. An empty catalog disables checkout.
 */
export const retailCatalog: RetailProduct[] = [];
