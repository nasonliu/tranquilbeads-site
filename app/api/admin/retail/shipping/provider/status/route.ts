import { requireRetailPermission } from "@/src/lib/retail/admin-auth";
import { verifyYunExpressConnection } from "@/src/lib/retail/yunexpress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "cache-control": "no-store" };

export async function GET() {
  try {
    await requireRetailPermission("shipping:write");
    const status = await verifyYunExpressConnection();
    return Response.json({ ok: true, provider: "YunExpress", ...status }, { status: status.authenticated ? 200 : 503, headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "provider_unavailable";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 503;
    return Response.json({ ok: false, error: status === 503 ? "provider_unavailable" : message }, { status, headers });
  }
}
