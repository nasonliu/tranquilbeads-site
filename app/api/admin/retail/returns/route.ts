import { assertSameOrigin, hasRetailPermission, requireRetailPermission } from "@/src/lib/retail/admin-auth";
import { listAdminReturns } from "@/src/lib/retail/returns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "cache-control": "no-store" };

export async function GET(request: Request) {
  try {
    const actor = await requireRetailPermission("returns:manage");
    const status = new URL(request.url).searchParams.get("status") || undefined;
    return Response.json({ ok: true, returns: await listAdminReturns(status), canViewNotes: hasRetailPermission(actor, "orders:pii") }, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid_request";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 400;
    return Response.json({ ok: false, error: status === 401 ? "unauthorized" : status === 403 ? "forbidden" : "invalid_request" }, { status, headers });
  }
}

export async function POST() {
  // Deliberately unsupported: every return mutation is target-specific.
  await assertSameOrigin();
  return Response.json({ ok: false, error: "unsupported" }, { status: 405, headers });
}
