import { describe, expect, it } from "vitest";

import { getRetailRuntimeConfig } from "@/src/lib/retail/config";

describe("retail payment configuration", () => {
  it("fails closed until every server-side requirement is present and the gate is explicitly enabled", () => {
    expect(getRetailRuntimeConfig({})).toEqual({ enabled: false, reason: "disabled" });
    expect(getRetailRuntimeConfig({ RETAIL_SHOP_ENABLED: "true" })).toEqual({ enabled: false, reason: "missing_configuration" });
  });

  it("only exposes the PayPal client id after the full payment backend is configured", () => {
    const config = getRetailRuntimeConfig({
      RETAIL_SHOP_ENABLED: "true",
      PAYPAL_CLIENT_ID: "client-id",
      PAYPAL_CLIENT_SECRET: "client-secret",
      PAYPAL_WEBHOOK_ID: "webhook-id",
      DATABASE_URL: "postgres://example",
    });

    expect(config).toMatchObject({ enabled: true, paypalClientId: "client-id" });
    expect(config).not.toHaveProperty("paypalClientSecret");
  });
});
