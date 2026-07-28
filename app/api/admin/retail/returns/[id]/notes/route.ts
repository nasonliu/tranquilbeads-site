import { requireRetailPermission } from "@/src/lib/retail/admin-auth";
import { getAdminReturnNotes } from "@/src/lib/retail/returns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
const headers = { "cache-control": "no-store" };

export async function GET(_request: Request, context: Context) {
  try {
    await requireRetailPermission("returns:manage");
    await requireRetailPermission("orders:pii");
    const { id } = await context.params;
    return Response.json({ ok: true, notes: await getAdminReturnNotes(id) }, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid_request";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 400;
    return Response.json({ ok: false, error: status === 401 ? "unauthorized" : status === 403 ? "forbidden" : "invalid_request" }, { status, headers });
  }
}
