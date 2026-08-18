import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { describe, expect, it } from "vitest";

describe("retail operations MCP stdio", () => {
  it("lists the guarded operations tools and performs a write dry-run without credentials", async () => {
    const client = new Client({ name: "retail-mcp-test", version: "1.0.0" });
    const transport = new StdioClientTransport({
      command: "npm",
      args: ["run", "--silent", "mcp:retail"],
      cwd: process.cwd(),
      stderr: "pipe",
    });
    try {
      await client.connect(transport);
      const tools = await client.listTools();
      expect(tools.tools.map((tool) => tool.name)).toEqual(expect.arrayContaining([
        "retail_catalog_get",
        "retail_product_create_draft",
        "retail_media_upload",
        "retail_inventory_adjust",
        "retail_order_fulfil",
        "retail_sales_summary",
      ]));
      const result = await client.callTool({
        name: "retail_product_create_draft",
        arguments: {
          confirm: false,
          idempotencyKey: "11111111-1111-4111-8111-111111111111",
          sku: "MCP-SMOKE-1",
          slug: "mcp-smoke-1",
          titleEn: "MCP smoke test",
          titleAr: "اختبار MCP",
          amountMinor: 100,
          onHand: 0,
        },
      });
      expect(result.structuredContent).toMatchObject({ ok: true, dryRun: true, confirmationRequired: true });
    } finally {
      await transport.close();
    }
  }, 20_000);
});
