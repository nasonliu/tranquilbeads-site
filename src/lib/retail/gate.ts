import { retailCatalog } from "@/src/data/retail/catalog";

import { getRetailServerConfig } from "./config";

export function getRetailPaymentGate() {
  const config = getRetailServerConfig();
  if (!config.enabled || !retailCatalog.some((product) => product.available && product.currency === "USD")) return { enabled: false as const };
  return { enabled: true as const, config };
}
