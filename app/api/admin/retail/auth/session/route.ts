import { requireRetailAdmin } from "@/src/lib/retail/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const actor = await requireRetailAdmin();
    return Response.json({ ok: true, actor }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ ok: false }, { status: 401, headers: { "cache-control": "no-store" } });
  }
}
