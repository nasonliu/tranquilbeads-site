import { describe, expect, it } from "vitest";

import { GET } from "@/app/api/retail/health/route";

describe("retail health route", () => {
  it("fails closed without the complete payment configuration", async () => {
    const prior = process.env.RETAIL_SHOP_ENABLED;
    delete process.env.RETAIL_SHOP_ENABLED;
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false, status: "not_ready", paymentConfigured: false });
    if (prior === undefined) delete process.env.RETAIL_SHOP_ENABLED;
    else process.env.RETAIL_SHOP_ENABLED = prior;
  });
});
