import { z } from "zod";

import { getRetailPaymentGate } from "@/src/lib/retail/gate";
import { quoteRetailCheckout, retailCartDto, retailCheckoutDto } from "@/src/lib/retail/operations";
import { consumeRetailRateLimit } from "@/src/lib/retail/rate-limit";

export const runtime="nodejs";
const schema=z.object({items:retailCartDto,checkout:retailCheckoutDto}).strict();
const noStore={"cache-control":"no-store"};

export async function POST(request:Request){
  if(!getRetailPaymentGate().enabled)return Response.json({ok:false,error:"retail_unavailable"},{status:503,headers:noStore});
  let input:z.infer<typeof schema>;
  try{input=schema.parse(await request.json());}catch{return Response.json({ok:false,error:"invalid_request"},{status:400,headers:noStore});}
  try{
    if(!await consumeRetailRateLimit(request,"checkout_quote",60,5000))return Response.json({ok:false,error:"rate_limited"},{status:429,headers:{...noStore,"retry-after":"900"}});
    return Response.json({ok:true,quote:await quoteRetailCheckout(input.items,input.checkout)},{headers:noStore});
  }catch(error){
    const message=error instanceof Error?error.message:"quote_unavailable";
    if(["invalid checkout","invalid cart","duplicate sku","unknown sku","unavailable sku","unsupported shipping country"].includes(message))return Response.json({ok:false,error:message.replaceAll(" ","_")},{status:422,headers:noStore});
    return Response.json({ok:false,error:"quote_unavailable"},{status:503,headers:noStore});
  }
}
