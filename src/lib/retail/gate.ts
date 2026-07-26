import { getRetailServerConfig } from "./config";

export function getRetailPaymentGate() {
  const config = getRetailServerConfig();
  // Availability, price, and stock are checked by the checkout SQL function;
  // the old static catalog must never become a payment authority.
  if (!config.enabled) return { enabled: false as const };
  return { enabled: true as const, config };
}
