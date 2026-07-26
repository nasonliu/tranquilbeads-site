import crypto from "node:crypto";
import { cookies, headers } from "next/headers";
import { consumeRetailRateLimit } from "./rate-limit";

const COOKIE = "retail_admin";
const MAX_AGE = 60 * 60 * 8;
function config() { const password = process.env.ADMIN_RETAIL_PASSWORD; const secret = process.env.ADMIN_RETAIL_SESSION_SECRET; if (!password || password.length < 16 || !secret || secret.length < 32) throw new Error("retail_admin_not_configured"); return { password, secret }; }
function sign(value: string, secret: string) { return crypto.createHmac("sha256", secret).update(value).digest("base64url"); }
export function createRetailAdminSession(now = Date.now()) { const { secret } = config(); const payload = Buffer.from(JSON.stringify({ exp: now + MAX_AGE * 1000 })).toString("base64url"); return `${payload}.${sign(payload, secret)}`; }
export function verifyRetailAdminSession(value: string | undefined, now = Date.now()) { try { if (!value) return false; const { secret } = config(); const [payload, signature] = value.split("."); if (!payload || !signature || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(sign(payload, secret)))) return false; return JSON.parse(Buffer.from(payload, "base64url").toString()).exp > now; } catch { return false; } }
export async function requireRetailAdmin() { if (!verifyRetailAdminSession((await cookies()).get(COOKIE)?.value)) throw new Error("unauthorized"); }
export async function assertSameOrigin() { const h = await headers(); const origin = h.get("origin"); const host = h.get("host"); if (!origin || !host || new URL(origin).host !== host) throw new Error("csrf_rejected"); }
export async function setRetailAdminSession() { (await cookies()).set(COOKIE, createRetailAdminSession(), { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", maxAge: MAX_AGE, path: "/" }); }
export async function clearRetailAdminSession() { (await cookies()).delete(COOKIE); }
export function verifyRetailAdminPassword(value: string) { const { password } = config(); return value.length === password.length && crypto.timingSafeEqual(Buffer.from(value), Buffer.from(password)); }
export async function consumeRetailAdminLoginFailure(request: Request) {
  return consumeRetailRateLimit(request,"admin_login",8,200);
}
