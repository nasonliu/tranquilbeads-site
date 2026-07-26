import { neon } from "@neondatabase/serverless";
import { isAuthorizedRetailReservationCron } from "@/src/lib/retail/cron-auth";
import { getRetailServerConfig } from "@/src/lib/retail/config";
import { getPaypalAccessToken,getPaypalOrderDetails,getPaypalOrderState } from "@/src/lib/retail/paypal";
import { deliverRetailNotifications } from "@/src/lib/retail/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "cache-control": "no-store" };

export async function GET(request: Request) {
  if (!isAuthorizedRetailReservationCron(request.headers.get("authorization"))) {
    return Response.json({ ok: false }, { status: 401, headers: noStore });
  }
  const url = process.env.DATABASE_URL;
  if (!url) return Response.json({ ok: false, error: "retail_database_unavailable" }, { status: 503, headers: noStore });
  try {
    let reconciled=0,pending=0;
    const config=getRetailServerConfig();
    if(config.enabled)try{
      const {listRetailCapturesNeedingReconciliation,markRetailOrderCaptured,restoreRetailOrderAfterCaptureFailure}=await import("@/src/lib/retail/db");
      const token=await getPaypalAccessToken({clientId:config.paypalClientId,clientSecret:config.paypalClientSecret,baseUrl:config.paypalBaseUrl});
      for(const order of await listRetailCapturesNeedingReconciliation()){
        try{
          const state=await getPaypalOrderState(order.paypal_order_id,token,config.paypalBaseUrl);
          if(state.captureId&&state.captureCurrency===String(order.currency).trim()&&state.captureAmountMinor===Number(order.amount_minor)){
            const details=await getPaypalOrderDetails(order.paypal_order_id,token,config.paypalBaseUrl);
            if(await markRetailOrderCaptured(order.paypal_order_id,state.captureId,details.customer,details.shipping,details.breakdown?.feeMinor??null,details.breakdown?.netMinor??null))reconciled++;
            else pending++;
          }else if(["CREATED","APPROVED","VOIDED","PAYER_ACTION_REQUIRED"].includes(state.status)){await restoreRetailOrderAfterCaptureFailure(order.paypal_order_id);}
          else pending++;
        }catch{pending++;}
      }
    }catch{pending++;}
    const rows = await neon(url)`SELECT retail_release_expired_reservations() AS released`;
    const notifications=await deliverRetailNotifications();
    return Response.json({ ok: true, released: Number(rows[0]?.released ?? 0),reconciled,pending,notifications }, { headers: noStore });
  } catch {
    return Response.json({ ok: false, error: "retail_reservation_cleanup_failed" }, { status: 503, headers: noStore });
  }
}
