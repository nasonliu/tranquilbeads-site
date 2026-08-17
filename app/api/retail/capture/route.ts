import { after } from "next/server";
import { z } from "zod";

import { getRetailPaymentGate } from "@/src/lib/retail/gate";
import { deliverRetailNotificationsWithDiagnostics } from "@/src/lib/retail/notification-delivery";
import { capturePaypalOrder, getPaypalAccessToken, getPaypalOrderDetails, getPaypalOrderState } from "@/src/lib/retail/paypal";
import { consumeRetailRateLimit } from "@/src/lib/retail/rate-limit";

export const runtime = "nodejs";
const schema = z.object({ orderId: z.string().min(1).max(128),requestId:z.string().uuid() }).strict();
type PaypalOrderDetails = Awaited<ReturnType<typeof getPaypalOrderDetails>>;
const emptyPaypalOrderDetails: PaypalOrderDetails = { customer: { email: "", name: "" }, shipping: { recipient: "", line1: "", line2: "", region: "", city: "", postalCode: "", country: "" }, breakdown: null };
const scheduleRetailNotificationDelivery = () => {
  after(() => deliverRetailNotificationsWithDiagnostics());
};

export async function POST(request: Request) {
  const gate = getRetailPaymentGate();
  if (!gate.enabled) return Response.json({ ok: false, error: "retail_unavailable" }, { status: 503 });
  let input: z.infer<typeof schema>;
  try { input = schema.parse(await request.json()); } catch { return Response.json({ ok: false, error: "invalid_request" }, { status: 400 }); }
  const { config } = gate;
  try {
    if(!await consumeRetailRateLimit(request,"checkout_capture",30,1000))return Response.json({ok:false,error:"rate_limited"},{status:429,headers:{"retry-after":"900"}});
    const { auditRetailEvent, claimRetailCapture, finalizeRetailCustomerPostCapture, getRetailOrder, markRetailOrderCaptured, restoreRetailOrderAfterCaptureFailure } = await import("@/src/lib/retail/db");
    const current = await getRetailOrder(input.orderId);
    if (!current) return Response.json({ ok: false, error: "order_not_found" }, { status: 404 });
    if(current.client_request_id!==input.requestId)return Response.json({ok:false,error:"request_conflict"},{status:409});
    if (current.status === "expired") return Response.json({ ok: false, error: "checkout_expired" }, { status: 410 });
    if (current.status === "captured") {
      await finalizeRetailCustomerPostCapture(input.orderId);
      scheduleRetailNotificationDelivery();
      return Response.json({ ok: true, orderId: input.orderId });
    }
    const token=await getPaypalAccessToken({clientId:config.paypalClientId,clientSecret:config.paypalClientSecret,baseUrl:config.paypalBaseUrl});
    const order = await claimRetailCapture(input.orderId);
    if (!order) return Response.json({ ok: false, error: current.status === "capturing" ? "capture_in_progress" : "order_unavailable" }, { status: 409 });
    const quote = { currency: order.currency, totalMinor: Number(order.amount_minor),subtotalMinor:Number(current.subtotal_minor),shippingMinor:Number(current.shipping_minor),taxMinor:Number(current.tax_minor),discountMinor:Number(current.discount_minor),shippingMethod:current.shipping_method??"standard",shipping:current.checkout_shipping as {recipient:string;line1:string;line2?:string;city:string;region?:string;postalCode?:string;country:string},items: current.items_snapshot as Array<{sku:string;quantity:number;unitAmountMinor:number}> };
    let captureId: string;
    try {
      captureId = await capturePaypalOrder(input.orderId, quote, token, config.paypalBaseUrl, `retail-capture-${input.orderId}`);
    } catch {
      // A capture POST can time out after PayPal has charged the buyer. Query
      // the remote order before changing local state; unknown outcomes remain
      // `capturing` for the reconciliation cron and must not expire inventory.
      try {
        const state=await getPaypalOrderState(input.orderId,token,config.paypalBaseUrl);
        if(state.captureId&&state.captureCurrency===quote.currency&&state.captureAmountMinor===quote.totalMinor)captureId=state.captureId;
        else if(["CREATED","APPROVED","VOIDED","PAYER_ACTION_REQUIRED"].includes(state.status)){await restoreRetailOrderAfterCaptureFailure(input.orderId);return Response.json({ok:false,error:"capture_unavailable"},{status:503});}
        else return Response.json({ok:false,error:"capture_reconciliation_pending",requestId:input.requestId},{status:503});
      } catch {return Response.json({ok:false,error:"capture_reconciliation_pending",requestId:input.requestId},{status:503});}
    }
    let details: PaypalOrderDetails = emptyPaypalOrderDetails;
    try { details = await getPaypalOrderDetails(input.orderId, token, config.paypalBaseUrl); } catch { /* webhook or a later admin read can enrich snapshots */ }
    try {
      if (!await markRetailOrderCaptured(input.orderId, captureId!, details.customer, details.shipping, details.breakdown?.feeMinor ?? null, details.breakdown?.netMinor ?? null)) return Response.json({ ok: false, error: "capture_conflict" }, { status: 409 });
      await auditRetailEvent(input.orderId, "captured", { captureId });
      scheduleRetailNotificationDelivery();
      return Response.json({ ok: true, orderId: input.orderId,requestId:input.requestId });
    } catch {
      // Preserve `capturing`: the stable capture id and verified webhook can
      // converge accounting/inventory without ever asking PayPal to charge again.
      return Response.json({ ok: false, error: "capture_reconciliation_pending",requestId:input.requestId }, { status: 503 });
    }
  } catch { return Response.json({ ok: false, error: "capture_unavailable" }, { status: 503 }); }
}
