import { assertSameOrigin, requireRetailPermission } from "@/src/lib/retail/admin-auth";
import { consumeRetailRateLimit } from "@/src/lib/retail/rate-limit";
import { analyzeShippingSweetSpots, buildIdenticalItemParcelPlans, shippingOptimizationDto } from "@/src/lib/retail/shipping-optimizer";
import { classifyYunExpressFailure, getYunExpressConfig, quoteYunExpressShipping } from "@/src/lib/retail/yunexpress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const headers = { "cache-control": "no-store" };

export async function POST(request: Request) {
  const startedAt = Date.now();
  try {
    await requireRetailPermission("shipping:write");
    await assertSameOrigin();
    const environment = getYunExpressConfig()?.environment;
    const hourlyLimit = environment === "production" ? 6 : 30;
    if (!await consumeRetailRateLimit(request, "yunexpress_optimize", hourlyLimit, 120, 3600)) {
      return Response.json({ ok: false, error: "rate_limited" }, { status: 429, headers: { ...headers, "retry-after": "3600" } });
    }
    const input = shippingOptimizationDto.parse(await request.json());
    const plans = buildIdenticalItemParcelPlans(input);
    const rows: Array<typeof plans[number] & { status: string; rates: Awaited<ReturnType<typeof quoteYunExpressShipping>>; providerCode?: string; httpStatus?: number }> = new Array(plans.length);
    let cursor = 0;
    const worker = async () => {
      while (cursor < plans.length) {
        const index = cursor++;
        const plan = plans[index];
        try {
          const rates = await quoteYunExpressShipping({
            countryCode: input.countryCode,
            postalCode: input.postalCode,
            weightGrams: plan.weightGrams,
            lengthMm: plan.lengthMm,
            widthMm: plan.widthMm,
            heightMm: plan.heightMm,
            packageType: input.packageType,
          }, fetch, Date.now() + index);
          rows[index] = { ...plan, status: rates.length ? "quote_available" : "no_eligible_service", rates };
        } catch (error) {
          rows[index] = { ...plan, ...classifyYunExpressFailure(error), rates: [] };
        }
      }
    };
    await Promise.all([worker(), worker()]);
    return Response.json({ ok: true, rows, sweetSpots: analyzeShippingSweetSpots(rows), referenceOnly: true }, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid_request";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : message.startsWith("yunexpress_") ? 503 : 400;
    if (status === 503) {
      const failure = classifyYunExpressFailure(error);
      console.warn("yunexpress_optimization_failed", { status: failure.status, ...(failure.httpStatus ? { httpStatus: failure.httpStatus } : {}), durationMs: Date.now() - startedAt });
      return Response.json({ ok: false, error: "provider_unavailable", providerStatus: failure.status, ...(failure.httpStatus ? { httpStatus: failure.httpStatus } : {}) }, { status, headers });
    }
    return Response.json({ ok: false, error: status === 400 ? "invalid_request" : message }, { status, headers });
  }
}
