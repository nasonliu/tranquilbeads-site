import { assertSameOrigin, requireRetailPermission } from "@/src/lib/retail/admin-auth";
import { consumeRetailRateLimit } from "@/src/lib/retail/rate-limit";
import { getYunExpressConfig, probeYunExpressCoverage, yunExpressCoverageDto } from "@/src/lib/retail/yunexpress";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    await requireRetailPermission("shipping:write");
    await assertSameOrigin();
    if (getYunExpressConfig()?.environment !== "sandbox") return Response.json({ ok: false, error: "sandbox_only" }, { status: 403 });
    if (!await consumeRetailRateLimit(request, "yunexpress_coverage", 90, 1000, 3600)) {
      return Response.json({ ok: false, error: "rate_limited" }, { status: 429, headers: { "cache-control": "no-store" } });
    }
    const results = await probeYunExpressCoverage(yunExpressCoverageDto.parse(await request.json()));
    return Response.json({ ok: true, results }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid_request";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : message.startsWith("yunexpress_") ? 503 : 400;
    return Response.json({ ok: false, error: status === 401 ? "unauthorized" : status === 403 ? "forbidden" : "invalid_request" }, { status, headers: { "cache-control": "no-store" } });
  }
}
