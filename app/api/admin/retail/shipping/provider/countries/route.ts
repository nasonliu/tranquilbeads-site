import { assertSameOrigin, requireRetailPermission } from "@/src/lib/retail/admin-auth";
import { getYunExpressConfig, listYunExpressCountries } from "@/src/lib/retail/yunexpress";

export async function POST() {
  try {
    await requireRetailPermission("shipping:write");
    await assertSameOrigin();
    if (getYunExpressConfig()?.environment !== "sandbox") return Response.json({ ok: false, error: "sandbox_only" }, { status: 403 });
    const countries = await listYunExpressCountries();
    return Response.json({ ok: true, countries }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid_request";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : message.startsWith("yunexpress_") ? 503 : 400;
    return Response.json({ ok: false, error: status === 401 ? "unauthorized" : status === 403 ? "forbidden" : "provider_unavailable" }, { status, headers: { "cache-control": "no-store" } });
  }
}
