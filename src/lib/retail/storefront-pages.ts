import "server-only";

import crypto from "node:crypto";
import { del, put } from "@vercel/blob";
import { z } from "zod";

import type { RetailAdminActor } from "./admin-auth";
import { assertRetailBlobUrl, getRetailBlobConfig } from "./blob";
import { guardedRetailSql } from "./database-identity";
import { defaultHomepageConfig, homepageConfigSchema, type HomepageConfig } from "./homepage-config";
import { validateRetailImage } from "./upload-validation";

export const homepageDraftDto = z.object({
  config: homepageConfigSchema,
  expectedVersion: z.number().int().min(0),
  idempotencyKey: z.string().uuid(),
}).strict();

export const homepagePublishDto = z.object({
  expectedVersion: z.number().int().positive(),
  idempotencyKey: z.string().uuid(),
}).strict();

export type StorefrontHomepageRecord = {
  draft: HomepageConfig;
  published: HomepageConfig;
  version: number;
  publishedVersion: number | null;
  updatedAt: string | null;
  publishedAt: string | null;
};

function parseConfig(value: unknown, fallback: HomepageConfig) {
  const result = homepageConfigSchema.safeParse(value);
  return result.success ? result.data : fallback;
}

export async function getStorefrontHomepageAdmin(): Promise<StorefrontHomepageRecord> {
  const rows = await guardedRetailSql()`SELECT draft_payload,published_payload,version,published_version,updated_at,published_at
    FROM retail_storefront_pages WHERE page_key='home' LIMIT 1`;
  const row = rows[0];
  if (!row) return { draft: defaultHomepageConfig, published: defaultHomepageConfig, version: 0, publishedVersion: null, updatedAt: null, publishedAt: null };
  return {
    draft: parseConfig(row.draft_payload, defaultHomepageConfig),
    published: parseConfig(row.published_payload, defaultHomepageConfig),
    version: Number(row.version),
    publishedVersion: row.published_version === null ? null : Number(row.published_version),
    updatedAt: row.updated_at ? String(row.updated_at) : null,
    publishedAt: row.published_at ? String(row.published_at) : null,
  };
}

export async function getPublishedStorefrontHomepage(): Promise<HomepageConfig> {
  try {
    const rows = await guardedRetailSql()`SELECT published_payload FROM retail_storefront_pages WHERE page_key='home' LIMIT 1`;
    return parseConfig(rows[0]?.published_payload, defaultHomepageConfig);
  } catch {
    return defaultHomepageConfig;
  }
}

export async function saveStorefrontHomepageDraft(input: z.infer<typeof homepageDraftDto>, actor: RetailAdminActor) {
  const { config, expectedVersion, idempotencyKey } = input;
  const rows = await guardedRetailSql()`SELECT retail_save_storefront_page_draft(
    'home',${JSON.stringify(config)}::jsonb,${expectedVersion},${idempotencyKey}::uuid,
    ${actor.id},${actor.name},${actor.role},${actor.legacy}
  ) AS version`;
  const version = Number(rows[0]?.version);
  const readback = await getStorefrontHomepageAdmin();
  if (!Number.isSafeInteger(version) || readback.version !== version || JSON.stringify(readback.draft) !== JSON.stringify(config)) {
    throw new Error("page_result_unknown");
  }
  return readback;
}

export async function publishStorefrontHomepage(input: z.infer<typeof homepagePublishDto>, actor: RetailAdminActor) {
  const rows = await guardedRetailSql()`SELECT retail_publish_storefront_page(
    'home',${input.expectedVersion},${input.idempotencyKey}::uuid,
    ${actor.id},${actor.name},${actor.role},${actor.legacy}
  ) AS published_version`;
  const publishedVersion = Number(rows[0]?.published_version);
  const readback = await getStorefrontHomepageAdmin();
  if (!Number.isSafeInteger(publishedVersion) || readback.publishedVersion !== publishedVersion || JSON.stringify(readback.published) !== JSON.stringify(readback.draft)) {
    throw new Error("page_result_unknown");
  }
  return readback;
}

export async function uploadStorefrontHomepageImage(request: Request, actor: RetailAdminActor) {
  const form = await request.formData();
  const idempotencyKey = z.string().uuid().parse(form.get("idempotencyKey"));
  const file = form.get("file");
  if (!(file instanceof File)) throw new Error("invalid_image");
  const image = await validateRetailImage(file);
  const sql = guardedRetailSql();
  const existing = await sql`SELECT id,blob_url FROM retail_storefront_page_assets WHERE page_key='home' AND sha256=${image.sha256} LIMIT 1`;
  if (existing[0]) return { id: String(existing[0].id), url: String(existing[0].blob_url), replayed: true };

  const blobConfig = getRetailBlobConfig();
  const id = crypto.randomUUID();
  const key = `retail/pages/home/${idempotencyKey}-${image.sha256}.${image.extension}`;
  const blob = await put(key, Buffer.from(image.bytes), { access: "public", contentType: image.mime, addRandomSuffix: false, cacheControlMaxAge: 60 * 60 * 24 * 365, ...blobConfig.auth });
  try {
    assertRetailBlobUrl(blob.url, blobConfig.hostname);
    await sql.transaction((tx) => [
      tx`INSERT INTO retail_storefront_page_assets(id,page_key,blob_url,mime,bytes,sha256,created_by)
        VALUES(${id}::uuid,'home',${blob.url},${image.mime},${image.bytes.length},${image.sha256},${actor.id})`,
      tx`INSERT INTO retail_admin_idempotency(idempotency_key,operation,request_payload,response_payload)
        VALUES(${idempotencyKey}::uuid,'storefront.page.asset.upload',${JSON.stringify({ pageKey: "home", sha256: image.sha256 })}::jsonb,${JSON.stringify({ id, url: blob.url })}::jsonb)`,
      tx`INSERT INTO retail_admin_audit(action,entity_type,entity_id,detail,idempotency_key,actor_id,actor_name,actor_role,legacy_actor,actor_attributed)
        VALUES('storefront.page.asset.upload','storefront_page_asset',${id},${JSON.stringify({ pageKey: "home", sha256: image.sha256, bytes: image.bytes.length })}::jsonb,${idempotencyKey}::uuid,${actor.id},${actor.name},${actor.role},${actor.legacy},true)`,
    ]);
  } catch (error) {
    await del(blob.url, blobConfig.auth).catch(() => undefined);
    const replay = await sql`SELECT id,blob_url FROM retail_storefront_page_assets WHERE page_key='home' AND sha256=${image.sha256} LIMIT 1`;
    if (replay[0]) return { id: String(replay[0].id), url: String(replay[0].blob_url), replayed: true };
    throw error;
  }
  return { id, url: blob.url, replayed: false };
}
