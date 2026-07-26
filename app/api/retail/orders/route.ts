import { z } from "zod";

import { getRetailPaymentGate } from "@/src/lib/retail/gate";
import { createPaypalOrder, getPaypalAccessToken } from "@/src/lib/retail/paypal";

export const runtime = "nodejs";
const requestSchema = z.object({
  requestId: z.string().uuid(),
  items: z.array(z.object({ sku: z.string().min(1).max(100), quantity: z.number().int().min(1).max(10) }).strict()).min(1).max(10),
}).strict();

export async function POST(request: Request) {
  const gate = getRetailPaymentGate();
  if (!gate.enabled) return Response.json({ ok: false, error: "retail_unavailable" }, { status: 503 });
  let input: z.infer<typeof requestSchema>;
  try { input = requestSchema.parse(await request.json()); } catch { return Response.json({ ok: false, error: "invalid_request" }, { status: 400 }); }
  const { config } = gate;
  try {
    const { attachPaypalOrder, getRetailOrderByRequestId, reserveRetailOrder } = await import("@/src/lib/retail/db");
    const reserved = await reserveRetailOrder(input.requestId, input.items);
    if (reserved.paypal_order_id) return Response.json({ ok: true, orderId: reserved.paypal_order_id });
    const quote = { currency: reserved.currency, totalMinor: Number(reserved.amount_minor), items: reserved.items_snapshot as Array<{ sku: string; quantity: number; unitAmountMinor: number }> };

    // Both the local reservation and PayPal idempotency key are stable across retries.
    // A concurrent retry can therefore never create a second payable remote order.
    const token = await getPaypalAccessToken({ clientId: config.paypalClientId, clientSecret: config.paypalClientSecret, baseUrl: config.paypalBaseUrl });
    const paypalOrderId = await createPaypalOrder(quote, token, config.paypalBaseUrl, `retail-order-${input.requestId}`);
    if (await attachPaypalOrder(input.requestId, paypalOrderId)) return Response.json({ ok: true, orderId: paypalOrderId });
    const resolved = await getRetailOrderByRequestId(input.requestId);
    if (resolved?.paypal_order_id) return Response.json({ ok: true, orderId: resolved.paypal_order_id });
    return Response.json({ ok: false, error: "checkout_unavailable" }, { status: 503 });
  } catch (error) {
    if (error instanceof Error && error.message === "checkout_expired") return Response.json({ ok: false, error: "checkout_expired" }, { status: 410 });
    if (error instanceof Error && ["idempotency conflict"].includes(error.message)) return Response.json({ ok: false, error: "request_conflict" }, { status: 409 });
    if (error instanceof Error && ["invalid cart", "duplicate sku", "unknown sku", "unavailable sku"].includes(error.message)) return Response.json({ ok: false, error: "invalid_cart" }, { status: 422 });
    return Response.json({ ok: false, error: "checkout_unavailable" }, { status: 503 });
  }
}
