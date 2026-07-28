import "server-only";

import { z } from "zod";
import { guardedRetailSql, type RetailSql } from "./database-identity";
import { currentRetailAdminActor, type RetailAdminActor } from "./admin-auth";

// Pin both Neon options to false. `ReturnType<typeof neon>` leaves generic
// booleans unresolved and widens every query into an unusable union.
type Sql = RetailSql;
export type StorefrontProduct = { sku:string; title_en:string; title_ar:string; title_zh:string|null; description_en:string; description_ar:string; description_zh:string|null; amount_minor:number; available:number; images:Array<{url:string}> };
export type StorefrontShippingZone = { country:string; name:{en:string;ar:string;zh:string}; shippingMinor:number; freeShippingThresholdMinor:number|null; taxRateBps:number };

function sql(): Sql {
  return guardedRetailSql();
}
function mutationActor(): RetailAdminActor {
  const actor = currentRetailAdminActor();
  // A missing AsyncLocalStorage context must fail before the mutation.  It is
  // never acceptable to silently fall back to the legacy administrator.
  if (!actor) throw new Error("admin_actor_missing");
  return actor;
}

export const productDto = z.object({
  sku: z.string().trim().min(1).max(80), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  titleEn: z.string().trim().min(1).max(200), titleAr: z.string().trim().min(1).max(200),
  titleZh: z.string().trim().max(200).optional(),
  descriptionEn: z.string().trim().max(4000).default(""), descriptionAr: z.string().trim().max(4000).default(""),
  descriptionZh: z.string().trim().max(4000).optional(),
  status: z.enum(["draft", "published", "archived"]), amountMinor: z.number().int().positive(), onHand: z.number().int().nonnegative().default(0), idempotencyKey: z.string().uuid(),
});
export const productUpdateDto = productDto.omit({ sku: true, amountMinor: true, onHand: true, idempotencyKey: true }).partial().extend({
  status: z.enum(["draft", "published", "archived"]).optional(),
  idempotencyKey: z.string().uuid(),
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
  locale: z.enum(["en", "ar", "zh"]),
}).strict();
export const retailCartDto = z.array(z.object({ sku:z.string().trim().min(1).max(100), quantity:z.number().int().min(1).max(10) }).strict()).min(1).max(10);
export const shippingZoneDto = z.object({ country:z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/), nameEn:z.string().trim().min(1).max(100), nameAr:z.string().trim().min(1).max(100), nameZh:z.string().trim().max(100).optional(), shippingMinor:z.number().int().nonnegative(), freeShippingThresholdMinor:z.number().int().positive().nullable(), taxRateBps:z.number().int().min(0).max(10000), active:z.boolean(), idempotencyKey:z.string().uuid() }).strict();
export const shippingDisableDto = z.object({ country:z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/), idempotencyKey:z.string().uuid() }).strict();
export const cancellationDto = z.object({ reason:z.string().trim().min(1).max(500), idempotencyKey:z.string().uuid() }).strict();
export const refundDto = z.object({ amountMinor:z.number().int().positive(), reason:z.string().trim().min(1).max(255), idempotencyKey:z.string().uuid() }).strict();
export const mediaReorderDto = z.object({ productId:z.string().uuid(), imageIds:z.array(z.string().uuid()).min(1).max(8), expectedVersion:z.number().int().nonnegative(), idempotencyKey:z.string().uuid() }).strict();

