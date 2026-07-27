import "server-only";

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { z } from "zod";

// Pin both Neon options to false. `ReturnType<typeof neon>` leaves generic
// booleans unresolved and widens every query into an unusable union.
type Sql = NeonQueryFunction<false, false>;
export type StorefrontProduct = { sku:string; title_en:string; title_ar:string; description_en:string; description_ar:string; amount_minor:number; available:number; images:Array<{url:string}> };
export type StorefrontShippingZone = { country:string; name:{en:string;ar:string}; shippingMinor:number; freeShippingThresholdMinor:number|null; taxRateBps:number };

function sql(): Sql {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("retail_database_unavailable");
  return neon(connectionString);
}

export const productDto = z.object({
  sku: z.string().trim().min(1).max(80), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  titleEn: z.string().trim().min(1).max(200), titleAr: z.string().trim().min(1).max(200),
  descriptionEn: z.string().trim().max(4000).default(""), descriptionAr: z.string().trim().max(4000).default(""),
  status: z.enum(["draft", "published", "archived"]), amountMinor: z.number().int().positive(), idempotencyKey: z.string().uuid(),
});
export const productUpdateDto = productDto.omit({ sku: true, amountMinor: true, idempotencyKey: true }).partial().extend({
  status: z.enum(["draft", "published", "archived"]).optional(),
});
export const priceDto = z.object({ amountMinor: z.number().int().positive(), idempotencyKey: z.string().uuid(), reason: z.string().trim().min(1).max(200) });
export const inventoryAdjustmentDto = z.object({ productId: z.string().uuid(), delta: z.number().int().refine((v) => v !== 0), reason: z.string().trim().min(1).max(200), idempotencyKey: z.string().uuid() });
export const fulfilmentDto = z.object({ orderId: z.number().int().positive(), carrier: z.string().trim().max(100), tracking: z.string().trim().max(200), note: z.string().trim().max(2000), idempotencyKey: z.string().uuid() });
export const customerUpdateDto = z.object({ name: z.string().trim().min(1).max(200).optional(), addressId: z.string().uuid().optional(), recipient: z.string().trim().min(1).max(200).optional(), line1: z.string().trim().min(1).max(200).optional(), line2: z.string().trim().max(200).nullable().optional(), city: z.string().trim().min(1).max(100).optional(), region: z.string().trim().max(100).nullable().optional(), postalCode: z.string().trim().max(30).nullable().optional(), country: z.string().regex(/^[A-Z]{2}$/).optional(), phone: z.string().trim().max(50).nullable().optional(), isDefault: z.boolean().optional(), archive: z.boolean().optional(), idempotencyKey: z.string().uuid() }).superRefine((v,ctx)=>{if(!v.addressId&&[v.recipient,v.line1,v.city,v.country].some((x)=>x!==undefined)&&(!v.recipient||!v.line1||!v.city||!v.country))ctx.addIssue({code:"custom",message:"new address requires recipient, line1, city and country"})});
export const reconciliationDto = z.object({ status: z.enum(["pending", "reconciled", "disputed"]), idempotencyKey: z.string().uuid(), note: z.string().trim().max(500).default("") });
export const retailCheckoutDto = z.object({
  email: z.string().trim().email().max(320), recipient: z.string().trim().min(1).max(200),
  line1: z.string().trim().min(1).max(200), line2: z.string().trim().max(200).default(""),
  city: z.string().trim().min(1).max(100), region: z.string().trim().max(100).default(""),
  postalCode: z.string().trim().max(30).default(""), country: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/),
  phone: z.string().trim().max(50).default(""), termsVersion: z.string().trim().min(1).max(50), termsAccepted: z.literal(true),
}).strict();
export const retailCartDto = z.array(z.object({ sku:z.string().trim().min(1).max(100), quantity:z.number().int().min(1).max(10) }).strict()).min(1).max(10);
export const shippingZoneDto = z.object({ country:z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/), nameEn:z.string().trim().min(1).max(100), nameAr:z.string().trim().min(1).max(100), shippingMinor:z.number().int().nonnegative(), freeShippingThresholdMinor:z.number().int().positive().nullable(), taxRateBps:z.number().int().min(0).max(10000), active:z.boolean() }).strict();
export const cancellationDto = z.object({ reason:z.string().trim().min(1).max(500), idempotencyKey:z.string().uuid() }).strict();
export const refundDto = z.object({ amountMinor:z.number().int().positive(), reason:z.string().trim().min(1).max(255), idempotencyKey:z.string().uuid() }).strict();

