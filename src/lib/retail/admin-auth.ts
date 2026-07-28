import crypto from "node:crypto";
import { cookies, headers } from "next/headers";

import { guardedRetailSql } from "./database-identity";
import { consumeRetailAdminLoginRateLimit } from "./rate-limit";

const COOKIE = "retail_admin";
const MAX_AGE = 60 * 60 * 8;

export const retailRoles = ["owner", "operations", "warehouse", "finance", "viewer"] as const;
export type RetailRole = (typeof retailRoles)[number];
export type RetailPermission =
  | "orders:read" | "orders:pii" | "orders:fulfil" | "orders:cancel" | "orders:refund"
  | "products:write" | "inventory:write" | "shipping:write" | "customers:write"
  | "finance:read" | "finance:write" | "audit:read" | "returns:manage";
export type RetailAdminActor = { id: string; name: string; role: RetailRole; legacy: boolean };

const rolePermissions: Record<RetailRole, ReadonlySet<RetailPermission>> = {
  owner: new Set(["orders:read", "orders:pii", "orders:fulfil", "orders:cancel", "orders:refund", "products:write", "inventory:write", "shipping:write", "customers:write", "finance:read", "finance:write", "audit:read", "returns:manage"]),
  operations: new Set(["orders:read", "orders:pii", "orders:fulfil", "orders:cancel", "orders:refund", "products:write", "shipping:write", "customers:write", "returns:manage"]),
  warehouse: new Set(["orders:read", "orders:fulfil", "inventory:write", "returns:manage"]),
  finance: new Set(["orders:read", "orders:refund", "finance:read", "finance:write"]),
  viewer: new Set(["orders:read", "finance:read"]),
};

type ConfiguredOperator = RetailAdminActor & { password: string };
type SessionPayload = RetailAdminActor & { exp: number; v: 3; jti: string; cv: string };
type ParsedSession = { actor: RetailAdminActor; exp: number; jti: string; cv: string };

function config() {
  const password = process.env.ADMIN_RETAIL_PASSWORD;
  const secret = process.env.ADMIN_RETAIL_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("retail_admin_not_configured");
  if (password !== undefined && password.length > 0 && password.length < 16) throw new Error("retail_admin_not_configured");
  return { password: password || undefined, secret };
}

function sign(value: string, secret: string) { return crypto.createHmac("sha256", secret).update(value).digest("base64url"); }
function sha256(value: string) { return crypto.createHash("sha256").update(value).digest("hex"); }
function safeEqual(left: string, right: string) {
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function legacyActor(): RetailAdminActor { return { id: "legacy-admin", name: "Legacy administrator", role: "owner", legacy: true }; }

function configuredOperators(): ConfiguredOperator[] {
  const raw = process.env.ADMIN_RETAIL_OPERATORS_JSON;
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const ids = new Set<string>();
    return parsed.flatMap((row): ConfiguredOperator[] => {
      if (!row || typeof row !== "object") return [];
      const value = row as Record<string, unknown>;
      const id = typeof value.id === "string" ? value.id.trim() : "";
      const name = typeof value.name === "string" ? value.name.trim() : "";
      const role = typeof value.role === "string" && retailRoles.includes(value.role as RetailRole) ? value.role as RetailRole : undefined;
      const password = typeof value.password === "string" ? value.password : "";
      if (!id || !name || !role || password.length < 16 || ids.has(id)) return [];
      ids.add(id);
      return [{ id, name, role, password, legacy: false }];
    });
  } catch { return []; }
}

function currentActor(id: string, legacy: boolean): (RetailAdminActor & { password: string }) | null {
  const { password } = config();
  if (legacy) return id === "legacy-admin" && password ? { ...legacyActor(), password } : null;
  return configuredOperators().find((operator) => operator.id === id) ?? null;
}

// This is a secret-bound version marker, not a password hash. It is safe in a
// signed cookie and only its SHA-256 digest is persisted with the session.
function credentialVersion(actor: RetailAdminActor & { password: string }) {
  const { secret } = config();
  return sign(`${actor.id}\n${actor.name}\n${actor.role}\n${actor.legacy}\n${actor.password}`, secret);
}
function cookieOptions() { return { httpOnly: true, sameSite: "strict" as const, secure: process.env.NODE_ENV === "production", maxAge: MAX_AGE, path: "/" }; }

export function hasRetailPermission(actor: RetailAdminActor, permission: RetailPermission) { return rolePermissions[actor.role].has(permission); }

