import { getRetailServerConfig, isRetailNotificationConfigurationValid } from "@/src/lib/retail/config";
import { guardedRetailSql } from "@/src/lib/retail/database-identity";
import { isRetailBlobConfigured } from "@/src/lib/retail/blob";

export const runtime="nodejs";export const dynamic="force-dynamic";
const noStore={"cache-control":"no-store"};
const notificationConfiguration=()=>({
  resendApiKey:Boolean(process.env.RETAIL_RESEND_API_KEY),
  from:Boolean(process.env.RETAIL_EMAIL_FROM),
  replyTo:Boolean(process.env.RETAIL_EMAIL_REPLY_TO),
  portalTokenSecretValid:(process.env.RETAIL_PORTAL_TOKEN_SECRET?.length??0)>=32,
});
const notificationsConfigured=()=>isRetailNotificationConfigurationValid();
const notificationsRequired=()=>process.env.VERCEL_ENV==="production";
export async function GET(){
  const config=getRetailServerConfig(),databaseUrl=process.env.RETAIL_DATABASE_URL||process.env.DATABASE_URL;
  if(!config.enabled||!databaseUrl)return Response.json({ok:false,status:"not_ready",paymentConfigured:config.enabled,notificationSchemaReady:false,accountSchemaReady:false,notificationsConfigured:notificationsConfigured(),notificationConfiguration:notificationConfiguration(),notificationsRequired:notificationsRequired(),blobConfigured:isRetailBlobConfigured()},{status:503,headers:noStore});
  try{
    const rows=await guardedRetailSql()`SELECT
      to_regprocedure('retail_quote_checkout_v3(jsonb,jsonb,text)') IS NOT NULL
        AND to_regprocedure('retail_create_checkout_v3(uuid,jsonb,jsonb,bigint,text)') IS NOT NULL AS checkout_ready,
      to_regclass('retail_product_variants') IS NOT NULL
        AND to_regclass('retail_variant_price_history') IS NOT NULL
        AND to_regclass('retail_variant_inventory_balances') IS NOT NULL AS variant_catalog_ready,
      to_regclass('retail_shipping_zones') IS NOT NULL AS shipping_ready,
      to_regclass('retail_customer_portal_notification_tokens') IS NOT NULL
        AND to_regprocedure('retail_issue_notification_portal_token(bigint,uuid,text)') IS NOT NULL
        AND EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='retail_orders'::regclass AND attname='checkout_locale' AND NOT attisdropped)
        AND EXISTS(SELECT 1 FROM retail_schema_migrations WHERE name='20260812_retail_order_locale_notification_contract.sql') AS notification_schema_ready,
      to_regclass('retail_customer_login_tokens') IS NOT NULL
        AND to_regclass('retail_customer_sessions') IS NOT NULL
        AND to_regclass('retail_customer_marketing_consents') IS NOT NULL
        AND to_regprocedure('retail_set_checkout_account_intent(uuid,text)') IS NOT NULL
        AND to_regprocedure('retail_set_checkout_marketing_intent(uuid,boolean,text)') IS NOT NULL
        AND to_regprocedure('retail_finalize_customer_post_capture(text)') IS NOT NULL
        AND to_regprocedure('retail_apply_paypal_capture_and_finalize(text,text,jsonb,jsonb,bigint,bigint)') IS NOT NULL
        AND to_regprocedure('retail_withdraw_customer_marketing_consent(text)') IS NOT NULL
        AND EXISTS(SELECT 1 FROM retail_schema_migrations WHERE name='20260821_retail_customer_accounts.sql')
        AND EXISTS(SELECT 1 FROM retail_schema_migrations WHERE name='20260822_retail_atomic_capture_customer_finalize.sql') AS account_schema_ready,
      (SELECT count(*)::int FROM retail_shipping_zones WHERE active) AS active_shipping_zones`;
    const blobConfigured=isRetailBlobConfigured(),notifications=notificationsConfigured(),requireNotifications=notificationsRequired();
    const ready=rows[0]?.checkout_ready===true&&rows[0]?.variant_catalog_ready===true&&rows[0]?.shipping_ready===true&&rows[0]?.notification_schema_ready===true&&rows[0]?.account_schema_ready===true&&Number(rows[0]?.active_shipping_zones??0)>0&&blobConfigured&&(!requireNotifications||notifications);
    return Response.json({ok:ready,status:ready?"ready":"configuration_required",database:true,databaseEnvironment:config.databaseEnvironment,paymentConfigured:true,paymentMode:config.paymentMode,checkoutVersion:"v3",variantCatalogReady:rows[0]?.variant_catalog_ready===true,notificationSchemaReady:rows[0]?.notification_schema_ready===true,accountSchemaReady:rows[0]?.account_schema_ready===true,activeShippingZones:Number(rows[0]?.active_shipping_zones??0),notificationsConfigured:notifications,notificationConfiguration:notificationConfiguration(),notificationsRequired:requireNotifications,blobConfigured},{status:ready?200:503,headers:noStore});
  }catch{return Response.json({ok:false,status:"database_unavailable",paymentConfigured:true,notificationSchemaReady:false,accountSchemaReady:false,notificationsConfigured:notificationsConfigured(),notificationConfiguration:notificationConfiguration(),notificationsRequired:notificationsRequired(),blobConfigured:isRetailBlobConfigured()},{status:503,headers:noStore});}
}
