import "server-only";

import crypto from "node:crypto";
import { z } from "zod";

import type { RetailAdminActor } from "./admin-auth";
import { guardedRetailSql, type RetailSql } from "./database-identity";

type SettlementRow = {
  transactionId: string; transactionType: string; transactionStatus: string; currency: "USD";
  grossMinor: number | null; feeMinor: number | null; netMinor: number | null;
  relatedCaptureId: string | null; payoutId: string | null; payoutItemId: string | null; occurredAt: string | null;
};
type Sql = RetailSql;
const identifier = /^[A-Za-z0-9_-]{1,127}$/;
const noControl = /^[^\u0000-\u001f\u007f]*$/;
const cleanText = (value: unknown, max: number) => typeof value === "string" && noControl.test(value.trim()) ? value.trim().slice(0, max) : "";

function sql(): Sql { return guardedRetailSql(); }
function field(record: Record<string, unknown>, ...names: string[]) {
  const wanted = new Set(names.map((name) => name.toLowerCase().replace(/[^a-z0-9]/g, "")));
  for (const [key, value] of Object.entries(record)) if (wanted.has(key.toLowerCase().replace(/[^a-z0-9]/g, ""))) return value;
  return undefined;
}
function nullableIdentifier(value: unknown) { const text = cleanText(value, 127); return text && identifier.test(text) ? text : null; }
function moneyMinor(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const raw = String(value).trim().replace(/[$,\s]/g, "");
  const negative = /^\(.*\)$/.test(raw) || raw.startsWith("-");
  const digits = raw.replace(/[()]/g, "").replace(/^[+-]/, "");
  if (!/^\d+(?:\.\d{1,2})?$/.test(digits)) throw new Error("invalid settlement amount");
  const [whole, fraction = ""] = digits.split(".");
  const cents = Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
  if (!Number.isSafeInteger(cents) || cents > 9_000_000_000_000) throw new Error("invalid settlement amount");
  return negative ? -cents : cents;
}
function occurredAt(value: unknown): string | null {
  const raw = cleanText(value, 80); if (!raw) return null;
  const date = new Date(raw); if (!Number.isFinite(date.valueOf())) throw new Error("invalid settlement date");
  return date.toISOString();
}
function normalizeRecord(record: Record<string, unknown>): SettlementRow {
  const transactionId = nullableIdentifier(field(record, "transactionId", "transaction id", "transaction_id"));
  const transactionType = cleanText(field(record, "transactionType", "transaction type", "type"), 80);
  const transactionStatus = cleanText(field(record, "transactionStatus", "transaction status", "status"), 80);
  const currency = cleanText(field(record, "currency", "currency code"), 3).toUpperCase();
  if (!transactionId || !transactionType || !transactionStatus || currency !== "USD") throw new Error("invalid settlement row");
  const grossMinor = moneyMinor(field(record, "gross", "gross amount", "grossMinor"));
  const feeMinor = moneyMinor(field(record, "fee", "fee amount", "feeMinor"));
  const netMinor = moneyMinor(field(record, "net", "net amount", "netMinor"));
  if (grossMinor === null && feeMinor === null && netMinor === null) throw new Error("settlement row has no amount");
  if (grossMinor !== null && feeMinor !== null && netMinor !== null && grossMinor + feeMinor !== netMinor) throw new Error("settlement amount mismatch");
  return {
    transactionId, transactionType, transactionStatus, currency: "USD", grossMinor, feeMinor, netMinor,
    relatedCaptureId: nullableIdentifier(field(record, "relatedCaptureId", "reference txn id", "reference transaction id", "related capture id", "capture id")),
    payoutId: nullableIdentifier(field(record, "payoutId", "payout id", "payout batch id")),
    payoutItemId: nullableIdentifier(field(record, "payoutItemId", "payout item id")),
    occurredAt: occurredAt(field(record, "occurredAt", "transaction updated date", "transaction initiation date", "date")),
  };
}

/** Strict RFC4180-style parser; only the allowlisted fields below are retained. */
export function parseSettlementCsv(content: string): SettlementRow[] {
  if (Buffer.byteLength(content, "utf8") > 1_000_000) throw new Error("settlement import too large");
  const rows: string[][] = [[]]; let cell = ""; let quoted = false;
  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    if (quoted) { if (char === '"' && content[index + 1] === '"') { cell += char; index += 1; } else if (char === '"') quoted = false; else cell += char; continue; }
    if (char === '"') { if (cell) throw new Error("invalid settlement csv"); quoted = true; }
    else if (char === ",") { rows[rows.length - 1].push(cell); cell = ""; }
    else if (char === "\n" || char === "\r") { if (char === "\r" && content[index + 1] === "\n") index += 1; rows[rows.length - 1].push(cell); cell = ""; if (rows.length > 10_001) throw new Error("settlement import has too many rows"); rows.push([]); }
    else cell += char;
  }
  if (quoted) throw new Error("invalid settlement csv");
  rows[rows.length - 1].push(cell);
  const nonempty = rows.filter((row) => row.some((value) => value.trim() !== ""));
  if (nonempty.length < 2) throw new Error("settlement csv has no transactions");
  const [headers, ...data] = nonempty; if (headers.length > 40 || headers.some((header) => header.length > 120)) throw new Error("invalid settlement csv headers");
  return data.map((row) => normalizeRecord(Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""]))));
}

