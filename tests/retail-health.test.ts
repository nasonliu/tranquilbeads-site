import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

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

  it("reports retail Blob readiness without accepting the outreach store token", () => {
    const route = readFileSync("app/api/retail/health/route.ts", "utf8");
    expect(route).toContain("process.env.RETAIL_BLOB_READ_WRITE_TOKEN");
    expect(route).toContain("process.env.RETAIL_BLOB_STORE_ID");
    expect(route).not.toContain("process.env.BLOB_READ_WRITE_TOKEN");
  });
});
