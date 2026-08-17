import { getRetailServerConfig, isRetailNotificationConfigurationValid, isRetailShippingConfigurationValid } from "./config";

export function getRetailPaymentGate() {
  const config = getRetailServerConfig();
  // Availability, price, and stock are checked by the checkout SQL function;
  // the old static catalog must never become a payment authority.
  if (!config.enabled) return { enabled: false as const };
  return { enabled: true as const, config };
}

export function getRetailPaymentCreationGate() {
  const gate = getRetailPaymentGate();
  if (!gate.enabled) return gate;
  // Never create a live PayPal order if required receipt/account email cannot
  // be delivered. Capture recovery keeps the base gate so an already-approved
  // payment is not stranded after an environment configuration change.
  if (gate.config.paymentMode === "live" && (!isRetailNotificationConfigurationValid() || !isRetailShippingConfigurationValid())) {
    return { enabled: false as const };
  }
  return gate;
}
