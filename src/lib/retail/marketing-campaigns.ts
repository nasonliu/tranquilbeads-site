import "server-only";

import crypto from "node:crypto";
import { z } from "zod";

import type { RetailAdminActor } from "./admin-auth";
import { guardedRetailSql } from "./database-identity";

const localizedCopy = {
  name: z.string().trim().min(1).max(120),
  subjectEn: z.string().trim().min(1).max(160), subjectAr: z.string().trim().min(1).max(160),
  bodyEn: z.string().trim().min(1).max(8_000), bodyAr: z.string().trim().min(1).max(8_000),
  ctaLabelEn: z.string().trim().min(1).max(80).optional(), ctaLabelAr: z.string().trim().min(1).max(80).optional(),
  ctaUrl: z.string().trim().max(2_048).optional(),
};

export const marketingCampaignCreateDto = z.object({
  ...localizedCopy,
  idempotencyKey: z.string().uuid(),
}).strict().superRefine((value, ctx) => {
  if (Boolean(value.ctaUrl) !== Boolean(value.ctaLabelEn && value.ctaLabelAr)) ctx.addIssue({ code: "custom", message: "CTA URL and both labels are required together" });
  if (value.ctaUrl && !value.ctaUrl.startsWith("/") && !value.ctaUrl.startsWith("https://")) ctx.addIssue({ code: "custom", message: "CTA URL must be HTTPS or a site path" });
});

export const marketingCampaignScheduleDto = z.object({
  scheduledAt: z.string().datetime({ offset: true }), confirm: z.literal(true), idempotencyKey: z.string().uuid(),
}).strict();
export const marketingCampaignCancelDto = z.object({ confirm: z.literal(true), idempotencyKey: z.string().uuid() }).strict();
export const marketingCampaignTestDto = z.object({ email: z.string().trim().email().max(320), locale: z.enum(["en", "ar"]), confirm: z.literal(true) }).strict();

function siteOrigin() {
  try { return new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.tranquilbeads.com").origin; }
  catch { return "https://www.tranquilbeads.com"; }
}

function safeCtaUrl(value: string | null) {
  if (!value) return null;
  if (value.startsWith("/")) return new URL(value, siteOrigin()).toString();
  try {
    const candidate = new URL(value);
    const configured = new URL(siteOrigin());
    if (candidate.protocol === "https:" && candidate.hostname === configured.hostname) return candidate.toString();
  } catch { /* rejected below */ }
  throw new Error("invalid_campaign_url");
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]!));

function campaignHtml(row: Record<string, unknown>, locale: "en" | "ar", unsubscribeToken: string) {
  const arabic = locale === "ar";
  const body = String(row[arabic ? "body_ar" : "body_en"]);
  const label = row[arabic ? "cta_label_ar" : "cta_label_en"] ? String(row[arabic ? "cta_label_ar" : "cta_label_en"]) : "";
  const cta = safeCtaUrl(row.cta_url ? String(row.cta_url) : null);
  const unsubscribe = new URL(`/${locale}/shop/unsubscribe`, siteOrigin());
  unsubscribe.searchParams.set("token", unsubscribeToken);
  const postalAddress = process.env.RETAIL_MARKETING_POSTAL_ADDRESS?.trim();
  if (!postalAddress) throw new Error("marketing_postal_address_not_configured");
  return `<div dir="${arabic ? "rtl" : "ltr"}"><p>${escapeHtml(body).replaceAll("\n", "<br>")}</p>${cta && label ? `<p><a href="${escapeHtml(cta)}">${escapeHtml(label)}</a></p>` : ""}<hr><p style="font-size:12px;color:#666">TranquilBeads · ${escapeHtml(postalAddress)}<br><a href="${escapeHtml(unsubscribe.toString())}">${arabic ? "إلغاء الاشتراك" : "Unsubscribe"}</a></p></div>`;
}