export async function listStorefrontProducts(): Promise<StorefrontProduct[]> { try { const q=sql(); return await q`SELECT p.sku,p.title_en,p.title_ar,p.title_zh,p.description_en,p.description_ar,p.description_zh,h.amount_minor,(b.on_hand-b.reserved) available,COALESCE(json_agg(json_build_object('url',i.blob_url) ORDER BY i.position) FILTER(WHERE i.id IS NOT NULL),'[]') images FROM retail_products p JOIN retail_inventory_balances b ON b.product_id=p.id AND b.on_hand>b.reserved JOIN LATERAL(SELECT amount_minor FROM retail_price_history WHERE product_id=p.id AND active=true ORDER BY created_at DESC LIMIT 1) h ON true JOIN retail_product_images i ON i.product_id=p.id WHERE p.status='published' GROUP BY p.id,h.amount_minor,b.on_hand,b.reserved` as StorefrontProduct[]; } catch { return []; } }
export async function listStorefrontShippingZones(): Promise<StorefrontShippingZone[]> { try { const q=sql();const rows=await q`SELECT country,name_en,name_ar,name_zh,shipping_minor,free_shipping_threshold_minor,tax_rate_bps FROM retail_shipping_zones WHERE active ORDER BY country`;return rows.map((row)=>({country:String(row.country).trim(),name:{en:String(row.name_en),ar:String(row.name_ar),zh:row.name_zh ? String(row.name_zh) : String(row.name_en)},shippingMinor:Number(row.shipping_minor),freeShippingThresholdMinor:row.free_shipping_threshold_minor===null?null:Number(row.free_shipping_threshold_minor),taxRateBps:Number(row.tax_rate_bps)})); } catch{return[];} }
export async function quoteRetailCheckout(items:z.infer<typeof retailCartDto>,checkout:z.infer<typeof retailCheckoutDto>){const q=sql();const rows=await q`SELECT * FROM retail_quote_checkout(${JSON.stringify(items)}::jsonb,${JSON.stringify(checkout)}::jsonb)`;const row=rows[0];if(!row)throw new Error("quote_unavailable");return{currency:String(row.currency).trim(),subtotalMinor:Number(row.subtotal_minor),shippingMinor:Number(row.shipping_minor),taxMinor:Number(row.tax_minor),discountMinor:Number(row.discount_minor),totalMinor:Number(row.total_minor),shippingMethod:String(row.shipping_method),items:row.items_snapshot,shipping:row.shipping_snapshot,quoteHash:String(row.quote_hash)};}
export async function getStorefrontOrderByRequestId(requestId:string){const q=sql();const rows=await q`SELECT public_id,client_request_id,paypal_order_id,status,currency,subtotal_minor,shipping_minor,tax_minor,discount_minor,amount_minor,shipping_method,items_snapshot,checkout_shipping,checkout_email,fulfilment_status,carrier,tracking_number,created_at,captured_at FROM retail_orders WHERE client_request_id=${requestId}::uuid LIMIT 1`;const row=rows[0];if(!row)return null;return{...row,subtotal_minor:Number(row.subtotal_minor),shipping_minor:Number(row.shipping_minor),tax_minor:Number(row.tax_minor),discount_minor:Number(row.discount_minor),amount_minor:Number(row.amount_minor)};}

export async function listAdminProducts() { const q = sql(); return q`SELECT p.public_id,p.sku,p.slug,p.title_en,p.title_ar,p.title_zh,p.description_en,p.description_ar,p.description_zh,p.status,p.created_at,p.updated_at,h.amount_minor,COALESCE(i.image_count,0)::int image_count,COALESCE(i.images,'[]'::json) images FROM retail_products p LEFT JOIN LATERAL(SELECT amount_minor FROM retail_price_history WHERE product_id=p.id AND active ORDER BY created_at DESC LIMIT 1) h ON true LEFT JOIN LATERAL(SELECT count(*) image_count,json_agg(json_build_object('id',id,'url',blob_url,'alt_en',alt_en,'alt_ar',alt_ar,'position',position) ORDER BY position) images FROM retail_product_images WHERE product_id=p.id) i ON true ORDER BY p.created_at DESC`; }
export async function createAdminProduct(d: z.infer<typeof productDto>) {
  if (d.status === "published") throw new Error("product_requires_verified_image");
  const q = sql(); const actor = mutationActor();
  const rows = await q`SELECT * FROM retail_create_admin_product_variant_authority_as_actor(${d.sku},${d.slug},${d.titleEn},${d.titleAr},${d.titleZh || null},${d.descriptionEn},${d.descriptionAr},${d.descriptionZh || null},${d.status},${d.amountMinor},${d.onHand},${d.idempotencyKey}::uuid,${actor.id},${actor.name},${actor.role},${actor.legacy})`;
  if (!rows[0]) throw new Error("product_create_unavailable");
  return rows[0];
}
export async function updateAdminProduct(id: string, d: z.infer<typeof productUpdateDto>) {
  const q = sql(); const actor = mutationActor(); const rows = await q`SELECT * FROM retail_update_admin_product_as_actor(${id}::uuid,${d.slug ?? null}::text,${d.titleEn ?? null}::text,${d.titleAr ?? null}::text,${d.descriptionEn ?? null}::text,${d.descriptionAr ?? null}::text,${d.titleZh || null}::text,${d.descriptionZh || null}::text,${d.titleZh !== undefined},${d.descriptionZh !== undefined},${d.status ?? null}::text,${d.idempotencyKey}::uuid,${actor.id},${actor.name},${actor.role},${actor.legacy})`;
  if (!rows[0]) throw new Error("product_not_found_or_missing_verified_image"); return rows[0];
}
export async function archiveAdminProduct(id: string, idempotencyKey: string) { return updateAdminProduct(id, { status: "archived", idempotencyKey }); }
export async function changeProductPrice(id: string, d: z.infer<typeof priceDto>) { const q = sql(); const actor = mutationActor(); const rows = await q`SELECT retail_change_product_price_as_actor(${id}::uuid,${d.amountMinor},${d.idempotencyKey}::uuid,${d.reason},${actor.id},${actor.name},${actor.role},${actor.legacy}) AS changed`; return rows[0]; }