export function parseSettlementJson(content: string): SettlementRow[] {
  if (Buffer.byteLength(content, "utf8") > 1_000_000) throw new Error("settlement import too large");
  let parsed: unknown; try { parsed = JSON.parse(content); } catch { throw new Error("invalid settlement json"); }
  const values = Array.isArray(parsed) ? parsed : parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>).transactions : undefined;
  if (!Array.isArray(values) || values.length === 0 || values.length > 10_000) throw new Error("invalid settlement json");
  return values.map((value) => { if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid settlement row"); return normalizeRecord(value as Record<string, unknown>); });
}

export const settlementImportDto = z.object({
  filename: z.string().trim().min(1).max(160).regex(/^[A-Za-z0-9._ -]+$/),
  format: z.enum(["csv", "json"]), content: z.string().min(1).max(1_000_000), idempotencyKey: z.string().uuid(),
}).strict();
export const settlementCloseDto = z.object({ idempotencyKey: z.string().uuid(), note: z.string().trim().min(1).max(500) }).strict();

export async function importPayPalSettlement(input: z.infer<typeof settlementImportDto>, principal: RetailAdminActor) {
  const rows = input.format === "csv" ? parseSettlementCsv(input.content) : parseSettlementJson(input.content);
  const hash = crypto.createHash("sha256").update(input.content).digest("hex"); const q = sql();
  const result = await q`SELECT * FROM retail_import_paypal_settlement_as_actor(${hash},${input.format},${input.filename},${JSON.stringify(rows)}::jsonb,${input.idempotencyKey}::uuid,${principal.id},${principal.name},${principal.role},${principal.legacy})`;
  return result[0] ?? null;
}
export async function listPayPalSettlementImports() { const q = sql(); return q`SELECT i.id,i.content_sha256,i.source_format,i.source_name,i.row_count,i.imported_by,i.imported_at,i.closed_at,i.closed_by,i.close_note,COALESCE(e.open_count,0)::int open_exceptions FROM retail_paypal_settlement_imports i LEFT JOIN LATERAL(SELECT count(*) open_count FROM retail_paypal_settlement_exceptions e WHERE e.import_id=i.id AND e.state='open') e ON true ORDER BY i.imported_at DESC LIMIT 200`; }
export async function listPayPalSettlementExceptions(state = "open") { const q = sql(); return q`SELECT e.id,e.import_id,e.settlement_transaction_id,e.code,e.state,e.closed_at,e.closed_by,e.close_note,e.created_at,t.paypal_transaction_id,t.related_capture_id,t.gross_minor,t.fee_minor,t.net_minor FROM retail_paypal_settlement_exceptions e LEFT JOIN retail_paypal_settlement_transactions t ON t.id=e.settlement_transaction_id WHERE e.state=${state} ORDER BY e.created_at DESC LIMIT 500`; }
export async function listPayPalSettlementDetails(input: { limit: number; offset: number }) {
  const q = sql(); const { limit, offset } = input;
  const [transactions, matches, payouts, payoutItems] = await Promise.all([
    q`SELECT t.id,t.paypal_transaction_id,t.first_import_id,t.transaction_type,t.transaction_status,t.currency,t.gross_minor,t.fee_minor,t.net_minor,t.related_capture_id,t.payout_id,t.payout_item_id,t.occurred_at,t.created_at,COALESCE(m.match_count,0)::int match_count,COALESCE(e.open_exception_count,0)::int open_exception_count FROM retail_paypal_settlement_transactions t LEFT JOIN LATERAL(SELECT count(*) match_count FROM retail_paypal_settlement_matches m WHERE m.settlement_transaction_id=t.id) m ON true LEFT JOIN LATERAL(SELECT count(*) open_exception_count FROM retail_paypal_settlement_exceptions e WHERE e.settlement_transaction_id=t.id AND e.state='open') e ON true ORDER BY COALESCE(t.occurred_at,t.created_at) DESC,t.id LIMIT ${limit} OFFSET ${offset}`,
    q`SELECT m.id,m.settlement_transaction_id,m.ledger_id,m.match_kind,m.created_at,t.paypal_transaction_id,l.kind AS ledger_kind,l.amount_minor,l.currency,l.paypal_reference FROM retail_paypal_settlement_matches m JOIN retail_paypal_settlement_transactions t ON t.id=m.settlement_transaction_id JOIN retail_payment_ledger l ON l.id=m.ledger_id ORDER BY m.created_at DESC,m.id LIMIT ${limit} OFFSET ${offset}`,
    q`SELECT paypal_payout_id,status,currency,amount_minor,occurred_at,first_import_id,created_at FROM retail_paypal_payouts ORDER BY COALESCE(occurred_at,created_at) DESC,paypal_payout_id LIMIT ${limit} OFFSET ${offset}`,
    q`SELECT i.id,i.paypal_payout_id,i.settlement_transaction_id,i.paypal_payout_item_id,i.amount_minor,i.created_at,t.paypal_transaction_id FROM retail_paypal_payout_items i JOIN retail_paypal_settlement_transactions t ON t.id=i.settlement_transaction_id ORDER BY i.created_at DESC,i.id LIMIT ${limit} OFFSET ${offset}`,
  ]);
  return { transactions, matches, payouts, payoutItems, page: { limit, offset } };
}
export async function closePayPalSettlementException(id: string, input: z.infer<typeof settlementCloseDto>, principal: RetailAdminActor) { const q = sql(); const rows = await q`SELECT retail_close_paypal_settlement_exception_as_actor(${id}::uuid,${input.note},${input.idempotencyKey}::uuid,${principal.id},${principal.name},${principal.role},${principal.legacy}) AS closed`; if (!rows[0]?.closed) throw new Error("settlement_exception_not_found"); }
