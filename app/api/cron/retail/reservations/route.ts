import { isAuthorizedRetailReservationCron } from "@/src/lib/retail/cron-auth";
import { getRetailServerConfig } from "@/src/lib/retail/config";
import { guardedRetailSql } from "@/src/lib/retail/database-identity";
import { getPaypalAccessToken,getPaypalOrderDetails,getPaypalOrderState,PaypalRefundRejectedError,refundPaypalCapture } from "@/src/lib/retail/paypal";
import { deliverRetailNotifications } from "@/src/lib/retail/notifications";
import { deliverRetailMarketingCampaigns } from "@/src/lib/retail/marketing-campaigns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "cache-control": "no-store" };

export async function GET(request: Request) {
  if (!isAuthorizedRetailReservationCron(request.headers.get("authorization"))) {
    return Response.json({ ok: false }, { status: 401, headers: noStore });
  }
  const url = process.env.RETAIL_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) return Response.json({ ok: false, error: "retail_database_unavailable" }, { status: 503, headers: noStore });
  try {
    let reconciled=0,pending=0,accountingReconciled=0,refundReconciled=0;
    const config=getRetailServerConfig();
    if(config.enabled)try{
      const {listRetailCapturedOrdersNeedingAccounting,listRetailCapturesNeedingReconciliation,listRetailRefundsNeedingReconciliation,markRetailOrderCaptured,restoreRetailOrderAfterCaptureFailure}=await import("@/src/lib/retail/db");
      const {completeAdminRefund,failAdminRefund}=await import("@/src/lib/retail/operations");
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
      for(const order of await listRetailCapturedOrdersNeedingAccounting()){
        try{
          const state=await getPaypalOrderState(order.paypal_order_id,token,config.paypalBaseUrl);
          if(state.captureId&&state.captureCurrency===String(order.currency).trim()&&state.captureAmountMinor===Number(order.amount_minor)){
            const details=await getPaypalOrderDetails(order.paypal_order_id,token,config.paypalBaseUrl);
            if(details.breakdown&&await markRetailOrderCaptured(order.paypal_order_id,state.captureId,details.customer,details.shipping,details.breakdown.feeMinor,details.breakdown.netMinor))accountingReconciled++;else pending++;
          }else pending++;
        }catch{pending++;}
      }
      for(const refund of await listRetailRefundsNeedingReconciliation()){
        try{const refundId=await refundPaypalCapture(refund.capture_id,Number(refund.amount_minor),String(refund.currency).trim(),refund.reason,token,config.paypalBaseUrl,refund.idempotency_key);await completeAdminRefund(refund.idempotency_key,refundId);refundReconciled++;}
        catch(error){if(error instanceof PaypalRefundRejectedError)await failAdminRefund(refund.idempotency_key,error.message);else pending++;}
      }
    }catch{pending++;}
    const rows = await guardedRetailSql()`SELECT retail_release_expired_reservations() AS released`;
    const notifications=await deliverRetailNotifications();
    const marketingCampaigns=await deliverRetailMarketingCampaigns();
    return Response.json({ ok: true, released: Number(rows[0]?.released ?? 0),reconciled,accountingReconciled,refundReconciled,pending,notifications,marketingCampaigns }, { headers: noStore });
  } catch {
    return Response.json({ ok: false, error: "retail_reservation_cleanup_failed" }, { status: 503, headers: noStore });
  }
}
