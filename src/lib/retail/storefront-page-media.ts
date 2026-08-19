import "server-only";

import crypto from "node:crypto";
import { del, put } from "@vercel/blob";
import { z } from "zod";

import type { RetailAdminActor } from "./admin-auth";
import { assertRetailBlobUrl, getRetailBlobConfig } from "./blob";
import { guardedRetailSql } from "./database-identity";

export async function uploadStorefrontHomepageImage(request: Request, actor: RetailAdminActor) {
  const form = await request.formData();
  const idempotencyKey = z.string().uuid().parse(form.get("idempotencyKey"));
  const file = form.get("file");
  if (!(file instanceof File)) throw new Error("invalid_image");

  // Keep the native image runtime out of the public homepage read path. This
  // module is only loaded by the authenticated media upload route.
  const { validateRetailImage } = await import("./upload-validation");
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