export async function listMarketingCampaigns() {
  return guardedRetailSql()`SELECT campaign.public_id,campaign.name,campaign.subject_en,campaign.subject_ar,campaign.body_en,campaign.body_ar,campaign.cta_label_en,campaign.cta_label_ar,campaign.cta_url,campaign.status,campaign.scheduled_at,campaign.started_at,campaign.completed_at,campaign.created_at,
    count(delivery.id)::int AS recipients,count(delivery.id) FILTER(WHERE delivery.status='sent')::int AS sent,count(delivery.id) FILTER(WHERE delivery.status='failed')::int AS failed
    FROM retail_marketing_campaigns campaign LEFT JOIN retail_marketing_deliveries delivery ON delivery.campaign_id=campaign.id
    GROUP BY campaign.id ORDER BY campaign.created_at DESC LIMIT 200`;
}

export async function createMarketingCampaign(input: z.infer<typeof marketingCampaignCreateDto>, actor: RetailAdminActor) {
  const ctaUrl = safeCtaUrl(input.ctaUrl ?? null);
  const query = guardedRetailSql();
  const existing = await query`SELECT public_id,name,subject_en,subject_ar,body_en,body_ar,cta_label_en,cta_label_ar,cta_url FROM retail_marketing_campaigns WHERE idempotency_key=${input.idempotencyKey}::uuid`;
  if (existing[0]) {
    if (String(existing[0].name) !== input.name || String(existing[0].subject_en) !== input.subjectEn || String(existing[0].subject_ar) !== input.subjectAr || String(existing[0].body_en) !== input.bodyEn || String(existing[0].body_ar) !== input.bodyAr || (existing[0].cta_label_en === null ? undefined : String(existing[0].cta_label_en)) !== input.ctaLabelEn || (existing[0].cta_label_ar === null ? undefined : String(existing[0].cta_label_ar)) !== input.ctaLabelAr || (existing[0].cta_url === null ? null : String(existing[0].cta_url)) !== ctaUrl) throw new Error("idempotency conflict");
    return existing[0];
  }
  const rows = await query`INSERT INTO retail_marketing_campaigns(name,subject_en,subject_ar,body_en,body_ar,cta_label_en,cta_label_ar,cta_url,created_by,idempotency_key)
    VALUES(${input.name},${input.subjectEn},${input.subjectAr},${input.bodyEn},${input.bodyAr},${input.ctaLabelEn ?? null},${input.ctaLabelAr ?? null},${ctaUrl},${actor.id},${input.idempotencyKey}::uuid) RETURNING public_id`;
  await query`INSERT INTO retail_admin_audit(action,entity_type,entity_id,detail,idempotency_key,actor_id,actor_name,actor_role,legacy_actor)
    VALUES('marketing_campaign.create','marketing_campaign',${String(rows[0].public_id)},jsonb_build_object('name',${input.name}),${input.idempotencyKey}::uuid,${actor.id},${actor.name},${actor.role},${actor.legacy})`;
  return rows[0];
}

export async function scheduleMarketingCampaign(publicId: string, input: z.infer<typeof marketingCampaignScheduleDto>, actor: RetailAdminActor) {
  if (Date.parse(input.scheduledAt) < Date.now() - 60_000) throw new Error("invalid_campaign_schedule");
  const query = guardedRetailSql();
  const replay = await query`SELECT entity_id,detail FROM retail_admin_audit WHERE idempotency_key=${input.idempotencyKey}::uuid AND action='marketing_campaign.schedule' LIMIT 1`;
  if (replay[0]) {
    if (String(replay[0].entity_id) !== publicId || String((replay[0].detail as Record<string, unknown>).scheduledAt) !== input.scheduledAt) throw new Error("idempotency conflict");
    const current = await query`SELECT public_id,status,scheduled_at FROM retail_marketing_campaigns WHERE public_id=${publicId}::uuid`;
    return current[0];
  }
  const rows = await query`UPDATE retail_marketing_campaigns SET status='scheduled',scheduled_at=${input.scheduledAt}::timestamptz,updated_at=now()
    WHERE public_id=${publicId}::uuid AND status='draft' RETURNING public_id,status,scheduled_at`;
  if (!rows[0]) throw new Error("campaign_not_schedulable");
  await query`INSERT INTO retail_admin_audit(action,entity_type,entity_id,detail,idempotency_key,actor_id,actor_name,actor_role,legacy_actor)
    VALUES('marketing_campaign.schedule','marketing_campaign',${publicId},jsonb_build_object('scheduledAt',${input.scheduledAt}),${input.idempotencyKey}::uuid,${actor.id},${actor.name},${actor.role},${actor.legacy})`;
  return rows[0];
}

