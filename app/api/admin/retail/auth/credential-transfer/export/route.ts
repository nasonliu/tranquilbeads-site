import { assertSameOrigin, requireRetailAdmin } from "@/src/lib/retail/admin-auth";
import { guardedRetailSql } from "@/src/lib/retail/database-identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    if (process.env.VERCEL_ENV === "production") throw new Error("not_found");
    await assertSameOrigin();
    const actor = await requireRetailAdmin();
    const rows = await guardedRetailSql()`
      SELECT actor_id,password_salt,password_hash,credential_version::text,changed_at,changed_by
      FROM retail_admin_password_credentials WHERE actor_id=${actor.id} LIMIT 1`;
    if (rows.length !== 1) throw new Error("credential_not_found");
    return Response.json({ ok: true, credential: rows[0] }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ ok: false }, { status: 404, headers: { "cache-control": "no-store" } });
  }
}