export async function listInventory(productId?: string) { const q = sql(); return productId ? q`SELECT p.public_id,p.sku,p.title_en,b.on_hand,b.reserved,(b.on_hand-b.reserved) available,b.updated_at FROM retail_inventory_balances b JOIN retail_products p ON p.id=b.product_id WHERE p.public_id=${productId}::uuid` : q`SELECT p.public_id,p.sku,p.title_en,b.on_hand,b.reserved,(b.on_hand-b.reserved) available,b.updated_at FROM retail_inventory_balances b JOIN retail_products p ON p.id=b.product_id ORDER BY p.created_at DESC`; }
export async function listInventoryLedger(productId?: string) { const q = sql(); return productId ? q`SELECT l.*,p.sku FROM retail_inventory_ledger l JOIN retail_products p ON p.id=l.product_id WHERE p.public_id=${productId}::uuid ORDER BY l.created_at DESC LIMIT 250` : q`SELECT l.*,p.sku FROM retail_inventory_ledger l JOIN retail_products p ON p.id=l.product_id ORDER BY l.created_at DESC LIMIT 250`; }
export async function adjustInventory(d: z.infer<typeof inventoryAdjustmentDto>) { const q = sql(); const actor = mutationActor(); const rows = await q`SELECT retail_adjust_inventory_as_actor(${d.productId}::uuid,${d.delta},${d.reason},${d.idempotencyKey}::uuid,${actor.id},${actor.name},${actor.role},${actor.legacy}) AS adjusted`; if (!rows[0]) throw new Error("product_not_found"); }

const redactedOrderSelect = `o.id,o.public_id,o.paypal_order_id,o.currency,o.subtotal_minor,o.shipping_minor,o.tax_minor,o.discount_minor,o.amount_minor,o.status,o.refunded_minor,o.fulfilment_status,o.carrier,o.tracking_number,o.shipping_method,o.created_at,o.updated_at,o.captured_at,o.items_snapshot,
  CASE WHEN o.checkout_email IS NULL THEN NULL ELSE left(o.checkout_email,1)||'***@'||split_part(o.checkout_email,'@',2) END AS checkout_email,
  jsonb_build_object('name',CASE WHEN s.customer_snapshot->>'name' IS NULL THEN NULL ELSE left(s.customer_snapshot->>'name',1)||'***' END,'email',CASE WHEN o.checkout_email IS NULL THEN NULL ELSE left(o.checkout_email,1)||'***@'||split_part(o.checkout_email,'@',2) END) AS customer_snapshot,
  jsonb_build_object('recipient',CASE WHEN COALESCE(s.shipping_snapshot,o.checkout_shipping)->>'recipient' IS NULL THEN NULL ELSE left(COALESCE(s.shipping_snapshot,o.checkout_shipping)->>'recipient',1)||'***' END,'city',COALESCE(s.shipping_snapshot,o.checkout_shipping)->>'city','region',COALESCE(s.shipping_snapshot,o.checkout_shipping)->>'region','country',COALESCE(s.shipping_snapshot,o.checkout_shipping)->>'country') AS shipping_snapshot`;
