import "server-only";

import crypto from "node:crypto";
import type { NeonQueryFunctionInTransaction } from "@neondatabase/serverless";
import { z } from "zod";

import type { RetailAdminActor } from "./admin-auth";
import { guardedRetailSql } from "./database-identity";

const uuid = z.string().uuid();
const text = z.string().trim().min(1).max(240);
const optionalText = z.string().trim().max(4_000).optional();
const nullablePositiveInt = z.number().int().positive().max(2_000_000_000).nullable().optional();
const logisticsFields = {
  shippingWeightGrams: nullablePositiveInt,
  packageLengthMm: nullablePositiveInt,
  packageWidthMm: nullablePositiveInt,
  packageHeightMm: nullablePositiveInt,
  customsDescriptionEn: z.string().trim().max(240).nullable().optional(),
  hsCode: z.string().trim().regex(/^[0-9]{4,12}$/).nullable().optional(),
  originCountry: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/).nullable().optional(),
  dangerousGoods: z.boolean().optional(),
};
const localizedOptions = z.object({
  en: z.record(z.string().min(1).max(80), z.string().trim().min(1).max(160)).default({}),
  ar: z.record(z.string().min(1).max(80), z.string().trim().min(1).max(160)).default({}),
  zh: z.record(z.string().min(1).max(80), z.string().trim().min(1).max(160)).default({}),
}).strict();

export const variantCreateDto = z.object({
  productId: uuid,
  styleId: uuid.optional(),
  sku: z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/),
  titleEn: text,
  titleAr: text,
  titleZh: text,
  optionValues: localizedOptions,
  amountMinor: z.number().int().positive().max(900_000_000_000_000),
  onHand: z.number().int().min(0).max(900_000_000_000_000),
  ...logisticsFields,
  idempotencyKey: uuid,
});
export const variantUpdateDto = z.object({
  styleId: uuid.optional(),
  sku: z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/).optional(),
  titleEn: optionalText,
  titleAr: optionalText,
  titleZh: optionalText,
  optionValues: localizedOptions.optional(),
  status: z.enum(["active", "archived"]).optional(),
  amountMinor: z.number().int().positive().max(900_000_000_000_000).optional(),
  onHand: z.number().int().min(0).max(900_000_000_000_000).optional(),
  ...logisticsFields,
  idempotencyKey: uuid,
}).refine((value) => Object.keys(value).some((key) => key !== "idempotencyKey"), "empty_update");

export const styleCreateDto = z.object({
  productId: uuid,
  code: z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/),
  titleEn: text,
  titleAr: z.string().trim().min(1).max(240).optional(),
  titleZh: z.string().trim().min(1).max(240).optional(),
  optionValues: localizedOptions.default({ en: {}, ar: {}, zh: {} }),
  primaryImageId: uuid.nullable().optional(),
  status: z.enum(["active", "archived"]).default("active"),
  position: z.number().int().min(0).max(32_767).default(0),
  idempotencyKey: uuid,
});
export const styleUpdateDto = z.object({
  code: z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/).optional(),
  titleEn: optionalText,
  titleAr: optionalText,
  titleZh: optionalText,
  optionValues: localizedOptions.optional(),
  primaryImageId: uuid.nullable().optional(),
  status: z.enum(["active", "archived"]).optional(),
  position: z.number().int().min(0).max(32_767).optional(),
  idempotencyKey: uuid,
}).refine((value) => Object.keys(value).some((key) => key !== "idempotencyKey"), "empty_update");
export const styleDeleteDto = z.object({ idempotencyKey: uuid }).strict();

