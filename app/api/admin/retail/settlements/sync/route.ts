import { z } from "zod";

import { assertSameOrigin, requireRetailPermission } from "@/src/lib/retail/admin-auth";
import { paypalSettlementSyncDto, syncPaypalSettlements } from "@/src/lib/retail/paypal-reporting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "cache-control": "no-store" };

export async function POST(request: Request) {
  try {
    const actor = await requireRetailPermission("finance:write");
    await assertSameOrigin();
    const result = await syncPaypalSettlements(paypalSettlementSyncDto.parse(await request.json()), actor);
    return Response.json({ ok: true, ...result }, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid_request";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : message === "paypal_reporting_permission_required" ? 409 : message === "paypal_reporting_failed" || message === "paypal_reporting_unavailable" ? 503 : 400;
    return Response.json({ ok: false, error: ["paypal_reporting_permission_required", "paypal_reporting_failed", "paypal_reporting_unavailable"].includes(message) ? message : "invalid_request" }, { status, headers });
  }
}