export async function cancelMarketingCampaign(publicId: string, input: z.infer<typeof marketingCampaignCancelDto>, actor: RetailAdminActor) {
  const query = guardedRetailSql();
  const replay = await query`SELECT entity_id FROM retail_admin_audit WHERE idempotency_key=${input.idempotencyKey}::uuid AND action='marketing_campaign.cancel' LIMIT 1`;
  if (replay[0]) {
    if (String(replay[0].entity_id) !== publicId) throw new Error("idempotency conflict");
    const current = await query`SELECT public_id,status FROM retail_marketing_campaigns WHERE public_id=${publicId}::uuid`;
    return current[0];
  }
  const rows = await query`UPDATE retail_marketing_campaigns SET status='cancelled',updated_at=now() WHERE public_id=${publicId}::uuid AND status IN ('draft','scheduled') RETURNING public_id,status`;
  if (!rows[0]) throw new Error("campaign_not_cancellable");
  await query`INSERT INTO retail_admin_audit(action,entity_type,entity_id,detail,idempotency_key,actor_id,actor_name,actor_role,legacy_actor)
    VALUES('marketing_campaign.cancel','marketing_campaign',${publicId},'{}'::jsonb,${input.idempotencyKey}::uuid,${actor.id},${actor.name},${actor.role},${actor.legacy})`;
  return rows[0];
}

async function sendCampaignEmail(row: Record<string, unknown>, email: string, locale: "en" | "ar", unsubscribeToken: string, idempotency: string, fetcher: typeof fetch) {
  const apiKey = process.env.RETAIL_RESEND_API_KEY, from = process.env.RETAIL_EMAIL_FROM, replyTo = process.env.RETAIL_EMAIL_REPLY_TO;
  if (!apiKey || !from) throw new Error("marketing_email_not_configured");
  const subject = String(row[locale === "ar" ? "subject_ar" : "subject_en"]);
  const response = await fetcher("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json", "idempotency-key": idempotency }, body: JSON.stringify({ from, to: [email], subject, html: campaignHtml(row, locale, unsubscribeToken), ...(replyTo ? { reply_to: replyTo } : {}) }), cache: "no-store" });
  if (!response.ok) throw new Error(`email_${response.status}`);
}

export async function sendMarketingCampaignTest(publicId: string, input: z.infer<typeof marketingCampaignTestDto>, fetcher: typeof fetch = fetch) {
  const rows = await guardedRetailSql()`SELECT * FROM retail_marketing_campaigns WHERE public_id=${publicId}::uuid AND status='draft' LIMIT 1`;
  if (!rows[0]) throw new Error("campaign_not_testable");
  await sendCampaignEmail(rows[0] as Record<string, unknown>, input.email, input.locale, crypto.randomUUID(), `marketing-test-${publicId}-${Date.now()}`, fetcher);
  return true;
}

