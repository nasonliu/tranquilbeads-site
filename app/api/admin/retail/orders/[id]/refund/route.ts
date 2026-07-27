import { z } from "zod";

import { assertSameOrigin,requireRetailAdmin } from "@/src/lib/retail/admin-auth";
import { getRetailServerConfig } from "@/src/lib/retail/config";
import { completeAdminRefund,failAdminRefund,prepareAdminRefund,refundDto } from "@/src/lib/retail/operations";
import { getPaypalAccessToken,PaypalRefundRejectedError,refundPaypalCapture } from "@/src/lib/retail/paypal";

export const runtime="nodejs";export const dynamic="force-dynamic";
type Context={params:Promise<{id:string}>};
const noStore={"cache-control":"no-store"};
export async function POST(request:Request,context:Context){
  try{
    await requireRetailAdmin();await assertSameOrigin();
    const {id}=await context.params,orderId=z.coerce.number().int().positive().parse(id),input=refundDto.parse(await request.json());
    const prepared=await prepareAdminRefund(orderId,input);
    if(prepared.status==="completed"&&prepared.paypalRefundId)return Response.json({ok:true,refundId:prepared.paypalRefundId,duplicate:true},{headers:noStore});
    const config=getRetailServerConfig();if(!config.enabled)return Response.json({ok:false,error:"retail_unavailable"},{status:503,headers:noStore});
    const token=await getPaypalAccessToken({clientId:config.paypalClientId,clientSecret:config.paypalClientSecret,baseUrl:config.paypalBaseUrl});
    let refundId:string;
    // Keep the stable UUID unchanged: PayPal-Request-Id accepts at most 38
    // single-byte characters, so a descriptive prefix would invalidate it.
    try{refundId=await refundPaypalCapture(prepared.captureId,prepared.amountMinor,prepared.currency,input.reason,token,config.paypalBaseUrl,input.idempotencyKey);}
    catch(error){
      // Only an explicit PayPal HTTP rejection proves no refund was accepted.
      // Network/parse ambiguity stays pending and blocks a new idempotency key.
      if(error instanceof PaypalRefundRejectedError)await failAdminRefund(input.idempotencyKey,error.message);
      throw error;
    }
    try{await completeAdminRefund(input.idempotencyKey,refundId);}catch{return Response.json({ok:false,error:"refund_reconciliation_pending",refundId},{status:503,headers:noStore});}
    return Response.json({ok:true,refundId},{headers:noStore});
  }catch(error){return Response.json({ok:false,error:error instanceof Error?error.message:"refund_unavailable"},{status:400,headers:noStore});}
}