async function audit(action: string, entityType: string, entityId: string | null, detail: unknown) {
  const q = sql();
  await q`INSERT INTO retail_admin_audit(action,entity_type,entity_id,detail) VALUES(${action},${entityType},${entityId},${JSON.stringify(detail)}::jsonb)`;
}

export async function listStorefrontProducts(): Promise<StorefrontProduct[]> { try { const url=process.env.DATABASE_URL; if(!url) return []; const q: Sql=neon(url); return await q`SELECT p.sku,p.title_en,p.title_ar,p.description_en,p.description_ar,h.amount_minor,(b.on_hand-b.reserved) available,COALESCE(json_agg(json_build_object('url',i.blob_url) ORDER BY i.position) FILTER(WHERE i.id IS NOT NULL),'[]') images FROM retail_products p JOIN retail_inventory_balances b ON b.product_id=p.id AND b.on_hand>b.reserved JOIN LATERAL(SELECT amount_minor FROM retail_price_history WHERE product_id=p.id AND active=true ORDER BY created_at DESC LIMIT 1) h ON true JOIN retail_product_images i ON i.product_id=p.id WHERE p.status='published' GROUP BY p.id,h.amount_minor,b.on_hand,b.reserved` as StorefrontProduct[]; } catch { return []; } }
export async function listStorefrontShippingZones(): Promise<StorefrontShippingZone[]> { try { const url=process.env.DATABASE_URL; if(!url)return[];const q:Sql=neon(url);const rows=await q`SELECT country,name_en,name_ar,shipping_minor,free_shipping_threshold_minor,tax_rate_bps FROM retail_shipping_zones WHERE active ORDER BY country`;return rows.map((row)=>({country:String(row.country).trim(),name:{en:String(row.name_en),ar:String(row.name_ar)},shippingMinor:Number(row.shipping_minor),freeShippingThresholdMinor:row.free_shipping_threshold_minor===null?null:Number(row.free_shipping_threshold_minor),taxRateBps:Number(row.tax_rate_bps)})); } catch{return[];} }
export async function quoteRetailCheckout(items:z.infer<typeof retailCartDto>,checkout:z.infer<typeof retailCheckoutDto>){const q=sql();const rows=await q`SELECT * FROM retail_quote_checkout(${JSON.stringify(items)}::jsonb,${JSON.stringify(checkout)}::jsonb)`;const row=rows[0];if(!row)throw new Error("quote_unavailable");return{currency:String(row.currency).trim(),subtotalMinor:Number(row.subtotal_minor),shippingMinor:Number(row.shipping_minor),taxMinor:Number(row.tax_minor),discountMinor:Number(row.discount_minor),totalMinor:Number(row.total_minor),shippingMethod:String(row.shipping_method),items:row.items_snapshot,shipping:row.shipping_snapshot,quoteHash:String(row.quote_hash)};}
export async function getStorefrontOrderByRequestId(requestId:string){const q=sql();const rows=await q`SELECT public_id,client_request_id,paypal_order_id,status,currency,subtotal_minor,shipping_minor,tax_minor,discount_minor,amount_minor,shipping_method,items_snapshot,checkout_shipping,checkout_email,fulfilment_status,carrier,tracking_number,created_at,captured_at FROM retail_orders WHERE client_request_id=${requestId}::uuid LIMIT 1`;const row=rows[0];if(!row)return null;return{...row,subtotal_minor:Number(row.subtotal_minor),shipping_minor:Number(row.shipping_minor),tax_minor:Number(row.tax_minor),discount_minor:Number(row.discount_minor),amount_minor:Number(row.amount_minor)};}