export async function listAdminOrders(status?: string) {
  const q = sql();
  return status
    ? q`SELECT ${q.unsafe(redactedOrderSelect)} FROM retail_orders o LEFT JOIN retail_order_snapshots s ON s.order_id=o.paypal_order_id WHERE o.status=${status} ORDER BY o.created_at DESC LIMIT 250`
    : q`SELECT ${q.unsafe(redactedOrderSelect)} FROM retail_orders o LEFT JOIN retail_order_snapshots s ON s.order_id=o.paypal_order_id ORDER BY o.created_at DESC LIMIT 250`;
}
export async function getAdminOrder(id: number) { const q = sql(); const rows = await q`SELECT ${q.unsafe(redactedOrderSelect)} FROM retail_orders o LEFT JOIN retail_order_snapshots s ON s.order_id=o.paypal_order_id WHERE o.id=${id} LIMIT 1`; return rows[0]; }
export async function getAdminOrderPii(id: number, actor: RetailAdminActor) {
  const q = sql();
  // Write the audit receipt before returning a single unmasked field. The
  // route has already enforced orders:pii; the DB repeats the role guard.
  await q`SELECT retail_record_admin_pii_view(${id},${actor.id},${actor.name},${actor.role},${actor.legacy})`;
  const rows = await q`SELECT checkout_shipping FROM retail_orders WHERE id=${id} LIMIT 1`;
  if (!rows[0]) throw new Error("order_not_found");
  return { shipping: rows[0].checkout_shipping };
}
export async function fulfilAdminOrder(d: z.infer<typeof fulfilmentDto>) { const q = sql(); const actor=mutationActor(); await q`SELECT retail_fulfil_order_as_actor(${d.orderId},${d.carrier},${d.tracking},${d.note},${d.idempotencyKey}::uuid,${actor.id},${actor.name},${actor.role},${actor.legacy})`; }
export async function cancelAdminOrder(orderId:number,d:z.infer<typeof cancellationDto>){const q=sql();const actor=mutationActor();await q`SELECT retail_cancel_order_as_actor(${orderId},${d.reason},${d.idempotencyKey}::uuid,${actor.id},${actor.name},${actor.role},${actor.legacy})`;}
export async function prepareAdminRefund(orderId:number,d:z.infer<typeof refundDto>){const q=sql();const actor=mutationActor();const rows=await q`SELECT * FROM retail_prepare_refund_as_actor(${orderId},${d.amountMinor},${d.reason},${d.idempotencyKey}::uuid,${actor.id},${actor.name},${actor.role},${actor.legacy})`;const row=rows[0];if(!row)throw new Error("refund_unavailable");return{captureId:String(row.capture_id),currency:String(row.currency).trim(),amountMinor:Number(row.amount_minor),status:String(row.status),paypalRefundId:row.paypal_refund_id?String(row.paypal_refund_id):null};}
export async function completeAdminRefund(idempotencyKey:string,paypalRefundId:string){const q=sql();await q`SELECT retail_complete_refund(${idempotencyKey}::uuid,${paypalRefundId})`;}
export async function failAdminRefund(idempotencyKey:string,error:string){const q=sql();await q`SELECT retail_fail_refund(${idempotencyKey}::uuid,${error})`;}

export async function listShippingZones(){const q=sql();return q`SELECT country,name_en,name_ar,name_zh,shipping_minor,free_shipping_threshold_minor,tax_rate_bps,active,updated_at FROM retail_shipping_zones ORDER BY country`;}
export async function upsertShippingZone(d:z.infer<typeof shippingZoneDto>){const q=sql();const actor=mutationActor();const rows=await q`SELECT * FROM retail_upsert_admin_shipping_zone_as_actor(${d.country},${d.nameEn},${d.nameAr},${d.nameZh || null},${d.nameZh !== undefined},${d.shippingMinor},${d.freeShippingThresholdMinor},${d.taxRateBps},${d.active},${d.idempotencyKey}::uuid,${actor.id},${actor.name},${actor.role},${actor.legacy})`;if(!rows[0])throw new Error("shipping_zone_unavailable");return rows[0];}
export async function disableShippingZone(d:z.infer<typeof shippingDisableDto>){const q=sql();const actor=mutationActor();const rows=await q`SELECT retail_disable_admin_shipping_zone_as_actor(${d.country},${d.idempotencyKey}::uuid,${actor.id},${actor.name},${actor.role},${actor.legacy}) AS disabled`;if(!rows[0]?.disabled)throw new Error("shipping_zone_not_found");}

