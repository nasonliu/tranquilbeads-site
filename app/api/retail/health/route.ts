import { neon } from "@neondatabase/serverless";

import { getRetailServerConfig } from "@/src/lib/retail/config";

export const runtime="nodejs";export const dynamic="force-dynamic";
const noStore={"cache-control":"no-store"};
export async function GET(){
  const config=getRetailServerConfig(),databaseUrl=process.env.DATABASE_URL;
  if(!config.enabled||!databaseUrl)return Response.json({ok:false,status:"not_ready",paymentConfigured:config.enabled},{status:503,headers:noStore});
  try{
    const rows=await neon(databaseUrl)`SELECT to_regprocedure('retail_create_checkout_v2(uuid,jsonb,jsonb,bigint)') IS NOT NULL AS checkout_ready,to_regclass('retail_shipping_zones') IS NOT NULL AS shipping_ready,(SELECT count(*)::int FROM retail_shipping_zones WHERE active) AS active_shipping_zones`;
    const blobConfigured=Boolean((process.env.RETAIL_BLOB_READ_WRITE_TOKEN||process.env.VERCEL_OIDC_TOKEN)&&process.env.RETAIL_BLOB_STORE_ID&&process.env.RETAIL_BLOB_HOSTNAME);
    const ready=rows[0]?.checkout_ready===true&&rows[0]?.shipping_ready===true&&Number(rows[0]?.active_shipping_zones??0)>0&&blobConfigured;
    return Response.json({ok:ready,status:ready?"ready":"configuration_required",database:true,paymentConfigured:true,activeShippingZones:Number(rows[0]?.active_shipping_zones??0),notificationsConfigured:Boolean(process.env.RETAIL_RESEND_API_KEY&&process.env.RETAIL_EMAIL_FROM),blobConfigured},{status:ready?200:503,headers:noStore});
  }catch{return Response.json({ok:false,status:"database_unavailable",paymentConfigured:true},{status:503,headers:noStore});}
}
