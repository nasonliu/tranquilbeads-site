import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";

const processEnv = Object.fromEntries(
  Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
);

describe("retail operations MCP stdio", () => {
  it("loads production credentials from macOS Keychain without embedding a token", () => {
    const wrapper = readFileSync("scripts/run-retail-ops-mcp.sh", "utf8");
    expect(wrapper).toContain('keychain_service="tranquilbeads-retail-ops"');
    expect(wrapper).toContain('security find-generic-password -w');
    expect(wrapper).toContain("RETAIL_AGENT_TOKEN_FILE");
    expect(wrapper).toContain("RETAIL_AGENT_EXPORT_ROOT");
    expect(wrapper).toContain("secret-tool lookup");
    expect(wrapper).toContain('RETAIL_AGENT_BASE_URL:-https://www.tranquilbeads.com');
    expect(wrapper).toContain("NODE_USE_ENV_PROXY=1");
    expect(wrapper).toContain("RETAIL_AGENT_PROXY_URL");
    expect(wrapper).not.toMatch(/RETAIL_AGENT_TOKEN=["'][A-Za-z0-9_-]{32,}/);
    expect(wrapper).not.toContain("echo $token");
  });

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
        "retail_product_update",
        "retail_product_content_replace",
        "retail_style_create",
        "retail_variant_create",
        "retail_media_upload",
        "retail_media_reorder",
        "retail_product_publish",
        "retail_inventory_adjust",
        "retail_orders_export",
        "retail_order_fulfil",
        "retail_sales_summary",
        "retail_sales_breakdown",
        "retail_sales_export",
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

      const publish = await client.callTool({
        name: "retail_product_publish",
        arguments: {
          confirm: false,
          idempotencyKey: "22222222-2222-4222-8222-222222222222",
          productId: "33333333-3333-4333-8333-333333333333",
        },
      });
      expect(publish.structuredContent).toMatchObject({ ok: true, dryRun: true, confirmationRequired: true });
    } finally {
      await transport.close();
    }
  }, 20_000);

  it("writes an actual redacted order CSV only inside the private export root", async () => {
    const exportRoot = await mkdtemp(join(tmpdir(), "retail-agent-export-"));
    const api = createServer((request, response) => {
      const url = new URL(request.url ?? "/", "http://localhost");
      expect(request.headers.authorization).toBe(`Bearer ${"t".repeat(32)}`);
      expect(url.searchParams.get("resource")).toBe("orders");
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({
        ok: true,
        orders: [{
          id: 7,
          public_id: "ORDER-7",
          status: "captured",
          currency: "USD",
          amount_minor: 6900,
          checkout_email: "j***@example.com",
          shipping_snapshot: { recipient: "J***", country: "US", region: "CA", city: "Irvine" },
          order_lines: [{ variantSku: "SKU-33", quantity: 1 }],
        }],
        offset: 0,
        limit: 2,
        hasMore: false,
      }));
    });
    await new Promise<void>((resolve) => api.listen(0, "127.0.0.1", resolve));
    const address = api.address();
    if (!address || typeof address === "string") throw new Error("mock_api_unavailable");
    const client = new Client({ name: "retail-export-test", version: "1.0.0" });
    const transport = new StdioClientTransport({
      command: "npm",
      args: ["run", "--silent", "mcp:retail"],
      cwd: process.cwd(),
      env: {
        ...processEnv,
        RETAIL_AGENT_BASE_URL: `http://127.0.0.1:${address.port}`,
        RETAIL_AGENT_TOKEN: "t".repeat(32),
        RETAIL_AGENT_EXPORT_ROOT: exportRoot,
      },
      stderr: "pipe",
    });
    try {
      await client.connect(transport);
      const result = await client.callTool({
        name: "retail_orders_export",
        arguments: { format: "csv", fileName: "orders-test.csv", maxRows: 2 },
      });
      expect(result.structuredContent).toMatchObject({ ok: true, rowCount: 1, format: "csv" });
      const outputPath = join(exportRoot, "orders-test.csv");
      const csv = await readFile(outputPath, "utf8");
      expect(csv).toContain("masked_email");
      expect(csv).toContain("j***@example.com");
      expect(csv).toContain("SKU-33");
      expect(csv).not.toContain("recipient");
      expect(csv).not.toContain("line1");
      expect(csv).not.toContain("phone");
      expect((await stat(outputPath)).mode & 0o077).toBe(0);
    } finally {
      await transport.close();
      await new Promise<void>((resolve, reject) => api.close((error) => error ? reject(error) : resolve()));
      await rm(exportRoot, { recursive: true, force: true });
    }
  }, 20_000);
});
