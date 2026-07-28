import { getRetailServerConfig } from "@/src/lib/retail/config";
import { guardedRetailSql } from "@/src/lib/retail/database-identity";
import { isRetailBlobConfigured } from "@/src/lib/retail/blob";

export const runtime="nodejs";export const dynamic="force-dynamic";
const noStore={"cache-control":"no-store"};
const notificationsConfigured=()=>Boolean(process.env.RETAIL_RESEND_API_KEY&&process.env.RETAIL_EMAIL_FROM);
const notificationsRequired=()=>process.env.VERCEL_ENV==="production";
export async function GET(){
  const config=getRetailServerConfig(),databaseUrl=process.env.RETAIL_DATABASE_URL||process.env.DATABASE_URL;
  if(!config.enabled||!databaseUrl)return Response.json({ok:false,status:"not_ready",paymentConfigured:config.enabled,notificationsConfigured:notificationsConfigured(),notificationsRequired:notificationsRequired(),blobConfigured:isRetailBlobConfigured()},{status:503,headers:noStore});
  try{
    const rows=await guardedRetailSql()`SELECT
      to_regprocedure('retail_quote_checkout_v3(jsonb,jsonb,text)') IS NOT NULL
        AND to_regprocedure('retail_create_checkout_v3(uuid,jsonb,jsonb,bigint,text)') IS NOT NULL AS checkout_ready,
      to_regclass('retail_product_variants') IS NOT NULL
        AND to_regclass('retail_variant_price_history') IS NOT NULL
        AND to_regclass('retail_variant_inventory_balances') IS NOT NULL AS variant_catalog_ready,
      to_regclass('retail_shipping_zones') IS NOT NULL AS shipping_ready,
      (SELECT count(*)::int FROM retail_shipping_zones WHERE active) AS active_shipping_zones`;
    const blobConfigured=isRetailBlobConfigured(),notifications=notificationsConfigured(),requireNotifications=notificationsRequired();
    const ready=rows[0]?.checkout_ready===true&&rows[0]?.variant_catalog_ready===true&&rows[0]?.shipping_ready===true&&Number(rows[0]?.active_shipping_zones??0)>0&&blobConfigured&&(!requireNotifications||notifications);
    return Response.json({ok:ready,status:ready?"ready":"configuration_required",database:true,databaseEnvironment:config.databaseEnvironment,paymentConfigured:true,paymentMode:config.paymentMode,checkoutVersion:"v3",variantCatalogReady:rows[0]?.variant_catalog_ready===true,activeShippingZones:Number(rows[0]?.active_shipping_zones??0),notificationsConfigured:notifications,notificationsRequired:requireNotifications,blobConfigured},{status:ready?200:503,headers:noStore});
  }catch{return Response.json({ok:false,status:"database_unavailable",paymentConfigured:true,notificationsConfigured:notificationsConfigured(),notificationsRequired:notificationsRequired(),blobConfigured:isRetailBlobConfigured()},{status:503,headers:noStore});}
}