export async function listAdminProducts() { const q = sql(); return q`SELECT p.public_id,p.sku,p.slug,p.title_en,p.title_ar,p.description_en,p.description_ar,p.status,p.created_at,p.updated_at,h.amount_minor,COALESCE(i.image_count,0)::int image_count,COALESCE(i.images,'[]'::json) images FROM retail_products p LEFT JOIN LATERAL(SELECT amount_minor FROM retail_price_history WHERE product_id=p.id AND active ORDER BY created_at DESC LIMIT 1) h ON true LEFT JOIN LATERAL(SELECT count(*) image_count,json_agg(json_build_object('id',id,'url',blob_url,'alt_en',alt_en,'alt_ar',alt_ar,'position',position) ORDER BY position) images FROM retail_product_images WHERE product_id=p.id) i ON true ORDER BY p.created_at DESC`; }
export async function createAdminProduct(d: z.infer<typeof productDto>) {
  if (d.status === "published") throw new Error("product_requires_verified_image");
  const q = sql(); const rows = await q`WITH p AS (INSERT INTO retail_products(sku,slug,title_en,title_ar,description_en,description_ar,status) VALUES(${d.sku},${d.slug},${d.titleEn},${d.titleAr},${d.descriptionEn},${d.descriptionAr},${d.status}) RETURNING id,public_id), h AS (INSERT INTO retail_price_history(product_id,amount_minor,idempotency_key,changed_by) SELECT id,${d.amountMinor},${d.idempotencyKey}::uuid,'admin' FROM p), b AS (INSERT INTO retail_inventory_balances(product_id) SELECT id FROM p) SELECT public_id FROM p`;
  await audit("product.create", "product", String(rows[0]?.public_id ?? ""), { sku: d.sku, status: d.status }); return rows[0];
}
export async function updateAdminProduct(id: string, d: z.infer<typeof productUpdateDto>) {
  const q = sql(); const rows = await q`UPDATE retail_products p SET slug=COALESCE(${d.slug ?? null},slug),title_en=COALESCE(${d.titleEn ?? null},title_en),title_ar=COALESCE(${d.titleAr ?? null},title_ar),description_en=COALESCE(${d.descriptionEn ?? null},description_en),description_ar=COALESCE(${d.descriptionAr ?? null},description_ar),status=COALESCE(${d.status ?? null},status),updated_at=now() WHERE public_id=${id}::uuid AND (${d.status ?? null}::text IS DISTINCT FROM 'published' OR EXISTS(SELECT 1 FROM retail_product_images pi WHERE pi.product_id=p.id)) RETURNING public_id,status`;
  if (!rows[0]) throw new Error("product_not_found_or_missing_verified_image"); await audit("product.update", "product", id, d); return rows[0];
}
export async function archiveAdminProduct(id: string) { return updateAdminProduct(id, { status: "archived" }); }
export async function changeProductPrice(id: string, d: z.infer<typeof priceDto>) { const q = sql(); const rows = await q`SELECT retail_change_price(${id}::uuid,${d.amountMinor},${d.idempotencyKey}::uuid,${d.reason},'admin') AS changed`; await audit("product.price", "product", id, d); return rows[0]; }

export async function listInventory(productId?: string) { const q = sql(); return productId ? q`SELECT p.public_id,p.sku,p.title_en,b.on_hand,b.reserved,(b.on_hand-b.reserved) available,b.updated_at FROM retail_inventory_balances b JOIN retail_products p ON p.id=b.product_id WHERE p.public_id=${productId}::uuid` : q`SELECT p.public_id,p.sku,p.title_en,b.on_hand,b.reserved,(b.on_hand-b.reserved) available,b.updated_at FROM retail_inventory_balances b JOIN retail_products p ON p.id=b.product_id ORDER BY p.created_at DESC`; }
export async function listInventoryLedger(productId?: string) { const q = sql(); return productId ? q`SELECT l.*,p.sku FROM retail_inventory_ledger l JOIN retail_products p ON p.id=l.product_id WHERE p.public_id=${productId}::uuid ORDER BY l.created_at DESC LIMIT 250` : q`SELECT l.*,p.sku FROM retail_inventory_ledger l JOIN retail_products p ON p.id=l.product_id ORDER BY l.created_at DESC LIMIT 250`; }
export async function adjustInventory(d: z.infer<typeof inventoryAdjustmentDto>) { const q = sql(); const rows = await q`SELECT retail_adjust_inventory(p.id,${d.delta},${d.reason},${d.idempotencyKey}::uuid) AS adjusted FROM retail_products p WHERE p.public_id=${d.productId}::uuid`; if (!rows[0]) throw new Error("product_not_found"); await audit("inventory.adjust", "product", d.productId, d); }

