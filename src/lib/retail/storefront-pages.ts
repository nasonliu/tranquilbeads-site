import "server-only";

import { z } from "zod";

import type { RetailAdminActor } from "./admin-auth";
import { guardedRetailSql } from "./database-identity";
import { defaultHomepageConfig, homepageConfigSchema, type HomepageConfig } from "./homepage-config";

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
