import crypto from "node:crypto";

import { guardedRetailSql } from "@/src/lib/retail/database-identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN_HASH = "cf4036d6cbf255eff9e86a97aaa796871c9c75d2ffa0e86cd2b9b306c2fb3ff3";
const EXPIRES_AT = Date.parse("2026-08-18T07:17:06.365Z");

export async function POST(request: Request) {
  try {
    if (process.env.VERCEL_ENV === "production" || Date.now() >= EXPIRES_AT) throw new Error("not_found");
    const form = await request.formData();
    const token = String(form.get("token") ?? "");
    const presented = crypto.createHash("sha256").update(token).digest();
    const expected = Buffer.from(TOKEN_HASH, "hex");
    if (presented.length !== expected.length || !crypto.timingSafeEqual(presented, expected)) throw new Error("unauthorized");
    const rows = await guardedRetailSql()`
      SELECT actor_id,password_salt,password_hash,credential_version::text,changed_at,changed_by
      FROM retail_admin_password_credentials WHERE actor_id='legacy-admin' LIMIT 1`;
    if (rows.length !== 1) throw new Error("credential_not_found");
    return Response.json({ ok: true, credential: rows[0] }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ ok: false }, { status: 404, headers: { "cache-control": "no-store" } });
  }
}