const promotionScope = z.object({
  all: z.boolean().optional(),
  variantSkus: z.array(z.string().trim().min(1).max(100)).max(500).optional(),
}).strict().superRefine((scope, ctx) => {
  if (!scope.all && !(scope.variantSkus?.length)) ctx.addIssue({ code: "custom", message: "promotion scope required" });
});
const promotionFields = z.object({
  code: z.string().trim().toUpperCase().min(3).max(64).regex(/^[A-Z0-9_-]+$/),
  kind: z.enum(["percent", "fixed", "free_shipping"]),
  amount: z.number().int().min(0).max(900_000_000_000_000),
  startsAt: z.string().datetime({ offset: true }).nullable().optional(),
  endsAt: z.string().datetime({ offset: true }).nullable().optional(),
  minimumSubtotalMinor: z.number().int().min(0).max(900_000_000_000_000).default(0),
  scope: promotionScope,
  maxRedemptions: z.number().int().positive().max(10_000_000).nullable().optional(),
  maxPerCustomer: z.number().int().positive().max(10_000_000).nullable().optional(),
  automatic: z.boolean().optional(),
  active: z.boolean().default(true),
});
function validatePromotion(value: Partial<z.infer<typeof promotionFields>>, ctx: z.RefinementCtx) {
  if (value.kind === "percent" && value.amount !== undefined && (value.amount < 1 || value.amount > 10_000)) ctx.addIssue({ code: "custom", message: "invalid percent amount" });
  if (value.kind === "fixed" && value.amount !== undefined && value.amount <= 0) ctx.addIssue({ code: "custom", message: "invalid fixed amount" });
  if (value.kind === "free_shipping" && value.amount !== undefined && value.amount !== 0) ctx.addIssue({ code: "custom", message: "free shipping amount must be zero" });
  if (value.startsAt && value.endsAt && new Date(value.endsAt) <= new Date(value.startsAt)) ctx.addIssue({ code: "custom", message: "end must be after start" });
}
export const promotionCreateDto = promotionFields.extend({ idempotencyKey: uuid }).superRefine(validatePromotion);
export const promotionUpdateDto = promotionFields.partial().extend({ idempotencyKey: uuid }).superRefine((value, ctx) => {
  if (!Object.keys(value).some((key) => key !== "idempotencyKey")) ctx.addIssue({ code: "custom", message: "empty_update" });
  validatePromotion(value, ctx);
});

type StoredResponse = { publicId?: string; id?: string; replayed?: boolean };

