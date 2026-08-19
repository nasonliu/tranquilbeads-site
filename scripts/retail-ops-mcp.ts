import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, isAbsolute, relative, resolve } from "node:path";

import dotenv from "dotenv";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });
dotenv.config();

const baseUrl = (process.env.RETAIL_AGENT_BASE_URL ?? "").replace(/\/$/, "");
const token = process.env.RETAIL_AGENT_TOKEN ?? "";
const uuid = z.string().uuid();
const localizedText = z.object({ en: z.string().min(1).max(4_000), ar: z.string().min(1).max(4_000), zh: z.string().min(1).max(4_000) }).strict();
const localizedOptions = z.object({
  en: z.record(z.string().min(1).max(80), z.string().min(1).max(160)).default({}),
  ar: z.record(z.string().min(1).max(80), z.string().min(1).max(160)).default({}),
  zh: z.record(z.string().min(1).max(80), z.string().min(1).max(160)).default({}),
}).strict();
const logisticsSchema = {
  shippingWeightGrams: z.number().int().positive().nullable().optional(),
  packageLengthMm: z.number().int().positive().nullable().optional(),
  packageWidthMm: z.number().int().positive().nullable().optional(),
  packageHeightMm: z.number().int().positive().nullable().optional(),
  customsDescriptionEn: z.string().max(240).nullable().optional(),
  hsCode: z.string().regex(/^[0-9]{4,12}$/).nullable().optional(),
  originCountry: z.string().regex(/^[A-Z]{2}$/).nullable().optional(),
  dangerousGoods: z.boolean().optional(),
};

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

async function catalogMutation(confirm: boolean, payload: Record<string, unknown>, prepared: string, completed: string) {
  if (!confirm) return result(prepared, { ok: true, dryRun: true, proposed: payload, confirmationRequired: true });
  const body = await api("/api/agent/retail/catalog", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  const snapshot = await api("/api/agent/retail/catalog");
  return result(completed, { ...body, readback: snapshot.snapshot });
}

function queryPath(resource: string, values: Record<string, unknown>) {
  const params = new URLSearchParams({ resource });
  for (const [key, value] of Object.entries(values)) if (value !== undefined) params.set(key, String(value));
  return `/api/agent/retail/operations?${params.toString()}`;
}

async function fetchAll(resource: "orders" | "sales_detail", field: "orders" | "rows", values: Record<string, unknown>, maxRows: number) {
  const rows: unknown[] = [];
  for (let offset = 0; offset < maxRows;) {
    const limit = Math.min(250, maxRows - offset);
    const body = await api(queryPath(resource, { ...values, limit, offset }));
    const page = Array.isArray(body[field]) ? body[field] as unknown[] : [];
    rows.push(...page);
    offset += page.length;
    if (page.length < limit) break;
  }
  return rows;
}

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
function csvDocument(rows: Array<Record<string, unknown>>) {
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  return [columns.map(csvCell).join(","), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(","))].join("\n") + "\n";
}
function orderExportRow(value: unknown): Record<string, unknown> {
  const row = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const shipping = row.shipping_snapshot && typeof row.shipping_snapshot === "object" ? row.shipping_snapshot as Record<string, unknown> : {};
  return {
    id: row.id, public_id: row.public_id, paypal_order_id: row.paypal_order_id, status: row.status, currency: row.currency,
    subtotal_minor: row.subtotal_minor, shipping_minor: row.shipping_minor, tax_minor: row.tax_minor, discount_minor: row.discount_minor,
    amount_minor: row.amount_minor, refunded_minor: row.refunded_minor, fulfilment_status: row.fulfilment_status,
    carrier: row.carrier, tracking_number: row.tracking_number, shipping_method: row.shipping_method,
    created_at: row.created_at, captured_at: row.captured_at, masked_email: row.checkout_email,
    shipping_country: shipping.country, shipping_region: shipping.region, shipping_city: shipping.city, order_lines: row.order_lines,
  };
}
async function writeExport(kind: "orders" | "sales", format: "json" | "csv", rows: unknown[], requestedName?: string) {
  const root = resolve(process.env.RETAIL_AGENT_EXPORT_ROOT ?? resolve(process.cwd(), "retail-agent-exports"));
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const defaultName = `${kind}-${timestamp}.${format}`;
  const fileName = basename(requestedName || defaultName).replace(/\.(json|csv)$/i, "") + `.${format}`;
  if (!/^[A-Za-z0-9._-]+$/.test(fileName)) throw new Error("invalid_export_file_name");
  const outputPath = resolve(root, fileName);
  const rel = relative(root, outputPath);
  if (rel.startsWith("..") || isAbsolute(rel)) throw new Error("file_outside_export_root");
  await mkdir(root, { recursive: true, mode: 0o700 });
  const content = format === "json" ? `${JSON.stringify(rows, null, 2)}\n` : csvDocument(rows as Array<Record<string, unknown>>);
  await writeFile(outputPath, content, { encoding: "utf8", flag: "wx", mode: 0o600 });
  return { outputPath, rowCount: rows.length, format };
}