export function createRetailAdminSession(actor: RetailAdminActor = legacyActor(), now = Date.now()) {
  const active = currentActor(actor.id, actor.legacy);
  if (!active || active.name !== actor.name || active.role !== actor.role) throw new Error("retail_admin_actor_unavailable");
  const { secret } = config();
  const payload = Buffer.from(JSON.stringify({
    id: active.id, name: active.name, role: active.role, legacy: active.legacy,
    exp: now + MAX_AGE * 1000, v: 3 satisfies 3, jti: crypto.randomUUID(), cv: credentialVersion(active),
  } satisfies SessionPayload)).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

function parseRetailAdminSession(value: string | undefined, now = Date.now()): ParsedSession | null {
  try {
    if (!value) return null;
    const { secret } = config(); const [payload, signature, extra] = value.split(".");
    if (!payload || !signature || extra || !safeEqual(signature, sign(payload, secret))) return null;
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString()) as Partial<SessionPayload>;
    if (parsed.v !== 3 || !parsed.exp || parsed.exp <= now || typeof parsed.id !== "string" || typeof parsed.name !== "string" || !retailRoles.includes(parsed.role as RetailRole) || typeof parsed.legacy !== "boolean" || typeof parsed.jti !== "string" || !/^[0-9a-f-]{36}$/i.test(parsed.jti) || typeof parsed.cv !== "string") return null;
    return { actor: { id: parsed.id, name: parsed.name, role: parsed.role as RetailRole, legacy: parsed.legacy }, exp: parsed.exp, jti: parsed.jti, cv: parsed.cv };
  } catch { return null; }
}

// A syntax/signature check remains useful for tests and non-privileged display
// only. Every privileged path must call validateRetailAdminSession instead.
export function readRetailAdminSession(value: string | undefined, now = Date.now()): RetailAdminActor | null { return parseRetailAdminSession(value, now)?.actor ?? null; }
export function verifyRetailAdminSession(value: string | undefined, now = Date.now()) { return readRetailAdminSession(value, now) !== null; }

export async function validateRetailAdminSession(value: string | undefined, now = Date.now()): Promise<RetailAdminActor | null> {
  const parsed = parseRetailAdminSession(value, now);
  if (!parsed) return null;
  const active = currentActor(parsed.actor.id, parsed.actor.legacy);
  if (!active || !safeEqual(parsed.cv, credentialVersion(active))) return null;
  const rows = await guardedRetailSql()`SELECT 1 FROM retail_admin_sessions WHERE session_hash=${sha256(parsed.jti)} AND actor_id=${active.id} AND credential_version_hash=${sha256(parsed.cv)} AND revoked_at IS NULL AND expires_at > now() LIMIT 1`;
  return rows.length === 1 ? { id: active.id, name: active.name, role: active.role, legacy: active.legacy } : null;
}

export function authenticateRetailAdmin(password: string, actorId?: string): RetailAdminActor | null {
  const selected = actorId?.trim();
  if (!selected) {
    const active = currentActor("legacy-admin", true);
    return active && safeEqual(password, active.password) ? legacyActor() : null;
  }
  const operator = currentActor(selected, false);
  return operator && safeEqual(password, operator.password) ? { id: operator.id, name: operator.name, role: operator.role, legacy: false } : null;
}

export async function requireRetailAdmin() {
  const actor = await validateRetailAdminSession((await cookies()).get(COOKIE)?.value);
  if (!actor) throw new Error("unauthorized");
  return actor;
}
export async function getRetailAdminActorForAudit(): Promise<RetailAdminActor> {
  try { return await requireRetailAdmin(); } catch { return legacyActor(); }
}
export async function requireRetailPermission(permission: RetailPermission) {
  const actor = await requireRetailAdmin();
  if (!hasRetailPermission(actor, permission)) throw new Error("forbidden");
  return actor;
}
export async function assertSameOrigin() { const h = await headers(); const origin = h.get("origin"); const host = h.get("host"); if (!origin || !host || new URL(origin).host !== host) throw new Error("csrf_rejected"); }

export async function setRetailAdminSession(actor: RetailAdminActor = legacyActor()) {
  const value = createRetailAdminSession(actor);
  const parsed = parseRetailAdminSession(value);
  if (!parsed) throw new Error("retail_admin_session_invalid");
  await guardedRetailSql()`INSERT INTO retail_admin_sessions(session_hash,actor_id,credential_version_hash,expires_at) VALUES(${sha256(parsed.jti)},${parsed.actor.id},${sha256(parsed.cv)},${new Date(parsed.exp)})`;
  (await cookies()).set(COOKIE, value, cookieOptions());
}
export async function revokeRetailAdminSession(value: string | undefined) {
  const parsed = parseRetailAdminSession(value);
  if (!parsed) return;
  await guardedRetailSql()`UPDATE retail_admin_sessions SET revoked_at=COALESCE(revoked_at,now()) WHERE session_hash=${sha256(parsed.jti)} AND revoked_at IS NULL`;
}
export async function clearRetailAdminSession() { (await cookies()).delete(COOKIE); }
export function verifyRetailAdminPassword(value: string) { const active = currentActor("legacy-admin", true); return Boolean(active && safeEqual(value, active.password)); }
export async function consumeRetailAdminLoginFailure(request: Request, actorId?: string) { return consumeRetailAdminLoginRateLimit(request, actorId); }
