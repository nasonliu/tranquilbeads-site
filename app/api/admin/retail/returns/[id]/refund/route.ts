import { z } from "zod";
import { adminReturnRefundLinkDto, adminReturnRefundRequestDto, linkAdminReturnRefund, prepareAdminReturnRefund } from "@/src/lib/retail/returns";
import { assertSameOrigin, requireRetailPermission } from "@/src/lib/retail/admin-auth";
import { getRetailServerConfig } from "@/src/lib/retail/config";
import { completeAdminRefund, failAdminRefund } from "@/src/lib/retail/operations";
import { getPaypalAccessToken, PaypalRefundRejectedError, refundPaypalCapture } from "@/src/lib/retail/paypal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
const headers = { "cache-control": "no-store" };

export async function POST(request: Request, context: Context) {
  try {
    const actor = await requireRetailPermission("returns:manage");
    await requireRetailPermission("orders:refund");
    await assertSameOrigin();
    const { id } = await context.params;
    const body = await request.json();
    if (body && typeof body === "object" && !Array.isArray(body) && "refundRequestId" in body) {
      await linkAdminReturnRefund(id, adminReturnRefundLinkDto.parse(body), actor);
      return Response.json({ ok: true, linked: true }, { headers });
    }
    const input = adminReturnRefundRequestDto.parse(body);
    const prepared = await prepareAdminReturnRefund(z.string().uuid().parse(id), input, actor);
    if (prepared.status === "completed" && prepared.paypalRefundId) return Response.json({ ok: true, refundRequestId: prepared.refundRequestId, status: prepared.status, refundId: prepared.paypalRefundId, duplicate: true }, { headers });
    const config = getRetailServerConfig(); if (!config.enabled) return Response.json({ ok: false, error: "retail_unavailable" }, { status: 503, headers });
    const token = await getPaypalAccessToken({ clientId: config.paypalClientId, clientSecret: config.paypalClientSecret, baseUrl: config.paypalBaseUrl });
    let refundId: string;
    try { refundId = await refundPaypalCapture(prepared.captureId, prepared.amountMinor, prepared.currency, input.reason, token, config.paypalBaseUrl, input.idempotencyKey); }
    catch (error) { if (error instanceof PaypalRefundRejectedError) await failAdminRefund(input.idempotencyKey, error.message); throw error; }
    try { await completeAdminRefund(input.idempotencyKey, refundId); } catch { return Response.json({ ok: false, error: "refund_reconciliation_pending", refundRequestId: prepared.refundRequestId, refundId }, { status: 503, headers }); }
    return Response.json({ ok: true, refundRequestId: prepared.refundRequestId, status: "completed", refundId }, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid_request";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 400;
    return Response.json({ ok: false, error: status === 401 ? "unauthorized" : status === 403 ? "forbidden" : "invalid_request" }, { status, headers });
  }
}
