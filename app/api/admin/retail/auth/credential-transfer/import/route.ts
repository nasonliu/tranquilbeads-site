import crypto from "node:crypto";
import { z } from "zod";

import { guardedRetailSql } from "@/src/lib/retail/database-identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXPECTED_ORIGIN = "https://tranquilbeads-site-git-codex-retail-admin-ops-mcp-tranquilbeads.vercel.app";
const TOKEN_HASH = "cf4036d6cbf255eff9e86a97aaa796871c9c75d2ffa0e86cd2b9b306c2fb3ff3";
const EXPIRES_AT = Date.parse("2026-08-18T07:17:06.365Z");
const credentialDto = z.object({
  actor_id: z.literal("legacy-admin"),
  password_salt: z.string().regex(/^[0-9a-f]{32}$/i),
  password_hash: z.string().regex(/^[0-9a-f]{64}$/i),
  credential_version: z.string().uuid(),
  changed_at: z.string().datetime(),
  changed_by: z.string().min(1).max(100),
}).strict();

function response(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: {
    "cache-control": "no-store",
    "access-control-allow-origin": EXPECTED_ORIGIN,
    vary: "origin",
  } });
}

export async function POST(request: Request) {
  try {
    if (process.env.VERCEL_ENV !== "production" || Date.now() >= EXPIRES_AT || request.headers.get("origin") !== EXPECTED_ORIGIN) throw new Error("not_found");
    const form = await request.formData();
    const token = String(form.get("token") ?? "");
    const presented = crypto.createHash("sha256").update(token).digest();
    const expected = Buffer.from(TOKEN_HASH, "hex");
    if (presented.length !== expected.length || !crypto.timingSafeEqual(presented, expected)) throw new Error("unauthorized");
    const credential = credentialDto.parse(JSON.parse(String(form.get("credential") ?? "")));

    const rows = await guardedRetailSql()`
      WITH stored AS (
        INSERT INTO retail_admin_password_credentials(actor_id,password_salt,password_hash,credential_version,changed_at,changed_by)
        VALUES(${credential.actor_id},${credential.password_salt},${credential.password_hash},${credential.credential_version}::uuid,${new Date(credential.changed_at)},${credential.changed_by})
        ON CONFLICT(actor_id) DO UPDATE SET
          password_salt=EXCLUDED.password_salt,
          password_hash=EXCLUDED.password_hash,
          credential_version=EXCLUDED.credential_version,
          changed_at=EXCLUDED.changed_at,
          changed_by=EXCLUDED.changed_by
        RETURNING actor_id,credential_version::text
      ), revoked AS (
        UPDATE retail_admin_sessions SET revoked_at=COALESCE(revoked_at,now())
        WHERE actor_id=${credential.actor_id} AND revoked_at IS NULL
        RETURNING session_hash
      ), audited AS (
        INSERT INTO retail_admin_audit(action,entity_type,entity_id,detail,idempotency_key,actor_id,actor_name,actor_role,legacy_actor,actor_attributed)
        SELECT 'admin.password.sync_from_preview','admin_operator',stored.actor_id,
          jsonb_build_object('sessionsRevoked',(SELECT count(*) FROM revoked)),
          ${credential.credential_version}::uuid,stored.actor_id,'Legacy administrator','owner',true,true
        FROM stored ON CONFLICT(idempotency_key) DO NOTHING RETURNING id
      )
      SELECT actor_id,credential_version FROM stored`;
    if (rows.length !== 1 || rows[0]?.credential_version !== credential.credential_version) throw new Error("readback_failed");
    return response({ ok: true, actorId: credential.actor_id, credentialVersion: credential.credential_version, readback: true });
  } catch {
    return response({ ok: false }, 400);
  }
}
