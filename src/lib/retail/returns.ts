import "server-only";

import crypto from "node:crypto";
import { z } from "zod";

import { currentRetailAdminActor, hasRetailPermission } from "./admin-auth";
import { guardedRetailSql } from "./database-identity";

const tokenPattern = /^[A-Za-z0-9_-]{43}$/;
const uuid = z.string().uuid();

export const customerReturnDto = z.object({
  lines: z.array(z.object({ lineId: uuid, quantity: z.number().int().positive().max(999) }).strict()).min(1).max(20),
  reason: z.string().trim().min(1).max(1000),
  customerNote: z.string().max(2000).default(""),
  idempotencyKey: uuid,
}).strict();

export const adminReturnTransitionDto = z.object({
  status: z.enum(["authorized", "in_transit", "received", "inspected", "approved", "rejected", "refund_pending", "refunded", "closed", "cancelled"]),
  adminNote: z.string().max(2000).default(""),
  sellableRestock: z.boolean().default(false),
  idempotencyKey: uuid,
}).strict();

export const adminReturnRefundLinkDto = z.object({ refundRequestId: uuid, idempotencyKey: uuid }).strict();

function tokenHash(token: string) {
  if (!tokenPattern.test(token) || Buffer.from(token, "base64url").length !== 32) throw new Error("portal_unavailable");
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

function actor() {
  const current = currentRetailAdminActor();
  if (!current) throw new Error("admin_actor_missing");
  return current;
}

function returnsManager({ sellableRestock = false, refundLink = false }: { sellableRestock?: boolean; refundLink?: boolean } = {}) {
  const current = actor();
  if (!hasRetailPermission(current, "returns:manage")) throw new Error("forbidden");
  if (sellableRestock && !hasRetailPermission(current, "inventory:write")) throw new Error("forbidden");
  if (refundLink && !hasRetailPermission(current, "orders:refund")) throw new Error("forbidden");
  return current;
}

export async function listCustomerReturns(token: string) {
  const rows = await guardedRetailSql()`SELECT * FROM retail_customer_list_returns(${tokenHash(token)})`;
  return rows.map(({ admin_note: _adminNote, ...row }) => ({ ...row, lines: Array.isArray(row.lines) ? row.lines : [] }));
}

export async function listCustomerReturnableLines(token: string) {
  const rows = await guardedRetailSql()`SELECT * FROM retail_customer_returnable_lines(${tokenHash(token)})`;
  return rows.map((row) => ({
    lineId: String(row.line_id), sku: String(row.variant_sku), titleEn: String(row.title_en), titleAr: String(row.title_ar), titleZh: String(row.title_zh),
    purchasedQuantity: Number(row.purchased_quantity), remainingQuantity: Number(row.remaining_quantity),
  }));
}

export async function createCustomerReturn(token: string, input: z.infer<typeof customerReturnDto>) {
  const rows = await guardedRetailSql()`SELECT * FROM retail_customer_create_return(${tokenHash(token)},${JSON.stringify(input.lines.map((line) => ({ lineId: line.lineId, quantity: line.quantity })))}::jsonb,${input.reason},${input.customerNote},${input.idempotencyKey}::uuid)`;
  if (!rows[0]) throw new Error("return_unavailable");
  return { publicId: String(rows[0].public_id), status: String(rows[0].status) };
}

export async function listAdminReturns(status?: string) {
  const a = returnsManager();
  const rows = await guardedRetailSql()`SELECT * FROM retail_admin_list_returns(${status ?? null}::text,${a.id},${a.name},${a.role},${a.legacy})`;
  return rows.map(({ customer_note: _customerNote, admin_note: _adminNote, ...row }) => ({ ...row, lines: Array.isArray(row.lines) ? row.lines : [] }));
}

export async function getAdminReturnNotes(publicId: string) {
  const a = returnsManager();
  if (!hasRetailPermission(a, "orders:pii")) throw new Error("forbidden");
  // These must remain separate statements: the audit insert is committed by
  // the first database request before the following query reads PII.
  await guardedRetailSql()`SELECT retail_record_admin_return_notes_pii_view(${publicId}::uuid,${a.id},${a.name},${a.role},${a.legacy})`;
  const rows = await guardedRetailSql()`SELECT * FROM retail_admin_get_return_notes(${publicId}::uuid,${a.id},${a.name},${a.role},${a.legacy})`;
  if (!rows[0]) throw new Error("return_not_found");
  return { customerNote: String(rows[0].customer_note), adminNote: String(rows[0].admin_note) };
}

export async function transitionAdminReturn(publicId: string, input: z.infer<typeof adminReturnTransitionDto>) {
  const a = returnsManager({ sellableRestock: input.sellableRestock });
  const rows = await guardedRetailSql()`SELECT * FROM retail_admin_transition_return(${publicId}::uuid,${input.status},${input.adminNote},${input.sellableRestock},${input.idempotencyKey}::uuid,${a.id},${a.name},${a.role},${a.legacy})`;
  if (!rows[0]) throw new Error("return_not_found");
  return { publicId: String(rows[0].public_id), status: String(rows[0].status), replayed: Boolean(rows[0].replayed) };
}

export async function linkAdminReturnRefund(publicId: string, input: z.infer<typeof adminReturnRefundLinkDto>) {
  const a = returnsManager({ refundLink: true });
  const rows = await guardedRetailSql()`SELECT retail_admin_link_return_refund(${publicId}::uuid,${input.refundRequestId}::uuid,${input.idempotencyKey}::uuid,${a.id},${a.name},${a.role},${a.legacy}) AS linked`;
  if (!rows[0]?.linked) throw new Error("return_refund_link_unavailable");
}
