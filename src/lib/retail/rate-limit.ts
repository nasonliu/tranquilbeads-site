import "server-only";

import crypto from "node:crypto";
import { guardedRetailSql } from "./database-identity";

function trustedClientIp(request: Request) {
  // Vercel sets this header after terminating the client connection. Do not
  // fall back to client-controlled forwarding headers for administrator auth.
  const ip = request.headers.get("x-vercel-forwarded-for")?.trim();
  if (!ip || ip.length > 128) throw new Error("admin_login_identity_unavailable");
  return ip;
}

function fingerprint(value: string) { return crypto.createHash("sha256").update(value).digest("hex"); }

async function consumeKey(scope: string, key: string, limit: number, windowSeconds: number) {
  const rows = await guardedRetailSql()`
    INSERT INTO retail_rate_limits(scope,fingerprint,window_started_at,attempts)
    VALUES(${scope},${key},now(),1)
    ON CONFLICT(scope,fingerprint) DO UPDATE SET
      window_started_at=CASE WHEN retail_rate_limits.window_started_at<=now()-make_interval(secs=>${windowSeconds}) THEN now() ELSE retail_rate_limits.window_started_at END,
      attempts=CASE WHEN retail_rate_limits.window_started_at<=now()-make_interval(secs=>${windowSeconds}) THEN 1 ELSE retail_rate_limits.attempts+1 END
    WHERE retail_rate_limits.window_started_at<=now()-make_interval(secs=>${windowSeconds}) OR retail_rate_limits.attempts<${limit}
    RETURNING attempts
  `;
  return rows.length === 1;
}

export async function consumeRetailRateLimit(request: Request, scope: string, perIpLimit: number, globalLimit: number, windowSeconds = 900) {
  const ipHash = fingerprint(request.headers.get("x-vercel-forwarded-for")?.trim() || "unknown");
  const [ipAllowed, globalAllowed] = await Promise.all([
    consumeKey(scope, `ip:${ipHash}`, perIpLimit, windowSeconds),
    consumeKey(scope, "global", globalLimit, windowSeconds),
  ]);
  return ipAllowed && globalAllowed;
}

// No shared reject bucket: a bot spraying anonymous actor IDs cannot consume
// the login budget for other operators. This fails closed when the trusted
// proxy identity is unavailable rather than trusting spoofable headers.
export async function consumeRetailAdminLoginRateLimit(request: Request, actorId?: string, windowSeconds = 900) {
  const normalizedActor = actorId?.trim().toLowerCase() || "legacy-admin";
  if (normalizedActor.length > 100) throw new Error("admin_login_identity_unavailable");
  return consumeKey("admin_login_v2", `ip_actor:${fingerprint(`${trustedClientIp(request)}\n${normalizedActor}`)}`, 8, windowSeconds);
}