export async function listAdminOrders(status?: string) { const q = sql(); return status ? q`SELECT o.*,s.customer_snapshot,s.shipping_snapshot FROM retail_orders o LEFT JOIN retail_order_snapshots s ON s.order_id=o.paypal_order_id WHERE o.status=${status} ORDER BY o.created_at DESC LIMIT 250` : q`SELECT o.*,s.customer_snapshot,s.shipping_snapshot FROM retail_orders o LEFT JOIN retail_order_snapshots s ON s.order_id=o.paypal_order_id ORDER BY o.created_at DESC LIMIT 250`; }
export async function getAdminOrder(id: number) { const q = sql(); const rows = await q`SELECT o.*,s.customer_snapshot,s.shipping_snapshot FROM retail_orders o LEFT JOIN retail_order_snapshots s ON s.order_id=o.paypal_order_id WHERE o.id=${id} LIMIT 1`; return rows[0]; }
export async function fulfilAdminOrder(d: z.infer<typeof fulfilmentDto>) { const q = sql(); await q`SELECT retail_fulfil_order(${d.orderId},${d.carrier},${d.tracking},${d.note},${d.idempotencyKey}::uuid)`; await audit("order.fulfil", "order", String(d.orderId), d); }
export async function cancelAdminOrder(orderId:number,d:z.infer<typeof cancellationDto>){const q=sql();await q`SELECT retail_cancel_order(${orderId},${d.reason},${d.idempotencyKey}::uuid)`;}
export async function prepareAdminRefund(orderId:number,d:z.infer<typeof refundDto>){const q=sql();const rows=await q`SELECT * FROM retail_prepare_refund(${orderId},${d.amountMinor},${d.reason},${d.idempotencyKey}::uuid)`;const row=rows[0];if(!row)throw new Error("refund_unavailable");return{captureId:String(row.capture_id),currency:String(row.currency).trim(),amountMinor:Number(row.amount_minor),status:String(row.status),paypalRefundId:row.paypal_refund_id?String(row.paypal_refund_id):null};}
export async function completeAdminRefund(idempotencyKey:string,paypalRefundId:string){const q=sql();await q`SELECT retail_complete_refund(${idempotencyKey}::uuid,${paypalRefundId})`;}
export async function failAdminRefund(idempotencyKey:string,error:string){const q=sql();await q`SELECT retail_fail_refund(${idempotencyKey}::uuid,${error})`;}

export async function listShippingZones(){const q=sql();return q`SELECT country,name_en,name_ar,shipping_minor,free_shipping_threshold_minor,tax_rate_bps,active,updated_at FROM retail_shipping_zones ORDER BY country`;}
export async function upsertShippingZone(d:z.infer<typeof shippingZoneDto>){const q=sql();const rows=await q`INSERT INTO retail_shipping_zones(country,name_en,name_ar,shipping_minor,free_shipping_threshold_minor,tax_rate_bps,active) VALUES(${d.country},${d.nameEn},${d.nameAr},${d.shippingMinor},${d.freeShippingThresholdMinor},${d.taxRateBps},${d.active}) ON CONFLICT(country) DO UPDATE SET name_en=EXCLUDED.name_en,name_ar=EXCLUDED.name_ar,shipping_minor=EXCLUDED.shipping_minor,free_shipping_threshold_minor=EXCLUDED.free_shipping_threshold_minor,tax_rate_bps=EXCLUDED.tax_rate_bps,active=EXCLUDED.active,updated_at=now() RETURNING *`;await audit("shipping_zone.upsert","shipping_zone",d.country,d);return rows[0];}
export async function disableShippingZone(country:string){const q=sql();const rows=await q`UPDATE retail_shipping_zones SET active=false,updated_at=now() WHERE country=${country} RETURNING country`;if(!rows[0])throw new Error("shipping_zone_not_found");await audit("shipping_zone.disable","shipping_zone",country,{});}

