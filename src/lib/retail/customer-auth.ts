import "server-only";

import crypto from "node:crypto";
import { cookies } from "next/headers";

import { guardedRetailSql } from "./database-identity";
import type { Locale } from "@/src/lib/i18n";

const COOKIE = "retail_customer_session";
const TOKEN_BYTES = 32;
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
const HASH_RE = /^[0-9a-f]{64}$/;
const LINK_TTL_MS = 15 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const sha256 = (value: string) => crypto.createHash("sha256").update(value, "utf8").digest("hex");
const opaque = () => crypto.randomBytes(TOKEN_BYTES).toString("base64url");
// Customer sessions are never allowed over a plaintext connection. Preview and
// production are HTTPS; local HTTP deliberately cannot exercise a real login.
const cookieOptions = () => ({ httpOnly: true, secure: true, sameSite: "lax" as const, maxAge: Math.floor(SESSION_TTL_MS / 1000), path: "/" });

export type CustomerAccount = { customerPublicId: string; email: string; name: string; orders: CustomerAccountOrder[]; addresses: CustomerAccountAddress[]; marketingConsentActive: boolean };
export type CustomerAccountOrder = { publicId: string; status: string; fulfilmentStatus: string; currency: string; amountMinor: number; orderedAt: string; carrier: string | null; trackingNumber: string | null };
export type CustomerAccountAddress = { id: string; recipient: string; line1: string; line2: string | null; city: string; region: string | null; postalCode: string | null; country: string; phone: string | null; isDefault: boolean };

function validOpaque(value: string) { return TOKEN_RE.test(value) && Buffer.from(value, "base64url").length === TOKEN_BYTES; }
function siteUrl() { return process.env.NEXT_PUBLIC_SITE_URL || "https://www.tranquilbeads.com"; }

export function customerAccountVerifyUrl(token: string, locale: Locale) {
  if (!validOpaque(token)) throw new Error("customer_account_unavailable");
  return new URL(`/api/retail/customer-auth/verify?token=${encodeURIComponent(token)}&locale=${locale === "ar" ? "ar" : "en"}`, siteUrl()).toString();
}

export async function issueCustomerLoginLink(email: string) {
  const normalized = email.trim().toLowerCase();
  const token = opaque();
  const rows = await guardedRetailSql()`SELECT retail_issue_customer_login_token(${normalized},${sha256(token)},${new Date(Date.now() + LINK_TTL_MS).toISOString()}::timestamptz) AS issued`;
  return { issued: rows[0]?.issued === true, token };
}

/** An outbox retry reuses one deterministic bearer instead of creating a
 * competing account email with a new link. */
export async function issueNotificationCustomerLoginLink(email: string, notificationId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(notificationId)) throw new Error("customer_account_unavailable");
  const secret = process.env.RETAIL_PORTAL_TOKEN_SECRET;
  if (!secret || secret.length < 32) throw new Error("customer_account_unavailable");
  const token = crypto.createHmac("sha256", secret).update(`retail-account-access:${notificationId}`, "utf8").digest().subarray(0, TOKEN_BYTES).toString("base64url");
  const rows = await guardedRetailSql()`SELECT retail_issue_notification_customer_login_token(${email.trim().toLowerCase()},${notificationId}::uuid,${sha256(token)},${new Date(Date.now() + LINK_TTL_MS).toISOString()}::timestamptz) AS issued`;
  if (rows[0]?.issued !== true) throw new Error("customer_account_unavailable");
  return { token };
}

export async function redeemCustomerLoginLink(token: string) {
  if (!validOpaque(token)) return null;
  const session = opaque();
  const rows = await guardedRetailSql()`SELECT * FROM retail_redeem_customer_login_token(${sha256(token)},${sha256(session)},${new Date(Date.now() + SESSION_TTL_MS).toISOString()}::timestamptz)`;
  const row = rows[0];
  if (!row) return null;
  return { session, customer: { customerPublicId: String(row.customer_public_id), email: String(row.email), name: String(row.name) } };
}

export async function setCustomerSession(session: string) {
  if (!validOpaque(session)) throw new Error("customer_account_unavailable");
  (await cookies()).set(COOKIE, session, cookieOptions());
}

export async function clearCustomerSession() {
  (await cookies()).set(COOKIE, "", { ...cookieOptions(), maxAge: 0 });
}

export async function revokeCustomerSession(session: string | undefined) {
  if (!session || !validOpaque(session)) return false;
  const hash = sha256(session);
  if (!HASH_RE.test(hash)) return false;
  const rows = await guardedRetailSql()`SELECT retail_revoke_customer_session(${hash}) AS revoked`;
  return rows[0]?.revoked === true;
}

function asArray<T>(value: unknown): T[] { return Array.isArray(value) ? value as T[] : []; }
export async function getCustomerAccount(session?: string): Promise<CustomerAccount | null> {
  const cookie = session ?? (await cookies()).get(COOKIE)?.value;
  if (!cookie || !validOpaque(cookie)) return null;
  const rows = await guardedRetailSql()`SELECT * FROM retail_customer_account(${sha256(cookie)})`;
  const row = rows[0];
  if (!row) return null;
  return { customerPublicId: String(row.customer_public_id), email: String(row.email), name: String(row.name), orders: asArray<CustomerAccountOrder>(row.orders), addresses: asArray<CustomerAccountAddress>(row.addresses), marketingConsentActive: row.marketing_consent_active === true };
}

export async function withdrawCustomerMarketingConsent() {
  const session = (await cookies()).get(COOKIE)?.value;
  if (!session || !validOpaque(session)) return 0;
  const rows = await guardedRetailSql()`SELECT retail_withdraw_customer_marketing_consent(${sha256(session)}) AS affected`;
  return Number(rows[0]?.affected ?? 0);
}

export async function sendCustomerLoginEmail(email: string, token: string, locale: Locale, fetcher: typeof fetch = fetch) {
  const apiKey = process.env.RETAIL_RESEND_API_KEY, from = process.env.RETAIL_EMAIL_FROM, replyTo = process.env.RETAIL_EMAIL_REPLY_TO;
  if (!apiKey || !from || !validOpaque(token)) return false;
  const link = customerAccountVerifyUrl(token, locale);
  const ar = locale === "ar";
  const subject = ar ? "رابط الدخول إلى حساب TranquilBeads" : "Your TranquilBeads account sign-in link";
  const detail = ar ? "استخدم هذا الرابط لعرض طلباتك وعناوينك. تنتهي صلاحيته خلال 15 دقيقة." : "Use this link to view your orders and addresses. It expires in 15 minutes.";
  const response = await fetcher("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" }, body: JSON.stringify({ from, to: [email], subject, html: `<p>${detail}</p><p><a href="${link}">${ar ? "فتح الحساب" : "Open your account"}</a></p>`, ...(replyTo ? { reply_to: replyTo } : {}) }), cache: "no-store" });
  return response.ok;
}
