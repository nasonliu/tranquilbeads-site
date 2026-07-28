import "server-only";

import crypto from "node:crypto";

import { guardedRetailSql } from "./database-identity";

const TOKEN_BYTES = 32;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const HASH_PATTERN = /^[0-9a-f]{64}$/;
// Thirty days covers normal fulfilment while limiting the lifetime of a
// bearer credential. A resend/reissue rotates and revokes the old link.
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type CustomerPortalOrder = {
  orderPublicId: string;
  paymentStatus: string;
  fulfilmentStatus: string;
  currency: string;
  amountMinor: number;
  orderedAt: string;
  carrier: string | null;
  trackingNumber: string | null;
  items: Array<{ titleEn?: string | null; titleAr?: string | null; titleZh?: string | null; quantity?: number }>;
};

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

function validToken(token: string) {
  return TOKEN_PATTERN.test(token) && Buffer.from(token, "base64url").length === TOKEN_BYTES;
}

export async function issueCustomerPortalToken(orderId: number) {
  if (!Number.isSafeInteger(orderId) || orderId < 1) throw new Error("customer_portal_unavailable");
  const token = crypto.randomBytes(TOKEN_BYTES).toString("base64url");
  const expiresAt = new Date(Date.now() + TTL_MS);
  const rows = await guardedRetailSql()`SELECT retail_issue_customer_portal_token(${orderId},${hashToken(token)},${expiresAt.toISOString()}::timestamptz) AS id`;
  if (!rows[0]?.id) throw new Error("customer_portal_unavailable");
  return { token, expiresAt };
}

export async function redeemCustomerPortalToken(token: string): Promise<CustomerPortalOrder | null> {
  if (!validToken(token)) return null;
  const rows = await guardedRetailSql()`SELECT * FROM retail_redeem_customer_portal_token(${hashToken(token)})`;
  const row = rows[0];
  if (!row) return null;
  return {
    orderPublicId: String(row.order_public_id),
    paymentStatus: String(row.payment_status),
    fulfilmentStatus: String(row.fulfilment_status),
    currency: String(row.currency).trim(),
    amountMinor: Number(row.amount_minor),
    orderedAt: new Date(String(row.ordered_at)).toISOString(),
    carrier: row.carrier === null ? null : String(row.carrier),
    trackingNumber: row.tracking_number === null ? null : String(row.tracking_number),
    items: Array.isArray(row.items) ? row.items : [],
  };
}

export async function revokeCustomerPortalTokens(orderId: number) {
  if (!Number.isSafeInteger(orderId) || orderId < 1) return 0;
  const rows = await guardedRetailSql()`SELECT retail_revoke_customer_portal_tokens(${orderId}) AS revoked`;
  return Number(rows[0]?.revoked ?? 0);
}

export function customerPortalUrl(token: string, locale = "en") {
  if (!validToken(token)) throw new Error("customer_portal_unavailable");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.tranquilbeads.com";
  return new URL(`/${locale}/shop/account/${token}`, siteUrl).toString();
}