export async function deliverRetailMarketingCampaigns(fetcher: typeof fetch = fetch) {
  if (!process.env.RETAIL_RESEND_API_KEY || !process.env.RETAIL_EMAIL_FROM || !process.env.RETAIL_MARKETING_POSTAL_ADDRESS) return { configured: false, processed: 0, sent: 0, failed: 0 };
  const query = guardedRetailSql();
  await query`UPDATE retail_marketing_campaigns SET status='sending',started_at=COALESCE(started_at,now()),updated_at=now() WHERE status='scheduled' AND scheduled_at<=now()`;
  await query`INSERT INTO retail_marketing_deliveries(campaign_id,subscriber_id,recipient,locale)
    SELECT campaign.id,subscriber.id,subscriber.email,CASE WHEN subscriber.locale='ar' THEN 'ar' ELSE 'en' END FROM retail_marketing_campaigns campaign CROSS JOIN retail_marketing_subscribers subscriber
    WHERE campaign.status='sending' AND subscriber.status='active' ON CONFLICT(campaign_id,subscriber_id) DO NOTHING`;
  await query`UPDATE retail_marketing_deliveries delivery SET status='cancelled' FROM retail_marketing_subscribers subscriber
    WHERE delivery.subscriber_id=subscriber.id AND delivery.status IN ('pending','failed') AND subscriber.status<>'active'`;
  await query`UPDATE retail_marketing_deliveries SET status='failed',claimed_at=NULL,last_error=COALESCE(last_error,'delivery_lease_expired') WHERE status='processing' AND claimed_at<now()-interval '10 minutes'`;
  const rows = await query`WITH candidates AS (SELECT delivery.id FROM retail_marketing_deliveries delivery JOIN retail_marketing_subscribers subscriber ON subscriber.id=delivery.subscriber_id AND subscriber.status='active' WHERE delivery.status IN ('pending','failed') AND delivery.available_at<=now() AND delivery.attempts<8 ORDER BY delivery.created_at FOR UPDATE OF delivery SKIP LOCKED LIMIT 25), claimed AS (UPDATE retail_marketing_deliveries delivery SET status='processing',claimed_at=now(),attempts=attempts+1 FROM candidates WHERE delivery.id=candidates.id RETURNING delivery.*) SELECT claimed.*,campaign.public_id AS campaign_public_id,campaign.subject_en,campaign.subject_ar,campaign.body_en,campaign.body_ar,campaign.cta_label_en,campaign.cta_label_ar,campaign.cta_url,subscriber.public_id AS unsubscribe_token FROM claimed JOIN retail_marketing_campaigns campaign ON campaign.id=claimed.campaign_id JOIN retail_marketing_subscribers subscriber ON subscriber.id=claimed.subscriber_id`;
  let sent = 0, failed = 0;
  for (const row of rows) {
    try {
      await sendCampaignEmail(row as Record<string, unknown>, String(row.recipient), row.locale === "ar" ? "ar" : "en", String(row.unsubscribe_token), `retail-marketing-${String(row.id)}`, fetcher);
      await query`UPDATE retail_marketing_deliveries SET status='sent',claimed_at=NULL,sent_at=now(),last_error=NULL WHERE id=${row.id}::uuid AND status='processing'`;
      sent += 1;
    } catch (error) {
      await query`UPDATE retail_marketing_deliveries SET status='failed',claimed_at=NULL,last_error=${error instanceof Error ? error.message.slice(0, 200) : "delivery_failed"},available_at=now()+make_interval(secs=>LEAST(3600,60*(2^LEAST(attempts,6)))) WHERE id=${row.id}::uuid AND status='processing'`;
      failed += 1;
    }
  }
  await query`UPDATE retail_marketing_campaigns campaign SET status='completed',completed_at=now(),updated_at=now() WHERE campaign.status='sending' AND NOT EXISTS(SELECT 1 FROM retail_marketing_deliveries delivery WHERE delivery.campaign_id=campaign.id AND delivery.status IN ('pending','processing','failed') AND delivery.attempts<8)`;
  return { configured: true, processed: rows.length, sent, failed };
}
