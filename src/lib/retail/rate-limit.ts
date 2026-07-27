import "server-only";

import crypto from "node:crypto";
import { guardedRetailSql } from "./database-identity";

function trustedClientIp(request: Request) {
  const raw = request.headers.get("x-vercel-forwarded-for")
    ?? request.headers.get("x-real-ip")
    ?? request.headers.get("x-forwarded-for")
    ?? "unknown";
  return raw.split(",")[0]!.trim().slice(0, 128) || "unknown";
}

async function consumeKey(scope: string, fingerprint: string, limit: number, windowSeconds: number) {
  const rows = await guardedRetailSql()`
    INSERT INTO retail_rate_limits(scope,fingerprint,window_started_at,attempts)
    VALUES(${scope},${fingerprint},now(),1)
    ON CONFLICT(scope,fingerprint) DO UPDATE SET
      window_started_at=CASE WHEN retail_rate_limits.window_started_at<=now()-make_interval(secs=>${windowSeconds}) THEN now() ELSE retail_rate_limits.window_started_at END,
      attempts=CASE WHEN retail_rate_limits.window_started_at<=now()-make_interval(secs=>${windowSeconds}) THEN 1 ELSE retail_rate_limits.attempts+1 END
    WHERE retail_rate_limits.window_started_at<=now()-make_interval(secs=>${windowSeconds}) OR retail_rate_limits.attempts<${limit}
    RETURNING attempts
  `;
  return rows.length === 1;
}

export async function consumeRetailRateLimit(request: Request, scope: string, perIpLimit: number, globalLimit: number, windowSeconds = 900) {
  const ipHash = crypto.createHash("sha256").update(trustedClientIp(request)).digest("hex");
  const [ipAllowed, globalAllowed] = await Promise.all([
    consumeKey(scope, `ip:${ipHash}`, perIpLimit, windowSeconds),
    consumeKey(scope, "global", globalLimit, windowSeconds),
  ]);
  return ipAllowed && globalAllowed;
}
