import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("retail operations Agent and MCP contract", () => {
  const route = readFileSync("app/api/agent/retail/operations/route.ts", "utf8");
  const mcp = readFileSync("scripts/retail-ops-mcp.ts", "utf8");
  const guide = readFileSync("docs/retail-agent-mcp-guide.md", "utf8");

  it("keeps machine reads scoped and every operational write confirm-gated with readback", () => {
    expect(route).toContain('z.enum(["inventory", "orders", "sales", "audit"])');
    expect(route).toContain('action: z.literal("inventory.adjust")');
    expect(route).toContain('action: z.literal("order.fulfil")');
    expect(route).toContain("if (!input.confirm)");
    expect(route).toContain("const after =");
    expect(route).not.toContain("orders:pii");
    expect(route).not.toContain("refund");
  });

  it("exposes retail tools without embedding credentials or arbitrary URL/SQL tools", () => {
    for (const tool of ["retail_catalog_get", "retail_product_create_draft", "retail_variant_update", "retail_media_upload", "retail_inventory_get", "retail_inventory_adjust", "retail_orders_list", "retail_order_fulfil", "retail_sales_summary", "retail_activity_log"]) expect(mcp).toContain(`\"${tool}\"`);
    expect(mcp).toContain("process.env.RETAIL_AGENT_TOKEN");
    expect(mcp).toContain("RETAIL_AGENT_MEDIA_ROOT");
    expect(mcp).not.toMatch(/RETAIL_AGENT_TOKEN\s*=\s*["'][^"']{32}/);
    expect(mcp).not.toContain("raw_sql");
    expect(mcp).not.toContain("arbitrary_http");
    expect(guide).toContain("confirm=false");
    expect(guide).toContain("confirm=true");
  });
});
