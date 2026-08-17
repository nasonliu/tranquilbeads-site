import { assertSameOrigin, requireRetailPermission } from "@/src/lib/retail/admin-auth";
import { consumeRetailRateLimit } from "@/src/lib/retail/rate-limit";
import { classifyYunExpressFailure, quoteYunExpressShipping, yunExpressQuoteDto } from "@/src/lib/retail/yunexpress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "cache-control": "no-store" };

export async function POST(request: Request) {
  const startedAt = Date.now();
  try {
    await requireRetailPermission("shipping:write");
    await assertSameOrigin();
    if (!await consumeRetailRateLimit(request, "yunexpress_quote", 30, 1000, 3600)) {
      return Response.json({ ok: false, error: "rate_limited" }, { status: 429, headers: { ...headers, "retry-after": "3600" } });
    }
    const input = yunExpressQuoteDto.parse(await request.json());
    return Response.json({ ok: true, rates: await quoteYunExpressShipping(input) }, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid_request";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : message === "rate_limited" ? 429 : message.startsWith("yunexpress_") ? 503 : 400;
    if (status === 503) {
      const failure = classifyYunExpressFailure(error);
      console.warn("yunexpress_quote_failed", { status: failure.status, ...(failure.httpStatus ? { httpStatus: failure.httpStatus } : {}), durationMs: Date.now() - startedAt });
      return Response.json({ ok: false, error: "provider_unavailable", providerStatus: failure.status, ...(failure.httpStatus ? { httpStatus: failure.httpStatus } : {}) }, { status, headers });
    }
    return Response.json({ ok: false, error: status === 400 ? "invalid_request" : message }, { status, headers });
  }
}