const redactedCustomerSelect = `c.public_id,
  CASE WHEN c.email IS NULL THEN NULL ELSE left(c.email,1)||'***@'||split_part(c.email,'@',2) END AS email,
  CASE WHEN c.name IS NULL THEN NULL ELSE left(c.name,1)||'***' END AS name,
  c.created_at,
  COALESCE(json_agg(json_build_object('id',a.id,'city',a.city,'country',a.country,'is_default',a.is_default,'archived_at',a.archived_at) ORDER BY a.created_at) FILTER(WHERE a.id IS NOT NULL),'[]') addresses`;

export async function listCustomers() {
  const q = sql();
  return q`SELECT ${q.unsafe(redactedCustomerSelect)} FROM retail_customers c LEFT JOIN retail_addresses a ON a.customer_id=c.id GROUP BY c.id ORDER BY c.created_at DESC LIMIT 250`;
}

async function getRedactedCustomerReadback(id: string) {
  const q = sql();
  const rows = await q`SELECT ${q.unsafe(redactedCustomerSelect)} FROM retail_customers c LEFT JOIN retail_addresses a ON a.customer_id=c.id WHERE c.public_id=${id}::uuid GROUP BY c.id`;
  return rows[0];
}

export async function getAdminCustomerAddressBookPii(id: string, actor: RetailAdminActor) {
  const q = sql();
  // The database validates the role and commits the access receipt before the
  // unmasked address query is issued. Never fold this into the directory list.
  await q`SELECT retail_record_admin_customer_address_pii_view(${id}::uuid,${actor.id},${actor.name},${actor.role},${actor.legacy})`;
  const rows = await q`SELECT c.public_id,c.email,c.name,c.created_at,
    COALESCE(json_agg(json_build_object('id',a.id,'recipient',a.recipient,'line1',a.line1,'line2',a.line2,'city',a.city,'region',a.region,'postal_code',a.postal_code,'country',a.country,'phone',a.phone,'is_default',a.is_default,'archived_at',a.archived_at,'created_at',a.created_at,'updated_at',a.updated_at) ORDER BY a.created_at) FILTER(WHERE a.id IS NOT NULL),'[]') AS addresses
    FROM retail_customers c LEFT JOIN retail_addresses a ON a.customer_id=c.id WHERE c.public_id=${id}::uuid GROUP BY c.id`;
  if (!rows[0]) throw new Error("customer_not_found");
  return rows[0];
}

export async function updateCustomer(id: string, d: z.infer<typeof customerUpdateDto>) {
  const q = sql(); const actor=mutationActor();
  const hasAddress = Boolean(d.addressId || d.recipient || d.line1 || d.city || d.country || d.isDefault !== undefined || d.archive !== undefined);
  const rows = await q`SELECT * FROM retail_update_admin_customer_as_actor(${id}::uuid,${d.name ?? null}::text,${d.addressId ?? null}::uuid,${d.recipient ?? null}::text,${d.line1 ?? null}::text,${d.line2 ?? null}::text,${d.city ?? null}::text,${d.region ?? null}::text,${d.postalCode ?? null}::text,${d.country ?? null}::text,${d.phone ?? null}::text,${d.isDefault ?? null}::boolean,${d.archive ?? null}::boolean,${hasAddress},${d.idempotencyKey}::uuid,${actor.id},${actor.name},${actor.role},${actor.legacy})`;
  if (!rows[0]) throw new Error("customer_not_found");
  // This deliberately returns only the same redacted representation exposed by
  // the customer directory. Complete address readback remains its own audited
  // orders:pii operation.
  const customer = await getRedactedCustomerReadback(id);
  if (!customer) throw new Error("customer_readback_unavailable");
  return { customer, addressId: rows[0].address_id ? String(rows[0].address_id) : null, replayed: rows[0].replayed === true };
}

