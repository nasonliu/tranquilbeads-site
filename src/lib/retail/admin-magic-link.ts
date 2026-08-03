import "server-only";

import crypto from "node:crypto";

import { guardedRetailSql } from "./database-identity";
import { retailAdminActorById, retailAdminActorForEmail } from "./admin-auth";

const TOKEN_BYTES = 32;
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
const LINK_TTL_MS = 15 * 60 * 1000;
const sha256 = (value: string) => crypto.createHash("sha256").update(value, "utf8").digest("hex");
const opaque = () => crypto.randomBytes(TOKEN_BYTES).toString("base64url");
const validOpaque = (value: string) => TOKEN_RE.test(value) && Buffer.from(value, "base64url").length === TOKEN_BYTES;

export function adminVerifyUrl(token: string) {
  if (!validOpaque(token)) throw new Error("admin_login_unavailable");
  const origin = process.env.ADMIN_RETAIL_MAGIC_LINK_ORIGIN;
  if (!origin) throw new Error("admin_login_unavailable");
  const base = new URL(origin);
  if ((base.protocol !== "https:" && base.hostname !== "localhost") || base.username || base.password || base.pathname !== "/" || base.search || base.hash) throw new Error("admin_login_unavailable");
  return new URL(`/api/admin/retail/auth/verify?token=${encodeURIComponent(token)}`, base.origin).toString();
}

export async function issueRetailAdminLoginLink(email: string) {
  const normalized = email.trim().toLowerCase();
  const token = opaque();
  const actor = retailAdminActorForEmail(normalized);
  if (!actor) return { issued: false, token };
  const rows = await guardedRetailSql()`SELECT retail_issue_admin_login_token(${actor.id},${sha256(token)},${new Date(Date.now() + LINK_TTL_MS).toISOString()}::timestamptz) AS issued`;
  return { issued: rows[0]?.issued === true, token };
}

export async function redeemRetailAdminLoginLink(token: string) {
  if (!validOpaque(token)) return null;
  const rows = await guardedRetailSql()`SELECT actor_id FROM retail_redeem_admin_login_token(${sha256(token)})`;
  const actorId = rows[0]?.actor_id;
  return typeof actorId === "string" ? retailAdminActorById(actorId) : null;
}

export async function sendRetailAdminLoginEmail(email: string, token: string, fetcher: typeof fetch = fetch) {
  const apiKey = process.env.RETAIL_RESEND_API_KEY;
  const from = process.env.RETAIL_EMAIL_FROM;
  const replyTo = process.env.RETAIL_EMAIL_REPLY_TO;
  if (!apiKey || !from || !validOpaque(token)) return false;
  const link = adminVerifyUrl(token);
  const response = await fetcher("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      from,
      to: [email.trim().toLowerCase()],
      subject: "Your TranquilBeads admin sign-in link",
      html: `<p>Use this one-time link to sign in to the TranquilBeads retail admin. It expires in 15 minutes.</p><p><a href="${link}">Continue to admin sign-in</a></p>`,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
    cache: "no-store",
  });
  return response.ok;
}
