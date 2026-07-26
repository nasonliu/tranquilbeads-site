import { describe, expect, it } from "vitest";

import { POST } from "@/app/api/retail/orders/route";

describe("retail orders route", () => {
  it("fails closed without an explicit shop gate and never reveals payment configuration", async () => {
    const response = await POST(new Request("https://example.com/api/retail/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ requestId: "11111111-1111-4111-8111-111111111111", items: [{ sku: "anything", quantity: 1 }] }) }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: "retail_unavailable" });
  });

  it("fails closed before parsing input when checkout is unavailable", async () => {
    const response = await POST(new Request("https://example.com/api/retail/orders", { method: "POST", headers: { "content-type": "application/json" }, body: "not-json" }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: "retail_unavailable" });
  });
});
