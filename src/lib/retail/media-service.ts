import "server-only";

import { del, put } from "@vercel/blob";
import { z } from "zod";

import type { RetailAdminActor } from "./admin-auth";
import { assertRetailBlobUrl, getRetailBlobConfig } from "./blob";
import { attachRetailProductImage, detachRetailProductImage, findRetailProductImageByIdempotency, listRetailBlobDeleteOutbox, markRetailBlobDeleteOutbox, mediaDeleteDto, mediaReorderDto, queueRetailBlobDelete, reorderRetailProductMedia } from "./operations";

const uploadFields = z.object({ productId: z.string().uuid(), idempotencyKey: z.string().uuid(), altEn: z.string().trim().max(300).default(""), altAr: z.string().trim().max(300).default("") });
const knownAttachRejections = new Set(["product not found", "product image limit reached"]);

export const retailMediaPublicErrors = new Set(["invalid_request", "invalid_image", "media_result_unknown", "media_version_conflict", "image_set_mismatch", "duplicate_image", "idempotency conflict", "image is used by product PDP content", "product not found", "product image limit reached"]);

export function retailMediaError(error: unknown) {
  const message = error instanceof Error ? error.message : "invalid_request";
  return retailMediaPublicErrors.has(message) ? message : "invalid_request";
}

export function retailMediaStatus(error: unknown) {
  const message = error instanceof Error ? error.message : "invalid_request";
  if (message === "media_result_unknown") return 503;
  if (message === "media_version_conflict") return 409;
  if (message === "image_set_mismatch" || message === "duplicate_image") return 422;
  return 400;
}

export async function uploadRetailProductImage(request: Request, actor: RetailAdminActor) {
  const form = await request.formData();
  const input = uploadFields.parse({ productId: form.get("productId"), idempotencyKey: form.get("idempotencyKey"), altEn: form.get("altEn") ?? "", altAr: form.get("altAr") ?? "" });
  const file = form.get("file");
  if (!(file instanceof File)) throw new Error("invalid_image");
  // Keep the native image decoder outside catalogue reads, media capability
  // checks, deletes, and reorders. Vercel must only load sharp for an actual
  // upload request, never while importing a read-only Agent route.
  const { validateRetailImage } = await import("./upload-validation");
  const validated = await validateRetailImage(file);
  const blobConfig = getRetailBlobConfig();
  const key = `retail/products/${input.productId}/${input.idempotencyKey}-${validated.sha256}.${validated.extension}`;
  const requestIdentity = { key, mime: validated.mime, bytes: validated.bytes.length, sha256: validated.sha256, altEn: input.altEn, altAr: input.altAr, idempotencyKey: input.idempotencyKey };
  const existing = await findRetailProductImageByIdempotency(input.productId, requestIdentity);
  if (existing) return { image: { id: existing.id, url: existing.url }, replayed: true, created: false };
  let blob;
  try {
    blob = await put(key, Buffer.from(validated.bytes), { access: "public", contentType: validated.mime, addRandomSuffix: false, cacheControlMaxAge: 60 * 60 * 24 * 365, ...blobConfig.auth });
  } catch (error) {
    let replay;
    try { replay = await findRetailProductImageByIdempotency(input.productId, requestIdentity); }
    catch { throw new Error("media_result_unknown"); }
    if (replay) return { image: { id: replay.id, url: replay.url }, replayed: true, created: false };
    throw error;
  }
  try { assertRetailBlobUrl(blob.url, blobConfig.hostname); }
  catch (error) { await del(blob.url, blobConfig.auth); throw error; }
  try {
    const image = await attachRetailProductImage(input.productId, { url: blob.url, ...requestIdentity }, actor);
    return { image: { id: image?.id, url: image?.blob_url ?? blob.url }, replayed: image?.replayed === true, created: !image?.replayed };
  } catch (error) {
    let replay;
    try { replay = await findRetailProductImageByIdempotency(input.productId, requestIdentity); }
    catch { throw new Error("media_result_unknown"); }
    if (replay) return { image: { id: replay.id, url: replay.url }, replayed: true, created: false };
    if (!(error instanceof Error) || !knownAttachRejections.has(error.message)) throw new Error("media_result_unknown");
    await queueRetailBlobDelete(blob.url);
    const outbox = (await listRetailBlobDeleteOutbox()).find((row) => row.blob_url === blob.url);
    try { assertRetailBlobUrl(blob.url, blobConfig.hostname); await del(blob.url, blobConfig.auth); if (outbox) await markRetailBlobDeleteOutbox(String(outbox.id), true); }
    catch { if (outbox) await markRetailBlobDeleteOutbox(String(outbox.id), false); }
    throw error;
  }
}

export async function deleteRetailProductImage(body: unknown, actor: RetailAdminActor) {
  const input = mediaDeleteDto.parse(body);
  const removed = await detachRetailProductImage(input, actor);
  if (!removed || !removed.deleted || !removed.blob_url) return { deleted: false, replayed: removed?.replayed === true, removedReferences: false };
  const blobConfig = getRetailBlobConfig();
  const outbox = (await listRetailBlobDeleteOutbox()).find((row) => row.blob_url === removed.blob_url);
  try { assertRetailBlobUrl(removed.blob_url, blobConfig.hostname); await del(removed.blob_url, blobConfig.auth); if (outbox) await markRetailBlobDeleteOutbox(String(outbox.id), true); } catch {
    const row = (await listRetailBlobDeleteOutbox()).find((item) => item.blob_url === removed.blob_url);
    if (row) await markRetailBlobDeleteOutbox(String(row.id), false);
  }
  return { deleted: true, replayed: removed.replayed === true, removedReferences: removed.removed_references === true };
}

export async function reorderRetailProductImages(body: unknown, actor: RetailAdminActor) {
  const input = mediaReorderDto.parse(body);
  const result = await reorderRetailProductMedia(input, actor);
  return { mediaVersion: Number(result.media_version), imageIds: result.image_ids, replayed: result.replayed === true };
}