export async function listLedgerEntries(status?: string) { const q = sql(); return status ? q`SELECT l.*,o.paypal_order_id FROM retail_payment_ledger l JOIN retail_orders o ON o.id=l.order_id WHERE l.reconciliation_status=${status} AND l.kind IN ('payment','fee','refund','reversal') ORDER BY l.created_at DESC LIMIT 500` : q`SELECT l.*,o.paypal_order_id FROM retail_payment_ledger l JOIN retail_orders o ON o.id=l.order_id WHERE l.kind IN ('payment','fee','refund','reversal') ORDER BY l.created_at DESC LIMIT 500`; }
export async function listRetailAdminAudit(input: { limit?: number; offset?: number; action?: string; actor?: string; date?: string } = {}) {
  const q = sql();
  // `detail` intentionally stays server-only: older audit events can include
  // customer address edits. The audit UI/API gets attribution and metadata.
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);
  const offset = Math.max(input.offset ?? 0, 0);
  const action = input.action?.trim() || null;
  const actor = input.actor?.trim() || null;
  const date = input.date ?? null;
  return q`SELECT id,action,entity_type,entity_id,idempotency_key,actor_id,actor_name,actor_role,legacy_actor,created_at FROM retail_admin_audit WHERE (${action}::text IS NULL OR action ILIKE '%' || ${action} || '%') AND (${actor}::text IS NULL OR actor_id ILIKE '%' || ${actor} || '%' OR actor_name ILIKE '%' || ${actor} || '%') AND (${date}::date IS NULL OR created_at >= ${date}::date AND created_at < ${date}::date + interval '1 day') ORDER BY created_at DESC LIMIT ${limit + 1} OFFSET ${offset}`;
}
export async function getLedgerPostingSummary() { const q = sql(); const rows = await q`SELECT * FROM retail_payment_posting_summary()`; return rows[0] ?? { gross_minor: 0, fee_minor: 0, refund_minor: 0, reversal_minor: 0, net_minor: 0 }; }
export async function updateReconciliation(id: string, d: z.infer<typeof reconciliationDto>) { const q = sql(); const actor=mutationActor(); await q`SELECT retail_reconcile_with_actor(${id}::uuid,${d.status},${d.note},${d.idempotencyKey}::uuid,${actor.id},${actor.name},${actor.role},${actor.legacy})`; }

export async function attachRetailProductImage(productId: string, image: { url: string; key: string; mime: string; bytes: number; sha256: string; altEn: string; altAr: string; idempotencyKey: string }) {
  const q = sql(); const actor=mutationActor();
  const rows = await q`SELECT * FROM retail_attach_product_image_as_actor(${productId}::uuid,${image.url},${image.key},${image.mime},${image.bytes},${image.sha256},${image.altEn},${image.altAr},${image.idempotencyKey}::uuid,${actor.id},${actor.name},${actor.role},${actor.legacy})`;
  return rows[0];
}

export async function findRetailProductImageByIdempotency(productId: string, image: { key: string; mime: string; bytes: number; sha256: string; altEn: string; altAr: string; idempotencyKey: string }) {
  const q = sql();
  const payload = JSON.stringify({ productId, blobKey: image.key, mime: image.mime, bytes: image.bytes, sha256: image.sha256, altEn: image.altEn, altAr: image.altAr });
  const rows = await q`SELECT operation,response_payload,(request_payload=${payload}::jsonb) AS matches FROM retail_admin_idempotency WHERE idempotency_key=${image.idempotencyKey}::uuid LIMIT 1`;
  const row = rows[0];
  if (!row) return undefined;
  if (row.operation !== "product.image.attach" || row.matches !== true) throw new Error("idempotency conflict");
  const id = row.response_payload?.id;
  const url = row.response_payload?.url;
  if (!id || !url) throw new Error("media_result_unknown");
  return { id: String(id), url: String(url), replayed: true };
}

export async function detachRetailProductImage(imageId: string) {
  const q = sql(); const actor=mutationActor();
  const rows = await q`SELECT * FROM retail_detach_product_image_as_actor(${imageId}::uuid,${actor.id},${actor.name},${actor.role},${actor.legacy})`;
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

export async function reorderRetailProductMedia(d: z.infer<typeof mediaReorderDto>) {
  if (new Set(d.imageIds).size !== d.imageIds.length) throw new Error("duplicate_image");
  const q = sql(); const actor=mutationActor();
  const rows = await q`SELECT * FROM retail_reorder_product_media_as_actor(${d.productId}::uuid,${JSON.stringify(d.imageIds)}::jsonb,${d.expectedVersion},${d.idempotencyKey}::uuid,${actor.id},${actor.name},${actor.role},${actor.legacy})`;
  if (!rows[0]) throw new Error("media_reorder_unavailable");
  return rows[0];
}
