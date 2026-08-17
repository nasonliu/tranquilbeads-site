import { z } from "zod";

import { getRetailPaymentCreationGate } from "@/src/lib/retail/gate";
import { retailCheckoutDto } from "@/src/lib/retail/operations";
import { createPaypalOrder, getPaypalAccessToken } from "@/src/lib/retail/paypal";
import { consumeRetailRateLimit } from "@/src/lib/retail/rate-limit";
import { reserveStorefrontV3Order } from "@/src/lib/retail/storefront-v3";

export const runtime = "nodejs";
const variantItemDto = z.union([
  z.object({ variantSku: z.string().trim().min(1).max(100), quantity: z.number().int().min(1).max(10) }).strict(),
  z.object({ sku: z.string().trim().min(1).max(100), quantity: z.number().int().min(1).max(10) }).strict(),
]).transform((item) => ({ variantSku: "variantSku" in item ? item.variantSku : item.sku, quantity: item.quantity }));
const requestSchema = z.object({
  requestId: z.string().uuid(),
  items: z.array(variantItemDto).min(1).max(10),
  checkout: retailCheckoutDto,
  expectedTotalMinor: z.number().int().positive(),
  promotionCode: z.string().trim().min(1).max(64).optional(),
  shippingQuoteToken: z.string().trim().min(80).max(8_000).optional(),
}).strict();

export async function POST(request: Request) {
  const gate = getRetailPaymentCreationGate();
  if (!gate.enabled) return Response.json({ ok: false, error: "retail_unavailable" }, { status: 503 });
  let input: z.infer<typeof requestSchema>;
  try { input = requestSchema.parse(await request.json()); } catch { return Response.json({ ok: false, error: "invalid_request" }, { status: 400 }); }
  const { config } = gate;
  try {
    if(!await consumeRetailRateLimit(request,"checkout_create",12,500))return Response.json({ok:false,error:"rate_limited"},{status:429,headers:{"retry-after":"900"}});
    const { attachPaypalOrder, getRetailOrderByRequestId } = await import("@/src/lib/retail/db");
    const reserved = await reserveStorefrontV3Order(input.requestId, input.items,input.checkout,input.expectedTotalMinor,input.promotionCode,input.shippingQuoteToken);
    if (reserved.paypal_order_id) return Response.json({ ok: true, orderId: reserved.paypal_order_id });
    const lines = reserved.checkout_items as Array<{ variantSku?: string; sku?: string; quantity: number; unitAmountMinor?: number }>;
    if (!Array.isArray(lines) || lines.length === 0 || lines.some((line) => !line.variantSku || !Number.isSafeInteger(Number(line.quantity)) || Number(line.quantity) < 1 || !Number.isSafeInteger(Number(line.unitAmountMinor)) || Number(line.unitAmountMinor) < 1)) throw new Error("checkout_unavailable");
    const quote = { currency: String(reserved.currency).trim(), totalMinor: Number(reserved.amount_minor), subtotalMinor:Number(reserved.subtotal_minor),shippingMinor:Number(reserved.shipping_minor),taxMinor:Number(reserved.tax_minor),discountMinor:Number(reserved.discount_minor),shippingMethod:reserved.shipping_method??"standard",shipping:reserved.checkout_shipping as {recipient:string;line1:string;line2?:string;city:string;region?:string;postalCode?:string;country:string;phone?:string},items: lines.map((line) => ({ sku: line.variantSku ?? line.sku ?? "", quantity: Number(line.quantity), unitAmountMinor: Number(line.unitAmountMinor) })) };

    // Both the local reservation and PayPal idempotency key are stable across retries.
    // A concurrent retry can therefore never create a second payable remote order.
    const token = await getPaypalAccessToken({ clientId: config.paypalClientId, clientSecret: config.paypalClientSecret, baseUrl: config.paypalBaseUrl });
    // PayPal-Request-Id is limited to 38 single-byte characters. The checkout
    // request UUID is already stable and unique, while adding a text prefix
    // would push it beyond that limit and make Sandbox order creation fail.
    const paypalOrderId = await createPaypalOrder(quote, token, config.paypalBaseUrl, input.requestId);
    if (await attachPaypalOrder(input.requestId, paypalOrderId)) return Response.json({ ok: true, orderId: paypalOrderId });
    const resolved = await getRetailOrderByRequestId(input.requestId);
    if (resolved?.paypal_order_id) return Response.json({ ok: true, orderId: resolved.paypal_order_id });
    return Response.json({ ok: false, error: "checkout_unavailable" }, { status: 503 });
  } catch (error) {
    if (error instanceof Error && error.message === "checkout_expired") return Response.json({ ok: false, error: "checkout_expired" }, { status: 410 });
    if (error instanceof Error && error.message === "shipping_quote_expired") return Response.json({ ok: false, error: "shipping_quote_expired" }, { status: 410 });
    if (error instanceof Error && ["shipping_quote_invalid","shipping_quote_changed"].includes(error.message)) return Response.json({ ok: false, error: error.message }, { status: 409 });
    if (error instanceof Error && ["quote changed","promotion exhausted","promotion unavailable"].includes(error.message)) return Response.json({ok:false,error:error.message.replaceAll(" ","_")},{status:409});
    if (error instanceof Error && ["idempotency conflict"].includes(error.message)) return Response.json({ ok: false, error: "request_conflict" }, { status: 409 });
    if (error instanceof Error && ["invalid cart", "duplicate sku", "unknown sku", "unavailable sku", "invalid promotion"].includes(error.message)) return Response.json({ ok: false, error: "invalid_cart" }, { status: 422 });
    // Only emit the sanitized internal error code. PayPal credentials, request
    // payloads, customer details, and provider response descriptions are never
    // written to logs.
    console.error("retail_checkout_create_failed", error instanceof Error ? error.message : "unknown_error");
    return Response.json({ ok: false, error: "checkout_unavailable" }, { status: 503 });
  }
}
