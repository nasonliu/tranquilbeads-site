import { assertSameOrigin, requireRetailPermission } from "@/src/lib/retail/admin-auth";
import { consumeRetailRateLimit } from "@/src/lib/retail/rate-limit";
import { listYunExpressCountries } from "@/src/lib/retail/yunexpress";

export async function POST(request: Request) {
  try {
    await requireRetailPermission("shipping:write");
    await assertSameOrigin();
    if (!await consumeRetailRateLimit(request, "yunexpress_countries", 12, 1000, 3600)) {
      return Response.json({ ok: false, error: "rate_limited" }, { status: 429, headers: { "cache-control": "no-store", "retry-after": "3600" } });
    }
    const countries = await listYunExpressCountries();
    return Response.json({ ok: true, countries }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid_request";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : message === "rate_limited" ? 429 : message.startsWith("yunexpress_") ? 503 : 400;
    return Response.json({ ok: false, error: status === 401 ? "unauthorized" : status === 403 ? "forbidden" : "provider_unavailable" }, { status, headers: { "cache-control": "no-store" } });
  }
}
