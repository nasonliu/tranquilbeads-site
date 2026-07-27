import { del, put } from "@vercel/blob";
import { z } from "zod";

import { assertSameOrigin, requireRetailAdmin } from "@/src/lib/retail/admin-auth";
import { assertRetailBlobUrl, getRetailBlobConfig } from "@/src/lib/retail/blob";
import { attachRetailProductImage, detachRetailProductImage, findRetailProductImageByIdempotency, listRetailBlobDeleteOutbox, markRetailBlobDeleteOutbox, queueRetailBlobDelete } from "@/src/lib/retail/operations";
import { validateRetailImage } from "@/src/lib/retail/upload-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fields = z.object({ productId: z.string().uuid(), idempotencyKey: z.string().uuid(), altEn: z.string().trim().max(300).default(""), altAr: z.string().trim().max(300).default("") });
const fail = (error: unknown, status = 400) => Response.json({ ok: false, error: error instanceof Error ? error.message : "invalid_request" }, { status, headers: { "cache-control": "no-store" } });
const isKnownAttachRejection = (error: unknown) => error instanceof Error && ["product not found", "product image limit reached"].includes(error.message);

export async function POST(request: Request) {
  try {
    await requireRetailAdmin();
    await assertSameOrigin();
    const form = await request.formData();
    const input = fields.parse({ productId: form.get("productId"), idempotencyKey: form.get("idempotencyKey"), altEn: form.get("altEn") ?? "", altAr: form.get("altAr") ?? "" });
    const file = form.get("file");
    if (!(file instanceof File)) throw new Error("invalid_image");
    const validated = await validateRetailImage(file);
    const blobConfig = getRetailBlobConfig();
    // The pathname is stable for an identical request and content. A changed
    // file under a reused request key gets a distinct object and is rejected
    // by the DB payload comparison instead of overwriting the first image.
    const key = `retail/products/${input.productId}/${input.idempotencyKey}-${validated.sha256}.${validated.extension}`;
    const requestIdentity = { key, mime: validated.mime, bytes: validated.bytes.length, sha256: validated.sha256, altEn: input.altEn, altAr: input.altAr, idempotencyKey: input.idempotencyKey };
    let existing;
    try { existing = await findRetailProductImageByIdempotency(input.productId, requestIdentity); }
    catch (error) { if (error instanceof Error && error.message === "media_result_unknown") return fail(error, 503); throw error; }
    if (existing) return Response.json({ ok: true, image: { id: existing.id, url: existing.url }, replayed: true }, { headers: { "cache-control": "no-store" } });
    let blob;
    try {
      blob = await put(key, Buffer.from(validated.bytes), { access: "public", contentType: validated.mime, addRandomSuffix: false, cacheControlMaxAge: 60 * 60 * 24 * 365, ...blobConfig.auth });
    } catch (error) {
      // A lost response can leave the object and DB row committed. Re-read the
      // DB idempotency record before treating the Blob conflict as a failure.
      let replay;
      try { replay = await findRetailProductImageByIdempotency(input.productId, requestIdentity); }
      catch { return fail(new Error("media_result_unknown"), 503); }
      if (replay) return Response.json({ ok: true, image: { id: replay.id, url: replay.url }, replayed: true }, { headers: { "cache-control": "no-store" } });
      throw error;
    }
    try { assertRetailBlobUrl(blob.url, blobConfig.hostname); }
    catch (error) { await del(blob.url, blobConfig.auth); throw error; }
    try {
      const image = await attachRetailProductImage(input.productId, { url: blob.url, ...requestIdentity });
      return Response.json({ ok: true, image: { id: image?.id, url: image?.blob_url ?? blob.url }, replayed: image?.replayed === true }, { status: image?.replayed ? 200 : 201, headers: { "cache-control": "no-store" } });
    } catch (error) {
      // A database call can commit then lose its HTTP response. Read the same
      // key before any cleanup; a failed read is intentionally non-destructive.
      let replay;
      try { replay = await findRetailProductImageByIdempotency(input.productId, requestIdentity); }
      catch { return fail(new Error("media_result_unknown"), 503); }
      if (replay) return Response.json({ ok: true, image: { id: replay.id, url: replay.url }, replayed: true }, { headers: { "cache-control": "no-store" } });
      if (!isKnownAttachRejection(error)) return fail(new Error("media_result_unknown"), 503);
      // Only an explicit DB business rejection proves metadata was not
      // committed, so only this path may queue/delete the public Blob.
      await queueRetailBlobDelete(blob.url);
      const outbox = (await listRetailBlobDeleteOutbox()).find((row) => row.blob_url === blob.url);
      try { assertRetailBlobUrl(blob.url, blobConfig.hostname); await del(blob.url, blobConfig.auth); if (outbox) await markRetailBlobDeleteOutbox(String(outbox.id), true); }
      catch { if (outbox) await markRetailBlobDeleteOutbox(String(outbox.id), false); }
      throw error;
    }
  } catch (error) { return fail(error, error instanceof Error && error.message === "unauthorized" ? 401 : 400); }
}

export async function DELETE(request: Request) {
  try {
    await requireRetailAdmin();
    await assertSameOrigin();
    const { imageId } = z.object({ imageId: z.string().uuid() }).parse(await request.json());
    const removed = await detachRetailProductImage(imageId);
    if (!removed) return Response.json({ ok: true, deleted: false }, { headers: { "cache-control": "no-store" } });
    const blobConfig = getRetailBlobConfig();
    const outbox = (await listRetailBlobDeleteOutbox()).find((row) => row.blob_url === removed.blob_url);
    try { assertRetailBlobUrl(removed.blob_url, blobConfig.hostname); await del(removed.blob_url, blobConfig.auth); if (outbox) await markRetailBlobDeleteOutbox(String(outbox.id), true); } catch {
      // The DB detach and outbox insert are already atomic. A worker/retry may
      // safely delete this immutable URL later.
      const row = (await listRetailBlobDeleteOutbox()).find((item) => item.blob_url === removed.blob_url);
      if (row) await markRetailBlobDeleteOutbox(String(row.id), false);
    }
    return Response.json({ ok: true, deleted: true }, { headers: { "cache-control": "no-store" } });
  } catch (error) { return fail(error, error instanceof Error && error.message === "unauthorized" ? 401 : 400); }
}
