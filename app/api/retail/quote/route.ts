import { z } from "zod";

import { getRetailPaymentGate } from "@/src/lib/retail/gate";
import { retailCheckoutDto } from "@/src/lib/retail/operations";
import { consumeRetailRateLimit } from "@/src/lib/retail/rate-limit";
import { quoteStorefrontV3 } from "@/src/lib/retail/storefront-v3";

export const runtime="nodejs";
// New clients use variantSku. A legacy single-SKU product is its default V3
// variant, so accept the old shape and canonicalize it before SQL sees it.
const variantItemDto=z.union([
  z.object({variantSku:z.string().trim().min(1).max(100),quantity:z.number().int().min(1).max(10)}).strict(),
  z.object({sku:z.string().trim().min(1).max(100),quantity:z.number().int().min(1).max(10)}).strict(),
]).transform((item) => ({variantSku:"variantSku" in item ? item.variantSku : item.sku,quantity:item.quantity}));
const schema=z.object({items:z.array(variantItemDto).min(1).max(10),checkout:retailCheckoutDto,promotionCode:z.string().trim().min(1).max(64).optional()}).strict();
const noStore={"cache-control":"no-store"};

export async function POST(request:Request){
  if(!getRetailPaymentGate().enabled)return Response.json({ok:false,error:"retail_unavailable"},{status:503,headers:noStore});
  let input:z.infer<typeof schema>;
  try{input=schema.parse(await request.json());}catch{return Response.json({ok:false,error:"invalid_request"},{status:400,headers:noStore});}
  try{
    if(!await consumeRetailRateLimit(request,"checkout_quote",60,5000))return Response.json({ok:false,error:"rate_limited"},{status:429,headers:{...noStore,"retry-after":"900"}});
    return Response.json({ok:true,quote:await quoteStorefrontV3(input.items,input.checkout,input.promotionCode)},{headers:noStore});
  }catch(error){
    const message=error instanceof Error?error.message:"quote_unavailable";
    if(["invalid checkout","invalid cart","duplicate sku","unknown sku","unavailable sku","unsupported shipping country","invalid promotion","promotion unavailable"].includes(message))return Response.json({ok:false,error:message.replaceAll(" ","_")},{status:422,headers:noStore});
    return Response.json({ok:false,error:"quote_unavailable"},{status:503,headers:noStore});
  }
}
