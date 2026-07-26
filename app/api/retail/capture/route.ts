import { z } from "zod";

import { getRetailPaymentGate } from "@/src/lib/retail/gate";
import { capturePaypalOrder, getPaypalAccessToken } from "@/src/lib/retail/paypal";

export const runtime = "nodejs";
const schema = z.object({ orderId: z.string().min(1).max(128) }).strict();

export async function POST(request: Request) {
  const gate = getRetailPaymentGate();
  if (!gate.enabled) return Response.json({ ok: false, error: "retail_unavailable" }, { status: 503 });
  let input: z.infer<typeof schema>;
  try { input = schema.parse(await request.json()); } catch { return Response.json({ ok: false, error: "invalid_request" }, { status: 400 }); }
  const { config } = gate;
  try {
    const { auditRetailEvent, claimRetailCapture, getRetailOrder, markRetailOrderCaptured, restoreRetailOrderAfterCaptureFailure } = await import("@/src/lib/retail/db");
    const current = await getRetailOrder(input.orderId);
    if (!current) return Response.json({ ok: false, error: "order_not_found" }, { status: 404 });
    if (current.status === "captured") return Response.json({ ok: true, orderId: input.orderId });
    const order = await claimRetailCapture(input.orderId);
    if (!order) return Response.json({ ok: false, error: current.status === "capturing" ? "capture_in_progress" : "order_unavailable" }, { status: 409 });
    const quote = { currency: order.currency, totalMinor: Number(order.amount_minor), items: [] };
    try {
      const token = await getPaypalAccessToken({ clientId: config.paypalClientId, clientSecret: config.paypalClientSecret, baseUrl: config.paypalBaseUrl });
      const captureId = await capturePaypalOrder(input.orderId, quote, token, config.paypalBaseUrl, `retail-capture-${input.orderId}`);
      if (!await markRetailOrderCaptured(input.orderId, captureId)) return Response.json({ ok: false, error: "capture_conflict" }, { status: 409 });
      await auditRetailEvent(input.orderId, "captured", { captureId });
      return Response.json({ ok: true, orderId: input.orderId });
    } catch {
      await restoreRetailOrderAfterCaptureFailure(input.orderId);
      return Response.json({ ok: false, error: "capture_unavailable" }, { status: 503 });
    }
  } catch { return Response.json({ ok: false, error: "capture_unavailable" }, { status: 503 }); }
}