function payload(value: unknown) { return JSON.stringify(value); }
export function canonicalPayload(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => canonicalPayload(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalPayload(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}
function actorAudit(sql: RetailTransactionSql, actor: RetailAdminActor, action: string, entityType: string, entityId: string, key: string, detail: unknown) {
  return sql`INSERT INTO retail_admin_audit(action,entity_type,entity_id,detail,idempotency_key,actor_id,actor_name,actor_role,legacy_actor,actor_attributed)
    VALUES(${action},${entityType},${entityId},${payload(detail)}::jsonb,${key}::uuid,${actor.id},${actor.name},${actor.role},${actor.legacy},true)`;
}

async function replay(operation: string, request: unknown, key: string, actor: RetailAdminActor): Promise<StoredResponse | undefined> {
  const sql = guardedRetailSql();
  const rows = await sql`SELECT i.operation,i.request_payload,i.response_payload,a.actor_id,a.actor_name,a.actor_role,a.legacy_actor
    FROM retail_admin_idempotency i LEFT JOIN retail_admin_audit a ON a.idempotency_key=i.idempotency_key
    WHERE i.idempotency_key=${key}::uuid LIMIT 1`;
  const row = rows[0];
  if (!row) return undefined;
  // PostgreSQL jsonb canonicalizes object key order, while JavaScript preserves
  // insertion order. Compare canonical structures so an exact retry replays
  // instead of being mistaken for a conflicting payload.
  if (row.operation !== operation || canonicalPayload(row.request_payload) !== canonicalPayload(request)) throw new Error("idempotency_conflict");
  if (row.actor_id !== actor.id || row.actor_name !== actor.name || row.actor_role !== actor.role || row.legacy_actor !== actor.legacy) throw new Error("idempotency_actor_conflict");
  return { ...(row.response_payload as StoredResponse), replayed: true };
}

type RetailTransactionSql = NeonQueryFunctionInTransaction<false, false>;
type MutationQueries = (tx: RetailTransactionSql) => ReturnType<RetailTransactionSql>[];

async function store(operation: string, request: unknown, key: string, response: StoredResponse, actor: RetailAdminActor, action: string, entityType: string, entityId: string, queries: MutationQueries) {
  const existing = await replay(operation, request, key, actor);
  if (existing) return existing;
  const sql = guardedRetailSql();
  const requestJson = payload(request); const responseJson = payload(response);
  try {
    await sql.transaction((tx) => [
      tx`INSERT INTO retail_admin_idempotency(idempotency_key,operation,request_payload,response_payload) VALUES(${key}::uuid,${operation},${requestJson}::jsonb,${responseJson}::jsonb)`,
      ...queries(tx),
      actorAudit(tx, actor, action, entityType, entityId, key, request),
    ]);
  } catch (error) {
    const concurrent = await replay(operation, request, key, actor);
    if (concurrent) return concurrent;
    throw error;
  }
  return response;
}

export async function listCatalogVariants(productId?: string) {
  const sql = guardedRetailSql();
  return productId
    ? sql`SELECT v.public_id,v.sku,v.title_en,v.title_ar,v.title_zh,v.option_values,v.status,v.shipping_weight_grams,v.package_length_mm,v.package_width_mm,v.package_height_mm,v.customs_description_en,v.hs_code,v.origin_country,v.dangerous_goods,v.created_at,v.updated_at,p.public_id AS product_public_id,p.sku AS product_sku,p.title_en AS product_title_en,s.public_id AS style_public_id,s.code AS style_code,s.title_en AS style_title_en,s.title_ar AS style_title_ar,s.title_zh AS style_title_zh,s.status AS style_status,s.position AS style_position,h.amount_minor,b.on_hand,b.reserved,(b.on_hand-b.reserved) AS available
      FROM retail_product_variants v JOIN retail_products p ON p.id=v.product_id JOIN retail_product_styles s ON s.id=v.style_id JOIN retail_variant_inventory_balances b ON b.variant_id=v.id LEFT JOIN LATERAL(SELECT amount_minor FROM retail_variant_price_history WHERE variant_id=v.id AND active ORDER BY created_at DESC LIMIT 1) h ON true WHERE p.public_id=${productId}::uuid ORDER BY s.position,s.created_at,v.created_at DESC`
    : sql`SELECT v.public_id,v.sku,v.title_en,v.title_ar,v.title_zh,v.option_values,v.status,v.shipping_weight_grams,v.package_length_mm,v.package_width_mm,v.package_height_mm,v.customs_description_en,v.hs_code,v.origin_country,v.dangerous_goods,v.created_at,v.updated_at,p.public_id AS product_public_id,p.sku AS product_sku,p.title_en AS product_title_en,s.public_id AS style_public_id,s.code AS style_code,s.title_en AS style_title_en,s.title_ar AS style_title_ar,s.title_zh AS style_title_zh,s.status AS style_status,s.position AS style_position,h.amount_minor,b.on_hand,b.reserved,(b.on_hand-b.reserved) AS available
      FROM retail_product_variants v JOIN retail_products p ON p.id=v.product_id JOIN retail_product_styles s ON s.id=v.style_id JOIN retail_variant_inventory_balances b ON b.variant_id=v.id LEFT JOIN LATERAL(SELECT amount_minor FROM retail_variant_price_history WHERE variant_id=v.id AND active ORDER BY created_at DESC LIMIT 1) h ON true ORDER BY p.created_at DESC,s.position,s.created_at,v.created_at DESC`;
}

export async function listCatalogStyles(productId?: string) {
  const sql = guardedRetailSql();
  return productId
    ? sql`SELECT s.public_id,s.code,s.title_en,s.title_ar,s.title_zh,s.option_values,s.option_values AS style_option_values,s.primary_image_id,image.blob_url AS style_image_url,s.status,s.position,s.created_at,s.updated_at,p.public_id AS product_public_id,p.sku AS product_sku,p.title_en AS product_title_en,COUNT(v.id)::int AS variant_count
      FROM retail_product_styles s JOIN retail_products p ON p.id=s.product_id LEFT JOIN retail_product_images image ON image.id=s.primary_image_id LEFT JOIN retail_product_variants v ON v.style_id=s.id
      WHERE p.public_id=${productId}::uuid GROUP BY s.id,image.blob_url,p.public_id,p.sku,p.title_en ORDER BY s.position,s.created_at`
    : sql`SELECT s.public_id,s.code,s.title_en,s.title_ar,s.title_zh,s.option_values,s.option_values AS style_option_values,s.primary_image_id,image.blob_url AS style_image_url,s.status,s.position,s.created_at,s.updated_at,p.public_id AS product_public_id,p.sku AS product_sku,p.title_en AS product_title_en,COUNT(v.id)::int AS variant_count
      FROM retail_product_styles s JOIN retail_products p ON p.id=s.product_id LEFT JOIN retail_product_images image ON image.id=s.primary_image_id LEFT JOIN retail_product_variants v ON v.style_id=s.id
      GROUP BY s.id,image.blob_url,p.public_id,p.sku,p.title_en,p.created_at ORDER BY p.created_at DESC,s.position,s.created_at`;
}

export async function createCatalogStyle(input: z.infer<typeof styleCreateDto>, actor: RetailAdminActor) {
  const { idempotencyKey, productId, ...data } = input; const publicId = crypto.randomUUID();
  const request = { productId, ...data };
  const prior = await replay("catalog.style.create", request, idempotencyKey, actor);
  if (prior) return prior;
  const sql = guardedRetailSql();
  const product = await sql`SELECT id FROM retail_products WHERE public_id=${productId}::uuid LIMIT 1`;
  if (!product[0]) throw new Error("product_not_found");
  if (data.primaryImageId) {
    const image = await sql`SELECT id FROM retail_product_images WHERE id=${data.primaryImageId}::uuid AND product_id=${product[0].id} LIMIT 1`;
    if (!image[0]) throw new Error("style_image_not_found");
  }
  return store("catalog.style.create", request, idempotencyKey, { publicId }, actor, "catalog.style.create", "product_style", publicId, (tx) => [
    tx`SELECT pg_advisory_xact_lock(hashtextextended('retail.catalog.inventory:' || id::text,0)) FROM retail_products WHERE public_id=${productId}::uuid`,
    tx`INSERT INTO retail_product_styles(public_id,product_id,code,title_en,title_ar,title_zh,option_values,primary_image_id,status,position)
      SELECT ${publicId}::uuid,id,${data.code},${data.titleEn},${data.titleAr ?? data.titleEn},${data.titleZh ?? data.titleEn},${payload(data.optionValues)}::jsonb,${data.primaryImageId ?? null}::uuid,${data.status},${data.position} FROM retail_products WHERE public_id=${productId}::uuid`,
  ]);
}

export async function updateCatalogStyle(publicId: string, input: z.infer<typeof styleUpdateDto>, actor: RetailAdminActor) {
  const { idempotencyKey, ...data } = input; const request = { publicId, ...data };
  const prior = await replay("catalog.style.update", request, idempotencyKey, actor);
  if (prior) return prior;
  const sql = guardedRetailSql();
  const existing = await sql`SELECT id,product_id FROM retail_product_styles WHERE public_id=${publicId}::uuid LIMIT 1`;
  if (!existing[0]) throw new Error("style_not_found");
  if (data.primaryImageId) {
    const image = await sql`SELECT id FROM retail_product_images WHERE id=${data.primaryImageId}::uuid AND product_id=${existing[0].product_id} LIMIT 1`;
    if (!image[0]) throw new Error("style_image_not_found");
  }
  return store("catalog.style.update", request, idempotencyKey, { publicId }, actor, "catalog.style.update", "product_style", publicId, (tx) => [
    tx`SELECT pg_advisory_xact_lock(hashtextextended('retail.catalog.inventory:' || product_id::text,0)) FROM retail_product_styles WHERE public_id=${publicId}::uuid`,
    tx`UPDATE retail_product_styles SET code=COALESCE(${data.code ?? null},code),title_en=COALESCE(${data.titleEn ?? null},title_en),title_ar=COALESCE(${data.titleAr ?? null},title_ar),title_zh=COALESCE(${data.titleZh ?? null},title_zh),option_values=COALESCE(${data.optionValues === undefined ? null : payload(data.optionValues)}::jsonb,option_values),primary_image_id=CASE WHEN ${data.primaryImageId !== undefined} THEN ${data.primaryImageId ?? null}::uuid ELSE primary_image_id END,status=COALESCE(${data.status ?? null},status),position=COALESCE(${data.position ?? null},position),updated_at=now() WHERE public_id=${publicId}::uuid`,
  ]);
}

export async function deleteCatalogStyle(publicId: string, input: z.infer<typeof styleDeleteDto>, actor: RetailAdminActor) {
  const { idempotencyKey } = input; const request = { publicId };
  const prior = await replay("catalog.style.delete", request, idempotencyKey, actor);
  if (prior) return prior;
  const sql = guardedRetailSql();
  const existing = await sql`SELECT s.id FROM retail_product_styles s WHERE s.public_id=${publicId}::uuid LIMIT 1`;
  if (!existing[0]) throw new Error("style_not_found");
  const variants = await sql`SELECT 1 FROM retail_product_variants WHERE style_id=${existing[0].id} LIMIT 1`;
  if (variants[0]) throw new Error("style_has_variants");
  return store("catalog.style.delete", request, idempotencyKey, { publicId }, actor, "catalog.style.delete", "product_style", publicId, (tx) => [
    tx`SELECT pg_advisory_xact_lock(hashtextextended('retail.catalog.inventory:' || s.product_id::text,0)) FROM retail_product_styles s WHERE s.public_id=${publicId}::uuid`,
    tx`DELETE FROM retail_product_styles WHERE public_id=${publicId}::uuid`,
  ]);
}

export async function createCatalogVariant(input: z.infer<typeof variantCreateDto>, actor: RetailAdminActor) {
  const { idempotencyKey, productId, ...data } = input; const publicId = crypto.randomUUID();
  const request = { productId, ...data };
  const prior = await replay("catalog.variant.create", request, idempotencyKey, actor);
  if (prior) return prior;
  const sql = guardedRetailSql();
  // Do not let a SELECT-based insert turn a missing product into a successful
  // idempotency receipt. The foreign-keyed write below is still authoritative.
  const product = await sql`SELECT id FROM retail_products WHERE public_id=${productId}::uuid LIMIT 1`;
  if (!product[0]) throw new Error("product_not_found");
  if (data.styleId) {
    const style = await sql`SELECT s.id FROM retail_product_styles s WHERE s.public_id=${data.styleId}::uuid AND s.product_id=${product[0].id} LIMIT 1`;
    if (!style[0]) throw new Error("style_not_found");
  }
  return store("catalog.variant.create", request, idempotencyKey, { publicId }, actor, "catalog.variant.create", "product_variant", publicId, (tx) => [
    // Serialize all catalogue mutations for one product before the first
    // variant write. The DB sync function uses the same transaction-scoped
    // gate, so two variant updates cannot each hold a different balance and
    // then wait on the other while recomputing the product mirror.
    tx`SELECT pg_advisory_xact_lock(hashtextextended('retail.catalog.inventory:' || id::text,0)) FROM retail_products WHERE public_id=${productId}::uuid`,
    tx`INSERT INTO retail_product_variants(public_id,product_id,style_id,sku,title_en,title_ar,title_zh,option_values,status,shipping_weight_grams,package_length_mm,package_width_mm,package_height_mm,customs_description_en,hs_code,origin_country,dangerous_goods)
      SELECT ${publicId}::uuid,p.id,COALESCE((SELECT s.id FROM retail_product_styles s WHERE s.public_id=${data.styleId ?? null}::uuid AND s.product_id=p.id),(SELECT s.id FROM retail_product_styles s WHERE s.product_id=p.id ORDER BY s.position,s.created_at LIMIT 1)),${data.sku},${data.titleEn},${data.titleAr},${data.titleZh},${payload(data.optionValues)}::jsonb,'active',${data.shippingWeightGrams ?? null},${data.packageLengthMm ?? null},${data.packageWidthMm ?? null},${data.packageHeightMm ?? null},${data.customsDescriptionEn ?? null},${data.hsCode ?? null},${data.originCountry ?? null},${data.dangerousGoods ?? false} FROM retail_products p WHERE p.public_id=${productId}::uuid`,
    tx`INSERT INTO retail_variant_price_history(variant_id,amount_minor,idempotency_key,changed_by)
      SELECT id,${data.amountMinor},${crypto.randomUUID()}::uuid,${actor.id} FROM retail_product_variants WHERE public_id=${publicId}::uuid`,
    tx`INSERT INTO retail_variant_inventory_balances(variant_id,on_hand,reserved)
      SELECT id,${data.onHand},0 FROM retail_product_variants WHERE public_id=${publicId}::uuid`,
    // V3 checks the product balance only as a compatibility mirror.  Keep it
    // derived from every variant in this same database transaction.
    tx`SELECT retail_sync_product_inventory_from_variants((SELECT product_id FROM retail_product_variants WHERE public_id=${publicId}::uuid))`,
  ]);
}

export async function updateCatalogVariant(publicId: string, input: z.infer<typeof variantUpdateDto>, actor: RetailAdminActor) {
  const { idempotencyKey, ...data } = input; const request = { publicId, ...data };
  const prior = await replay("catalog.variant.update", request, idempotencyKey, actor);
  if (prior) return prior;
  const sql = guardedRetailSql();
  const existing = await sql`SELECT v.id,v.product_id,b.reserved FROM retail_product_variants v JOIN retail_variant_inventory_balances b ON b.variant_id=v.id WHERE v.public_id=${publicId}::uuid LIMIT 1`;
  if (!existing[0]) throw new Error("variant_not_found");
  if (data.styleId) {
    const style = await sql`SELECT id FROM retail_product_styles WHERE public_id=${data.styleId}::uuid AND product_id=${existing[0].product_id} LIMIT 1`;
    if (!style[0]) throw new Error("style_not_found");
  }
  return store("catalog.variant.update", request, idempotencyKey, { publicId }, actor, "catalog.variant.update", "product_variant", publicId, (tx) => {
    const updates = [
      tx`SELECT pg_advisory_xact_lock(hashtextextended('retail.catalog.inventory:' || product_id::text,0)) FROM retail_product_variants WHERE public_id=${publicId}::uuid`,
    ];
    // Identity columns are protected by a database trigger for the default
    // variant. Do not mention them in an UPDATE statement unless the caller
    // explicitly requested an identity change; PostgreSQL UPDATE OF triggers
    // fire based on the statement's column list even when values are unchanged.
    if (data.styleId !== undefined || data.sku !== undefined) {
      updates.push(tx`UPDATE retail_product_variants SET style_id=COALESCE((SELECT id FROM retail_product_styles WHERE public_id=${data.styleId ?? null}::uuid),style_id),sku=COALESCE(${data.sku ?? null},sku),updated_at=now() WHERE public_id=${publicId}::uuid`);
    }
    if (data.titleEn !== undefined || data.titleAr !== undefined || data.titleZh !== undefined || data.optionValues !== undefined || data.status !== undefined) {
      updates.push(tx`UPDATE retail_product_variants SET title_en=COALESCE(${data.titleEn ?? null},title_en),title_ar=COALESCE(${data.titleAr ?? null},title_ar),title_zh=COALESCE(${data.titleZh ?? null},title_zh),option_values=COALESCE(${data.optionValues === undefined ? null : payload(data.optionValues)}::jsonb,option_values),status=COALESCE(${data.status ?? null},status),updated_at=now() WHERE public_id=${publicId}::uuid`);
    }
    if (data.amountMinor !== undefined) updates.push(tx`UPDATE retail_variant_price_history SET active=false WHERE variant_id=(SELECT id FROM retail_product_variants WHERE public_id=${publicId}::uuid) AND active`);
    if (data.amountMinor !== undefined) updates.push(tx`INSERT INTO retail_variant_price_history(variant_id,amount_minor,idempotency_key,changed_by) SELECT id,${data.amountMinor},${crypto.randomUUID()}::uuid,${actor.id} FROM retail_product_variants WHERE public_id=${publicId}::uuid`);
    // The CHECK(reserved <= on_hand) is deliberately allowed to reject a stale
    // absolute-stock write; a silent WHERE predicate would falsely report it as
    // saved and could leave price and stock out of sync.
    if (data.amountMinor !== undefined) updates.push(tx`SELECT retail_sync_product_default_variant_price((SELECT id FROM retail_product_variants WHERE public_id=${publicId}::uuid),${actor.id})`);
    if (data.onHand !== undefined) {
      updates.push(tx`UPDATE retail_variant_inventory_balances SET on_hand=${data.onHand},updated_at=now() WHERE variant_id=(SELECT id FROM retail_product_variants WHERE public_id=${publicId}::uuid)`);
      updates.push(tx`SELECT retail_sync_product_inventory_from_variants((SELECT product_id FROM retail_product_variants WHERE public_id=${publicId}::uuid))`);
    }
    if ([data.shippingWeightGrams,data.packageLengthMm,data.packageWidthMm,data.packageHeightMm,data.customsDescriptionEn,data.hsCode,data.originCountry,data.dangerousGoods].some((value)=>value!==undefined)) {
      updates.push(tx`UPDATE retail_product_variants SET
        shipping_weight_grams=CASE WHEN ${data.shippingWeightGrams !== undefined} THEN ${data.shippingWeightGrams ?? null} ELSE shipping_weight_grams END,
        package_length_mm=CASE WHEN ${data.packageLengthMm !== undefined} THEN ${data.packageLengthMm ?? null} ELSE package_length_mm END,
        package_width_mm=CASE WHEN ${data.packageWidthMm !== undefined} THEN ${data.packageWidthMm ?? null} ELSE package_width_mm END,
        package_height_mm=CASE WHEN ${data.packageHeightMm !== undefined} THEN ${data.packageHeightMm ?? null} ELSE package_height_mm END,
        customs_description_en=CASE WHEN ${data.customsDescriptionEn !== undefined} THEN ${data.customsDescriptionEn ?? null} ELSE customs_description_en END,
        hs_code=CASE WHEN ${data.hsCode !== undefined} THEN ${data.hsCode ?? null} ELSE hs_code END,
        origin_country=CASE WHEN ${data.originCountry !== undefined} THEN ${data.originCountry ?? null} ELSE origin_country END,
        dangerous_goods=CASE WHEN ${data.dangerousGoods !== undefined} THEN ${data.dangerousGoods ?? false} ELSE dangerous_goods END,
        updated_at=now() WHERE public_id=${publicId}::uuid`);
    }
    return updates;
  });
}

export async function listPromotions() {
  const sql = guardedRetailSql();
  return sql`SELECT p.id,p.code,p.kind,p.amount,p.starts_at,p.ends_at,p.minimum_subtotal_minor,p.scope,p.max_redemptions,p.max_per_customer,p.automatic,p.active,p.created_at,p.updated_at,COALESCE(r.redemptions,0)::bigint AS redemptions FROM retail_promotions p LEFT JOIN LATERAL(SELECT count(*) AS redemptions FROM retail_promotion_redemptions WHERE promotion_id=p.id AND status IN ('reserved','committed')) r ON true ORDER BY p.created_at DESC`;
}

export async function createPromotion(input: z.infer<typeof promotionCreateDto>, actor: RetailAdminActor) {
  const { idempotencyKey, ...data } = input; const id = crypto.randomUUID(); const request = data;
  const prior = await replay("promotion.create", request, idempotencyKey, actor);
  if (prior) return prior;
  return store("promotion.create", request, idempotencyKey, { id }, actor, "promotion.create", "promotion", id, (tx) => [
    tx`INSERT INTO retail_promotions(id,code,kind,amount,starts_at,ends_at,minimum_subtotal_minor,scope,max_redemptions,max_per_customer,automatic,active)
      VALUES(${id}::uuid,${data.code},${data.kind},${data.amount},${data.startsAt ?? null}::timestamptz,${data.endsAt ?? null}::timestamptz,${data.minimumSubtotalMinor},${payload(data.scope)}::jsonb,${data.maxRedemptions ?? null},${data.maxPerCustomer ?? null},${data.automatic ?? false},${data.active})`,
  ]);
}

export async function updatePromotion(id: string, input: z.infer<typeof promotionUpdateDto>, actor: RetailAdminActor) {
  const { idempotencyKey, ...data } = input; const request = { id, ...data };
  const prior = await replay("promotion.update", request, idempotencyKey, actor);
  if (prior) return prior;
  const sql = guardedRetailSql();
  const existing = await sql`SELECT id FROM retail_promotions WHERE id=${id}::uuid LIMIT 1`;
  if (!existing[0]) throw new Error("promotion_not_found");
  return store("promotion.update", request, idempotencyKey, { id }, actor, "promotion.update", "promotion", id, (tx) => [
    tx`UPDATE retail_promotions SET code=COALESCE(${data.code ?? null},code),kind=COALESCE(${data.kind ?? null},kind),amount=COALESCE(${data.amount ?? null},amount),starts_at=CASE WHEN ${data.startsAt !== undefined} THEN ${data.startsAt ?? null}::timestamptz ELSE starts_at END,ends_at=CASE WHEN ${data.endsAt !== undefined} THEN ${data.endsAt ?? null}::timestamptz ELSE ends_at END,minimum_subtotal_minor=COALESCE(${data.minimumSubtotalMinor ?? null},minimum_subtotal_minor),scope=COALESCE(${data.scope === undefined ? null : payload(data.scope)}::jsonb,scope),max_redemptions=CASE WHEN ${data.maxRedemptions !== undefined} THEN ${data.maxRedemptions ?? null} ELSE max_redemptions END,max_per_customer=CASE WHEN ${data.maxPerCustomer !== undefined} THEN ${data.maxPerCustomer ?? null} ELSE max_per_customer END,automatic=COALESCE(${data.automatic ?? null},automatic),active=COALESCE(${data.active ?? null},active),updated_at=now() WHERE id=${id}::uuid`,
  ]);
}
