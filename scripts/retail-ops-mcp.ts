import { readFile } from "node:fs/promises";
import { basename, extname, isAbsolute, relative, resolve } from "node:path";

import dotenv from "dotenv";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });
dotenv.config();

const baseUrl = (process.env.RETAIL_AGENT_BASE_URL ?? "").replace(/\/$/, "");
const token = process.env.RETAIL_AGENT_TOKEN ?? "";

function configured() {
  if (!baseUrl || !/^https?:\/\//.test(baseUrl) || token.length < 32) throw new Error("Set RETAIL_AGENT_BASE_URL and RETAIL_AGENT_TOKEN in the MCP process environment.");
}
async function api(path: string, init?: RequestInit) {
  configured();
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers: { authorization: `Bearer ${token}`, ...(init?.headers ?? {}) }, cache: "no-store" });
  const body = await response.json().catch(() => ({ ok: false, error: "invalid_response" })) as Record<string, unknown>;
  if (!response.ok || !body.ok) throw new Error(String(body.error ?? `HTTP ${response.status}`));
  return body;
}
const result = (text: string, data: Record<string, unknown>) => ({ content: [{ type: "text" as const, text }], structuredContent: data });
const uuid = z.string().uuid();

async function main() {
  const server = new McpServer({ name: "tranquilbeads-retail-ops", version: "1.0.0" });

  server.registerTool("retail_catalog_get", { description: "Read products, SKCs/styles, SKUs/variants, prices, stock, and product media. No write.", inputSchema: {} }, async () => {
    const body = await api("/api/agent/retail/catalog");
    return result("Retail catalogue snapshot loaded.", body);
  });

  server.registerTool("retail_product_create_draft", {
    description: "Preview or create a draft retail product and its default SKU. confirm=false never writes; confirm=true requires a stable idempotencyKey and returns server readback.",
    inputSchema: {
      confirm: z.boolean().default(false), idempotencyKey: uuid, sku: z.string(), slug: z.string(), titleEn: z.string(), titleAr: z.string(), titleZh: z.string().optional(), descriptionEn: z.string().default(""), descriptionAr: z.string().default(""), descriptionZh: z.string().optional(), amountMinor: z.number().int().positive(), onHand: z.number().int().nonnegative().default(0),
    },
  }, async (args) => {
    const payload = { action: "product.create", status: "draft", ...args };
    delete (payload as { confirm?: boolean }).confirm;
    if (!args.confirm) return result("Draft product change prepared. Re-run with confirm=true and the same idempotencyKey to apply.", { ok: true, dryRun: true, proposed: payload, confirmationRequired: true });
    const body = await api("/api/agent/retail/catalog", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const snapshot = await api("/api/agent/retail/catalog");
    return result("Draft product created and catalogue readback completed.", { ...body, readback: snapshot.snapshot });
  });

  server.registerTool("retail_variant_update", {
    description: "Preview or update one SKU price, stock, status, or logistics fields. Writes require confirm=true and are followed by catalogue readback.",
    inputSchema: { confirm: z.boolean().default(false), idempotencyKey: uuid, variantId: uuid, amountMinor: z.number().int().positive().optional(), onHand: z.number().int().nonnegative().optional(), status: z.enum(["active", "archived"]).optional(), shippingWeightGrams: z.number().int().positive().nullable().optional(), packageLengthMm: z.number().int().positive().nullable().optional(), packageWidthMm: z.number().int().positive().nullable().optional(), packageHeightMm: z.number().int().positive().nullable().optional() },
  }, async (args) => {
    const payload = { action: "variant.update", ...args };
    delete (payload as { confirm?: boolean }).confirm;
    if (!args.confirm) return result("SKU change prepared. Re-run with confirm=true and the same idempotencyKey to apply.", { ok: true, dryRun: true, proposed: payload, confirmationRequired: true });
    const body = await api("/api/agent/retail/catalog", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const snapshot = await api("/api/agent/retail/catalog");
    return result("SKU updated and catalogue readback completed.", { ...body, readback: snapshot.snapshot });
  });

  server.registerTool("retail_media_upload", {
    description: "Preview or upload one local product image. The file must be inside RETAIL_AGENT_MEDIA_ROOT. No remote URL fetching. Writes require confirm=true.",
    inputSchema: { confirm: z.boolean().default(false), idempotencyKey: uuid, productId: uuid, filePath: z.string(), altEn: z.string().max(300).default(""), altAr: z.string().max(300).default("") },
  }, async (args) => {
    const root = resolve(process.env.RETAIL_AGENT_MEDIA_ROOT ?? process.cwd());
    const filePath = resolve(isAbsolute(args.filePath) ? args.filePath : resolve(root, args.filePath));
    const rel = relative(root, filePath);
    if (rel.startsWith("..") || isAbsolute(rel)) throw new Error("file_outside_media_root");
    if (!args.confirm) return result("Media upload prepared. Re-run with confirm=true and the same idempotencyKey to apply.", { ok: true, dryRun: true, proposed: { productId: args.productId, file: basename(filePath), altEn: args.altEn, altAr: args.altAr }, confirmationRequired: true });
    const bytes = await readFile(filePath);
    const mime = extname(filePath).toLowerCase() === ".png" ? "image/png" : extname(filePath).toLowerCase() === ".webp" ? "image/webp" : "image/jpeg";
    const form = new FormData(); form.set("productId", args.productId); form.set("idempotencyKey", args.idempotencyKey); form.set("altEn", args.altEn); form.set("altAr", args.altAr); form.set("file", new Blob([bytes], { type: mime }), basename(filePath));
    const body = await api("/api/agent/retail/media", { method: "POST", body: form });
    const snapshot = await api("/api/agent/retail/catalog");
    return result("Product image uploaded and catalogue readback completed.", { ...body, readback: snapshot.snapshot });
  });

  server.registerTool("retail_inventory_get", { description: "Read product inventory balances and ledger entries.", inputSchema: { productId: uuid.optional() } }, async (args) => result("Inventory loaded.", await api(`/api/agent/retail/operations?resource=inventory${args.productId ? `&productId=${encodeURIComponent(args.productId)}` : ""}`)));
  server.registerTool("retail_inventory_adjust", { description: "Preview or apply a signed inventory adjustment. Writes require confirm=true, reason, stable idempotencyKey, and return before/after readback.", inputSchema: { confirm: z.boolean().default(false), idempotencyKey: uuid, productId: uuid, delta: z.number().int().refine((value) => value !== 0), reason: z.string().min(1).max(200) } }, async (args) => result(args.confirm ? "Inventory adjustment applied with readback." : "Inventory adjustment previewed; no write occurred.", await api("/api/agent/retail/operations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "inventory.adjust", ...args }) })));
  server.registerTool("retail_orders_list", { description: "Read recent orders with customer and address fields redacted.", inputSchema: { status: z.string().optional(), limit: z.number().int().min(1).max(100).default(50) } }, async (args) => result("Redacted orders loaded.", await api(`/api/agent/retail/operations?resource=orders&limit=${args.limit}${args.status ? `&status=${encodeURIComponent(args.status)}` : ""}`)));
  server.registerTool("retail_order_fulfil", { description: "Preview or mark an order fulfilled with carrier and tracking. Writes require confirm=true and stable idempotencyKey; returns redacted before/after readback.", inputSchema: { confirm: z.boolean().default(false), idempotencyKey: uuid, orderId: z.number().int().positive(), carrier: z.string().max(100), tracking: z.string().max(200), note: z.string().max(2000).default("") } }, async (args) => result(args.confirm ? "Order fulfilment applied with readback." : "Order fulfilment previewed; no write occurred.", await api("/api/agent/retail/operations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "order.fulfil", ...args }) })));
  server.registerTool("retail_sales_summary", { description: "Read aggregate paid order, revenue, refund, and fulfilment counts. No customer data.", inputSchema: { days: z.number().int().min(1).max(365).default(30) } }, async (args) => result("Sales summary loaded.", await api(`/api/agent/retail/operations?resource=sales&days=${args.days}`)));
  server.registerTool("retail_activity_log", { description: "Read recent admin and Agent activity receipts.", inputSchema: { limit: z.number().int().min(1).max(100).default(50) } }, async (args) => result("Activity log loaded.", await api(`/api/agent/retail/operations?resource=audit&limit=${args.limit}`)));

  await server.connect(new StdioServerTransport());
}

void main();