async function main() {
  const server = new McpServer({ name: "tranquilbeads-retail-ops", version: "1.1.0" });

  server.registerTool("retail_catalog_get", { description: "Read products, SKCs/styles, SKUs/variants, prices, stock, and product media. No write.", inputSchema: {} }, async () => result("Retail catalogue snapshot loaded.", await api("/api/agent/retail/catalog")));

  server.registerTool("retail_product_create_draft", {
    description: "Preview or create a draft retail product and its default SKU. Writes require confirm=true and a stable idempotencyKey.",
    inputSchema: { confirm: z.boolean().default(false), idempotencyKey: uuid, sku: z.string(), slug: z.string(), titleEn: z.string(), titleAr: z.string(), titleZh: z.string().optional(), descriptionEn: z.string().default(""), descriptionAr: z.string().default(""), descriptionZh: z.string().optional(), amountMinor: z.number().int().positive(), onHand: z.number().int().nonnegative().default(0) },
  }, async (args) => { const { confirm, ...input } = args; return catalogMutation(confirm, { action: "product.create", status: "draft", ...input }, "Draft product prepared; no write occurred.", "Draft product created and catalogue readback completed."); });

  server.registerTool("retail_product_update", {
    description: "Preview or update product titles, descriptions, slug, or draft/archive status. Publishing uses retail_product_publish.",
    inputSchema: { confirm: z.boolean().default(false), idempotencyKey: uuid, productId: uuid, slug: z.string().optional(), titleEn: z.string().optional(), titleAr: z.string().optional(), titleZh: z.string().optional(), descriptionEn: z.string().optional(), descriptionAr: z.string().optional(), descriptionZh: z.string().optional(), status: z.enum(["draft", "archived"]).optional() },
  }, async (args) => { const { confirm, ...input } = args; if (Object.keys(input).every((key) => key === "idempotencyKey" || key === "productId")) throw new Error("empty_update"); return catalogMutation(confirm, { action: "product.update", ...input }, "Product update prepared; no write occurred.", "Product updated and catalogue readback completed."); });

  server.registerTool("retail_product_content_replace", {
    description: "Preview or replace complete PDP highlights, detail rows, and A+ sections. Read the current content first.",
    inputSchema: { confirm: z.boolean().default(false), idempotencyKey: uuid, productId: uuid, highlights: z.array(localizedText).max(5).default([]), details: z.array(z.object({ label: localizedText, value: localizedText }).strict()).max(12).default([]), aPlus: z.array(z.object({ eyebrow: localizedText.optional(), title: localizedText, body: localizedText, image: z.string().url().optional() }).strict()).max(6).default([]) },
  }, async (args) => { const { confirm, ...input } = args; return catalogMutation(confirm, { action: "product.content.replace", ...input }, "PDP content replacement prepared; no write occurred.", "PDP content replaced and catalogue readback completed."); });

  server.registerTool("retail_style_create", {
    description: "Preview or create an SKC/style under a product.",
    inputSchema: { confirm: z.boolean().default(false), idempotencyKey: uuid, productId: uuid, code: z.string(), titleEn: z.string(), titleAr: z.string().optional(), titleZh: z.string().optional(), optionValues: localizedOptions.default({ en: {}, ar: {}, zh: {} }), primaryImageId: uuid.nullable().optional(), status: z.enum(["active", "archived"]).default("active"), position: z.number().int().min(0).max(32767).default(0) },
  }, async (args) => { const { confirm, ...input } = args; return catalogMutation(confirm, { action: "style.create", ...input }, "SKC/style creation prepared; no write occurred.", "SKC/style created and catalogue readback completed."); });

  server.registerTool("retail_style_update", {
    description: "Preview or update an SKC/style, including its primary product image.",
    inputSchema: { confirm: z.boolean().default(false), idempotencyKey: uuid, styleId: uuid, code: z.string().optional(), titleEn: z.string().optional(), titleAr: z.string().optional(), titleZh: z.string().optional(), optionValues: localizedOptions.optional(), primaryImageId: uuid.nullable().optional(), status: z.enum(["active", "archived"]).optional(), position: z.number().int().min(0).max(32767).optional() },
  }, async (args) => { const { confirm, ...input } = args; if (Object.keys(input).every((key) => key === "idempotencyKey" || key === "styleId")) throw new Error("empty_update"); return catalogMutation(confirm, { action: "style.update", ...input }, "SKC/style update prepared; no write occurred.", "SKC/style updated and catalogue readback completed."); });

  server.registerTool("retail_variant_create", {
    description: "Preview or create a sellable SKU/variant with price, stock, options, and logistics facts.",
    inputSchema: { confirm: z.boolean().default(false), idempotencyKey: uuid, productId: uuid, styleId: uuid.optional(), sku: z.string(), titleEn: z.string(), titleAr: z.string(), titleZh: z.string(), optionValues: localizedOptions, amountMinor: z.number().int().positive(), onHand: z.number().int().nonnegative(), ...logisticsSchema },
  }, async (args) => { const { confirm, ...input } = args; return catalogMutation(confirm, { action: "variant.create", ...input }, "SKU creation prepared; no write occurred.", "SKU created and catalogue readback completed."); });

  server.registerTool("retail_variant_update", {
    description: "Preview or update one SKU price, stock, titles, options, status, or logistics fields.",
    inputSchema: { confirm: z.boolean().default(false), idempotencyKey: uuid, variantId: uuid, styleId: uuid.optional(), sku: z.string().optional(), titleEn: z.string().optional(), titleAr: z.string().optional(), titleZh: z.string().optional(), optionValues: localizedOptions.optional(), amountMinor: z.number().int().positive().optional(), onHand: z.number().int().nonnegative().optional(), status: z.enum(["active", "archived"]).optional(), ...logisticsSchema },
  }, async (args) => { const { confirm, ...input } = args; if (Object.keys(input).every((key) => key === "idempotencyKey" || key === "variantId")) throw new Error("empty_update"); return catalogMutation(confirm, { action: "variant.update", ...input }, "SKU update prepared; no write occurred.", "SKU updated and catalogue readback completed."); });

  server.registerTool("retail_media_upload", {
    description: "Preview or upload one local product image from RETAIL_AGENT_MEDIA_ROOT. No remote URL fetching.",
    inputSchema: { confirm: z.boolean().default(false), idempotencyKey: uuid, productId: uuid, filePath: z.string(), altEn: z.string().max(300).default(""), altAr: z.string().max(300).default("") },
  }, async (args) => {
    const root = resolve(process.env.RETAIL_AGENT_MEDIA_ROOT ?? process.cwd());
    const filePath = resolve(isAbsolute(args.filePath) ? args.filePath : resolve(root, args.filePath));
    const rel = relative(root, filePath);
    if (rel.startsWith("..") || isAbsolute(rel)) throw new Error("file_outside_media_root");
    if (!args.confirm) return result("Media upload prepared; no write occurred.", { ok: true, dryRun: true, proposed: { productId: args.productId, file: basename(filePath), altEn: args.altEn, altAr: args.altAr }, confirmationRequired: true });
    const bytes = await readFile(filePath);
    const mime = extname(filePath).toLowerCase() === ".png" ? "image/png" : extname(filePath).toLowerCase() === ".webp" ? "image/webp" : "image/jpeg";
    const form = new FormData(); form.set("productId", args.productId); form.set("idempotencyKey", args.idempotencyKey); form.set("altEn", args.altEn); form.set("altAr", args.altAr); form.set("file", new Blob([bytes], { type: mime }), basename(filePath));
    const body = await api("/api/agent/retail/media", { method: "POST", body: form });
    const snapshot = await api("/api/agent/retail/catalog");
    return result("Product image uploaded and catalogue readback completed.", { ...body, readback: snapshot.snapshot });
  });

  server.registerTool("retail_media_reorder", { description: "Preview or replace the complete image order using the current media version.", inputSchema: { confirm: z.boolean().default(false), idempotencyKey: uuid, productId: uuid, imageIds: z.array(uuid).min(1).max(8), expectedVersion: z.number().int().nonnegative() } }, async (args) => { const { confirm, ...input } = args; return catalogMutation(confirm, { action: "media.reorder", ...input }, "Image reorder prepared; no write occurred.", "Images reordered and catalogue readback completed."); });
  server.registerTool("retail_product_publish", { description: "Preview or explicitly publish one fully prepared product. Verified product media is required.", inputSchema: { confirm: z.boolean().default(false), idempotencyKey: uuid, productId: uuid } }, async (args) => { const { confirm, ...input } = args; return catalogMutation(confirm, { action: "product.update", status: "published", ...input }, "Product publication prepared; inspect the public preview before confirming.", "Product published and catalogue readback completed."); });

  server.registerTool("retail_inventory_get", { description: "Read product inventory balances and ledger entries.", inputSchema: { productId: uuid.optional() } }, async (args) => result("Inventory loaded.", await api(queryPath("inventory", args))));
  server.registerTool("retail_inventory_adjust", { description: "Preview or apply a signed inventory adjustment with before/after readback.", inputSchema: { confirm: z.boolean().default(false), idempotencyKey: uuid, productId: uuid, delta: z.number().int().refine((value) => value !== 0), reason: z.string().min(1).max(200) } }, async (args) => result(args.confirm ? "Inventory adjustment applied with readback." : "Inventory adjustment previewed; no write occurred.", await api("/api/agent/retail/operations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "inventory.adjust", ...args }) })));
  server.registerTool("retail_orders_list", { description: "Read a paginated order page with customer and address fields redacted.", inputSchema: { status: z.string().optional(), dateFrom: z.string().datetime({ offset: true }).optional(), dateTo: z.string().datetime({ offset: true }).optional(), offset: z.number().int().nonnegative().default(0), limit: z.number().int().min(1).max(250).default(50) } }, async (args) => result("Redacted orders loaded.", await api(queryPath("orders", args))));
  server.registerTool("retail_orders_export", { description: "Export redacted orders and order lines to a local JSON or CSV file under RETAIL_AGENT_EXPORT_ROOT.", inputSchema: { format: z.enum(["json", "csv"]).default("csv"), fileName: z.string().max(180).optional(), status: z.string().optional(), dateFrom: z.string().datetime({ offset: true }).optional(), dateTo: z.string().datetime({ offset: true }).optional(), maxRows: z.number().int().min(1).max(10_000).default(5_000) } }, async (args) => { const rows = await fetchAll("orders", "orders", { status: args.status, dateFrom: args.dateFrom, dateTo: args.dateTo }, args.maxRows); const exportedRows = args.format === "csv" ? rows.map(orderExportRow) : rows; return result("Redacted order export written locally.", { ok: true, ...(await writeExport("orders", args.format, exportedRows, args.fileName)) }); });
  server.registerTool("retail_order_fulfil", { description: "Preview or mark an order fulfilled with carrier and tracking; returns redacted before/after readback.", inputSchema: { confirm: z.boolean().default(false), idempotencyKey: uuid, orderId: z.number().int().positive(), carrier: z.string().max(100), tracking: z.string().max(200), note: z.string().max(2000).default("") } }, async (args) => result(args.confirm ? "Order fulfilment applied with readback." : "Order fulfilment previewed; no write occurred.", await api("/api/agent/retail/operations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "order.fulfil", ...args }) })));
  server.registerTool("retail_sales_summary", { description: "Read aggregate paid order, revenue, refund, and fulfilment counts. No customer data.", inputSchema: { days: z.number().int().min(1).max(365).default(30) } }, async (args) => result("Sales summary loaded.", await api(queryPath("sales", args))));
  server.registerTool("retail_sales_breakdown", { description: "Read paginated paid-sales data grouped by day or SKU. No customer data.", inputSchema: { groupBy: z.enum(["day", "sku"]).default("sku"), sku: z.string().optional(), dateFrom: z.string().datetime({ offset: true }).optional(), dateTo: z.string().datetime({ offset: true }).optional(), offset: z.number().int().nonnegative().default(0), limit: z.number().int().min(1).max(250).default(100) } }, async (args) => result("Sales breakdown loaded.", await api(queryPath("sales_detail", args))));
  server.registerTool("retail_sales_export", { description: "Export paid sales grouped by day or SKU to a local JSON or CSV file under RETAIL_AGENT_EXPORT_ROOT.", inputSchema: { format: z.enum(["json", "csv"]).default("csv"), fileName: z.string().max(180).optional(), groupBy: z.enum(["day", "sku"]).default("sku"), sku: z.string().optional(), dateFrom: z.string().datetime({ offset: true }).optional(), dateTo: z.string().datetime({ offset: true }).optional(), maxRows: z.number().int().min(1).max(10_000).default(5_000) } }, async (args) => { const rows = await fetchAll("sales_detail", "rows", { groupBy: args.groupBy, sku: args.sku, dateFrom: args.dateFrom, dateTo: args.dateTo }, args.maxRows); return result("Sales export written locally.", { ok: true, groupBy: args.groupBy, ...(await writeExport("sales", args.format, rows, args.fileName)) }); });
  server.registerTool("retail_activity_log", { description: "Read recent admin and Agent activity receipts.", inputSchema: { limit: z.number().int().min(1).max(100).default(50) } }, async (args) => result("Activity log loaded.", await api(queryPath("audit", args))));

  await server.connect(new StdioServerTransport());
}

void main();
