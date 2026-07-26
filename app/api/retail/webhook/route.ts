import { getRetailPaymentGate } from "@/src/lib/retail/gate";
import { getPaypalAccessToken, verifyPaypalWebhook } from "@/src/lib/retail/paypal";
import { webhookResponseStatus } from "@/src/lib/retail/webhook-result";

export const runtime = "nodejs";
type PaypalEvent = { id?: string; event_type?: string; resource?: { supplementary_data?: { related_ids?: { order_id?: string } }; id?: string } };

export async function POST(request: Request) {
  const gate = getRetailPaymentGate();
  if (!gate.enabled) return new Response(null, { status: 503 });
  const { config } = gate;
  let rawPayload: string;
  let event: PaypalEvent;
  try { rawPayload = await request.text(); event = JSON.parse(rawPayload) as PaypalEvent; } catch { return new Response(null, { status: 400 }); }
  if (!event.id || !event.event_type) return new Response(null, { status: 400 });
  try {
    const token = await getPaypalAccessToken({ clientId: config.paypalClientId, clientSecret: config.paypalClientSecret, baseUrl: config.paypalBaseUrl });
    if (!await verifyPaypalWebhook(request.headers, event, { webhookId: config.paypalWebhookId, accessToken: token, baseUrl: config.paypalBaseUrl })) return new Response(null, { status: 400 });
    const { processVerifiedWebhook } = await import("@/src/lib/retail/db");
    return new Response(null, { status: webhookResponseStatus(await processVerifiedWebhook(event.id, event.event_type, rawPayload, event)) });
  } catch { return new Response(null, { status: 503 }); }
}
