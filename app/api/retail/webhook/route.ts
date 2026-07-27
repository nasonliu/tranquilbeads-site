import { getRetailPaymentGate } from "@/src/lib/retail/gate";
import { getPaypalAccessToken, getPaypalOrderDetails, verifyPaypalWebhook } from "@/src/lib/retail/paypal";
import { webhookResponseStatus } from "@/src/lib/retail/webhook-result";

export const runtime = "nodejs";
type PaypalEvent = { id?: string; event_type?: string; resource?: { supplementary_data?: { related_ids?: { order_id?: string } }; id?: string } };
type PaypalOrderDetails = Awaited<ReturnType<typeof getPaypalOrderDetails>>;
const emptyPaypalOrderDetails: PaypalOrderDetails = { customer: { email: "", name: "" }, shipping: { recipient: "", line1: "", line2: "", region: "", city: "", postalCode: "", country: "" }, breakdown: null };

export async function POST(request: Request) {
  const gate = getRetailPaymentGate();
  if (!gate.enabled) return new Response(null, { status: 503 });
  const { config } = gate;
  let rawPayload: string;
  let event: PaypalEvent;
  try { rawPayload = await request.text(); event = JSON.parse(rawPayload) as PaypalEvent; } catch { return new Response(null, { status: 400 }); }
  if (!event.id || !event.event_type) return new Response(null, { status: 400 });
  let stage = "access_token";
  try {
    const token = await getPaypalAccessToken({ clientId: config.paypalClientId, clientSecret: config.paypalClientSecret, baseUrl: config.paypalBaseUrl });
    stage = "verify_signature";
    if (!await verifyPaypalWebhook(request.headers, event, { webhookId: config.paypalWebhookId, accessToken: token, baseUrl: config.paypalBaseUrl })) return new Response(null, { status: 400 });
    stage = "db_load";
    const { processVerifiedWebhook } = await import("@/src/lib/retail/db");
    const orderId = event.resource?.supplementary_data?.related_ids?.order_id;
    let details: PaypalOrderDetails = emptyPaypalOrderDetails;
    if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      if (!orderId) return new Response(null, { status: 503 });
      try { details = await getPaypalOrderDetails(orderId, token, config.paypalBaseUrl); }
      catch { /* the verified capture can still be durably applied without enrichment */ }
    }
    stage = "db_process";
    return new Response(null, { status: webhookResponseStatus(await processVerifiedWebhook(event.id, event.event_type, rawPayload, event, details.customer, details.shipping, details.breakdown?.feeMinor ?? null, details.breakdown?.netMinor ?? null)) });
  } catch {
    console.error("retail_webhook_failed", stage);
    return new Response(null, { status: 503 });
  }
}
