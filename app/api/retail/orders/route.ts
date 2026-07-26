import { z } from "zod";

import { retailCatalog } from "@/src/data/retail/catalog";
import { calculateRetailOrder } from "@/src/lib/retail/catalog";
import { getRetailPaymentGate } from "@/src/lib/retail/gate";
import { createPaypalOrder, getPaypalAccessToken } from "@/src/lib/retail/paypal";

export const runtime = "nodejs";
const requestSchema = z.object({
  requestId: z.string().uuid(),
  items: z.array(z.object({ sku: z.string().min(1).max(100), quantity: z.number().int() }).strict()).min(1).max(10),
}).strict();

export async function POST(request: Request) {
  const gate = getRetailPaymentGate();
  if (!gate.enabled) return Response.json({ ok: false, error: "retail_unavailable" }, { status: 503 });
  let input: z.infer<typeof requestSchema>;
  try { input = requestSchema.parse(await request.json()); } catch { return Response.json({ ok: false, error: "invalid_request" }, { status: 400 }); }
  const { config } = gate;
  try {
    const quote = calculateRetailOrder(input.items, retailCatalog);
    const { attachPaypalOrder, getRetailOrderByRequestId, reserveRetailOrder } = await import("@/src/lib/retail/db");
    const reserved = await reserveRetailOrder(input.requestId, quote);
    if (reserved.paypal_order_id) return Response.json({ ok: true, orderId: reserved.paypal_order_id });

    // Both the local reservation and PayPal idempotency key are stable across retries.
    // A concurrent retry can therefore never create a second payable remote order.
    const token = await getPaypalAccessToken({ clientId: config.paypalClientId, clientSecret: config.paypalClientSecret, baseUrl: config.paypalBaseUrl });
    const paypalOrderId = await createPaypalOrder(quote, token, config.paypalBaseUrl, `retail-order-${input.requestId}`);
    if (await attachPaypalOrder(input.requestId, paypalOrderId)) return Response.json({ ok: true, orderId: paypalOrderId });
    const resolved = await getRetailOrderByRequestId(input.requestId);
    if (resolved?.paypal_order_id) return Response.json({ ok: true, orderId: resolved.paypal_order_id });
    return Response.json({ ok: false, error: "checkout_unavailable" }, { status: 503 });
  } catch (error) {
    if (error instanceof Error && error.message === "idempotency_conflict") return Response.json({ ok: false, error: "request_conflict" }, { status: 409 });
    if (error instanceof Error && ["invalid_cart", "invalid_quantity", "duplicate_sku", "unknown_sku", "unavailable_sku", "mixed_currency", "invalid_catalog_item"].includes(error.message)) return Response.json({ ok: false, error: "invalid_cart" }, { status: 422 });
    return Response.json({ ok: false, error: "checkout_unavailable" }, { status: 503 });
  }
}
