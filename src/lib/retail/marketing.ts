import "server-only";

import crypto from "node:crypto";
import { z } from "zod";

import type { RetailAdminActor } from "./admin-auth";
import { guardedRetailSql } from "./database-identity";

export const marketingSubscribeDto = z.object({
  email: z.string().trim().email().max(320),
  locale: z.enum(["en", "ar"]),
}).strict();

export const marketingStatusDto = z.object({
  status: z.enum(["active", "unsubscribed", "suppressed"]),
  idempotencyKey: z.string().uuid(),
}).strict();

const TOKEN_BYTES = 32;
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
const CONFIRM_TTL_MS = 24 * 60 * 60 * 1000;
const sha256 = (value: string) => crypto.createHash("sha256").update(value, "utf8").digest("hex");

export async function requestMarketingSubscription(email: string, locale: "en" | "ar") {
  const token = crypto.randomBytes(TOKEN_BYTES).toString("base64url");
  const rows = await guardedRetailSql()`SELECT * FROM retail_request_marketing_subscription(
    ${email},${locale},${sha256(token)},${new Date(Date.now() + CONFIRM_TTL_MS).toISOString()}::timestamptz
  )`;
  return { shouldSend: rows[0]?.should_send === true, token };
}

export async function confirmMarketingSubscription(token: string) {
  if (!TOKEN_RE.test(token) || Buffer.from(token, "base64url").length !== TOKEN_BYTES) return false;
  const rows = await guardedRetailSql()`SELECT retail_confirm_marketing_subscription(${sha256(token)}) AS confirmed`;
  return rows[0]?.confirmed === true;
}

function allowedOrigin(origin?: string) {
  const fallback = new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.tranquilbeads.com");
  try {
    const candidate = origin ? new URL(origin) : fallback;
    const preview = candidate.protocol === "https:" && candidate.hostname.endsWith(".vercel.app");
    return candidate.protocol === "https:" && (candidate.hostname === fallback.hostname || preview) ? candidate.origin : fallback.origin;
  } catch { return fallback.origin; }
}

export function marketingConfirmationUrl(token: string, locale: "en" | "ar", origin?: string) {
  if (!TOKEN_RE.test(token)) throw new Error("marketing_confirmation_unavailable");
  const url = new URL("/api/retail/marketing/confirm", allowedOrigin(origin));
  url.searchParams.set("token", token); url.searchParams.set("locale", locale);
  return url.toString();
}

export async function sendMarketingConfirmationEmail(email: string, token: string, locale: "en" | "ar", origin?: string, fetcher: typeof fetch = fetch) {
  const apiKey = process.env.RETAIL_RESEND_API_KEY, from = process.env.RETAIL_EMAIL_FROM, replyTo = process.env.RETAIL_EMAIL_REPLY_TO;
  if (!apiKey || !from || !TOKEN_RE.test(token)) return false;
  const ar = locale === "ar", link = marketingConfirmationUrl(token, locale, origin);
  const subject = ar ? "تأكيد الاشتراك في عروض TranquilBeads" : "Confirm your TranquilBeads email subscription";
  const detail = ar ? "أكد بريدك الإلكتروني لتلقي العروض والمنتجات الجديدة. تنتهي صلاحية الرابط خلال 24 ساعة." : "Confirm your email to receive occasional offers and new-product updates. This link expires in 24 hours.";
  const response = await fetcher("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" }, body: JSON.stringify({ from, to: [email], subject, html: `<p>${detail}</p><p><a href="${link}">${ar ? "تأكيد الاشتراك" : "Confirm subscription"}</a></p>`, ...(replyTo ? { reply_to: replyTo } : {}) }), cache: "no-store" });
  return response.ok;
}

export async function unsubscribeMarketing(publicId: string) {
  const rows = await guardedRetailSql()`SELECT retail_unsubscribe_marketing(${publicId}::uuid) AS unsubscribed`;
  return rows[0]?.unsubscribed === true;
}

export async function listMarketingSubscribers(actor: RetailAdminActor, action: "view" | "export" = "view") {
  const query = guardedRetailSql();
  await query`INSERT INTO retail_admin_audit(action,entity_type,detail,actor_id,actor_name,actor_role,legacy_actor)
    VALUES(${`marketing_list.${action}`},'marketing_list',jsonb_build_object('purpose',${action}),${actor.id},${actor.name},${actor.role},${actor.legacy})`;
  return query`SELECT public_id,email,locale,source,status,consented_at,unsubscribed_at,updated_at
    FROM retail_marketing_subscribers ORDER BY consented_at DESC LIMIT 5000`;
}

export async function setMarketingSubscriberStatus(publicId: string, input: z.infer<typeof marketingStatusDto>, actor: RetailAdminActor) {
  const rows = await guardedRetailSql()`SELECT * FROM retail_admin_set_marketing_status_as_actor(
    ${publicId}::uuid,${input.status},${input.idempotencyKey}::uuid,${actor.id},${actor.name},${actor.role},${actor.legacy}
  )`;
  if (!rows[0]) throw new Error("marketing_subscriber_not_found");
  return { publicId: String(rows[0].public_id), status: String(rows[0].status), replayed: rows[0].replayed === true };
}
