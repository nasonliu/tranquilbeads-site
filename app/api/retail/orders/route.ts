import { z } from "zod";

import { getRetailPaymentGate } from "@/src/lib/retail/gate";
import { retailCartDto, retailCheckoutDto } from "@/src/lib/retail/operations";
import { createPaypalOrder, getPaypalAccessToken } from "@/src/lib/retail/paypal";
import { consumeRetailRateLimit } from "@/src/lib/retail/rate-limit";

export const runtime = "nodejs";
const requestSchema = z.object({
  requestId: z.string().uuid(),
  items: retailCartDto,
  checkout: retailCheckoutDto,
  expectedTotalMinor: z.number().int().positive(),
}).strict();

export async function POST(request: Request) {
  const gate = getRetailPaymentGate();
  if (!gate.enabled) return Response.json({ ok: false, error: "retail_unavailable" }, { status: 503 });
  let input: z.infer<typeof requestSchema>;
  try { input = requestSchema.parse(await request.json()); } catch { return Response.json({ ok: false, error: "invalid_request" }, { status: 400 }); }
  const { config } = gate;
  try {
    if(!await consumeRetailRateLimit(request,"checkout_create",12,500))return Response.json({ok:false,error:"rate_limited"},{status:429,headers:{"retry-after":"900"}});
    const { attachPaypalOrder, getRetailOrderByRequestId, reserveRetailOrderV2 } = await import("@/src/lib/retail/db");
    const reserved = await reserveRetailOrderV2(input.requestId, input.items,input.checkout,input.expectedTotalMinor);
    if (reserved.paypal_order_id) return Response.json({ ok: true, orderId: reserved.paypal_order_id });
    const quote = { currency: reserved.currency, totalMinor: Number(reserved.amount_minor), subtotalMinor:Number(reserved.subtotal_minor),shippingMinor:Number(reserved.shipping_minor),taxMinor:Number(reserved.tax_minor),discountMinor:Number(reserved.discount_minor),shippingMethod:reserved.shipping_method??"standard",shipping:reserved.checkout_shipping as {recipient:string;line1:string;line2?:string;city:string;region?:string;postalCode?:string;country:string;phone?:string},items: reserved.items_snapshot as Array<{ sku: string; quantity: number; unitAmountMinor: number }> };

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
    if (error instanceof Error && error.message === "quote changed") return Response.json({ok:false,error:"quote_changed"},{status:409});
    if (error instanceof Error && ["idempotency conflict"].includes(error.message)) return Response.json({ ok: false, error: "request_conflict" }, { status: 409 });
    if (error instanceof Error && ["invalid cart", "duplicate sku", "unknown sku", "unavailable sku"].includes(error.message)) return Response.json({ ok: false, error: "invalid_cart" }, { status: 422 });
    return Response.json({ ok: false, error: "checkout_unavailable" }, { status: 503 });
  }
}