export async function listCustomers() { const q = sql(); return q`SELECT c.public_id,c.email,c.name,c.created_at,COALESCE(json_agg(json_build_object('id',a.id,'recipient',a.recipient,'line1',a.line1,'line2',a.line2,'city',a.city,'region',a.region,'postal_code',a.postal_code,'country',a.country,'phone',a.phone,'is_default',a.is_default,'archived_at',a.archived_at) ORDER BY a.created_at) FILTER(WHERE a.id IS NOT NULL),'[]') addresses FROM retail_customers c LEFT JOIN retail_addresses a ON a.customer_id=c.id GROUP BY c.id ORDER BY c.created_at DESC LIMIT 250`; }
export async function updateCustomer(id: string, d: z.infer<typeof customerUpdateDto>) { const q = sql(); const hasAddress=Boolean(d.addressId || d.recipient || d.line1 || d.city || d.country || d.isDefault !== undefined || d.archive !== undefined); await q`WITH customer_update AS (UPDATE retail_customers SET name=COALESCE(${d.name ?? null},name) WHERE public_id=${id}::uuid RETURNING id), address_update AS (SELECT retail_upsert_customer_address(${id}::uuid,${d.addressId ?? null}::uuid,${d.recipient ?? null},${d.line1 ?? null},${d.line2 ?? null},${d.city ?? null},${d.region ?? null},${d.postalCode ?? null},${d.country ?? null},${d.phone ?? null},${d.isDefault ?? null}::boolean,${d.archive ?? null}::boolean) WHERE ${hasAddress}), audit_row AS (INSERT INTO retail_admin_audit(action,entity_type,entity_id,detail) SELECT 'customer.update','customer',${id},${JSON.stringify(d)}::jsonb FROM customer_update RETURNING id) SELECT count(*) FROM audit_row`; }

export async function listLedgerEntries(status?: string) { const q = sql(); return status ? q`SELECT l.*,o.paypal_order_id FROM retail_payment_ledger l JOIN retail_orders o ON o.id=l.order_id WHERE l.reconciliation_status=${status} AND l.kind IN ('payment','fee','refund','reversal') ORDER BY l.created_at DESC LIMIT 500` : q`SELECT l.*,o.paypal_order_id FROM retail_payment_ledger l JOIN retail_orders o ON o.id=l.order_id WHERE l.kind IN ('payment','fee','refund','reversal') ORDER BY l.created_at DESC LIMIT 500`; }
export async function getLedgerPostingSummary() { const q = sql(); const rows = await q`SELECT * FROM retail_payment_posting_summary()`; return rows[0] ?? { gross_minor: 0, fee_minor: 0, refund_minor: 0, reversal_minor: 0, net_minor: 0 }; }
export async function updateReconciliation(id: string, d: z.infer<typeof reconciliationDto>) { const q = sql(); await q`SELECT retail_update_reconciliation(${id}::uuid,${d.status},${d.note},${d.idempotencyKey}::uuid)`; await audit("ledger.reconcile", "ledger", id, d); }

export async function attachRetailProductImage(productId: string, image: { url: string; key: string; mime: string; bytes: number; sha256: string; altEn: string; altAr: string }) {
  const q = sql();
  const rows = await q`SELECT retail_attach_product_image(${productId}::uuid,${image.url},${image.key},${image.mime},${image.bytes},${image.sha256},${image.altEn},${image.altAr}) AS id`;
  return rows[0];
}

export async function detachRetailProductImage(imageId: string) {
  const q = sql();
  const rows = await q`SELECT * FROM retail_detach_product_image(${imageId}::uuid)`;
  return rows[0] as { blob_url: string; blob_key: string } | undefined;
}

export async function listRetailBlobDeleteOutbox() {
  const q = sql();
  return q`SELECT id,blob_url,attempts FROM retail_blob_delete_outbox WHERE status IN ('pending','failed') ORDER BY created_at LIMIT 25`;
}

export async function queueRetailBlobDelete(blobUrl: string) {
  const q = sql();
  await q`INSERT INTO retail_blob_delete_outbox(blob_url) VALUES(${blobUrl}) ON CONFLICT(blob_url) DO NOTHING`;
}

export async function markRetailBlobDeleteOutbox(id: string, succeeded: boolean) {
  const q = sql();
  await q`UPDATE retail_blob_delete_outbox SET status=${succeeded ? "processed" : "failed"},attempts=attempts+1,processed_at=CASE WHEN ${succeeded} THEN now() ELSE processed_at END WHERE id=${id}::uuid`;
}
