import crypto from "node:crypto";

import { del, put } from "@vercel/blob";
import { z } from "zod";

import { assertSameOrigin, requireRetailAdmin } from "@/src/lib/retail/admin-auth";
import { attachRetailProductImage, detachRetailProductImage, listRetailBlobDeleteOutbox, markRetailBlobDeleteOutbox, queueRetailBlobDelete } from "@/src/lib/retail/operations";
import { validateRetailImage } from "@/src/lib/retail/upload-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fields = z.object({ productId: z.string().uuid(), altEn: z.string().trim().max(300).default(""), altAr: z.string().trim().max(300).default("") });
const fail = (error: unknown, status = 400) => Response.json({ ok: false, error: error instanceof Error ? error.message : "invalid_request" }, { status, headers: { "cache-control": "no-store" } });

export async function POST(request: Request) {
  try {
    await requireRetailAdmin();
    await assertSameOrigin();
    const form = await request.formData();
    const input = fields.parse({ productId: form.get("productId"), altEn: form.get("altEn") ?? "", altAr: form.get("altAr") ?? "" });
    const file = form.get("file");
    if (!(file instanceof File)) throw new Error("invalid_image");
    const validated = await validateRetailImage(file);
    const key = `retail/products/${input.productId}/${crypto.randomUUID()}.${validated.extension}`;
    const blob = await put(key, Buffer.from(validated.bytes), { access: "public", contentType: validated.mime, addRandomSuffix: false, cacheControlMaxAge: 60 * 60 * 24 * 365 });
    try {
      const image = await attachRetailProductImage(input.productId, { url: blob.url, key, mime: validated.mime, bytes: validated.bytes.length, sha256: validated.sha256, altEn: input.altEn, altAr: input.altAr });
      return Response.json({ ok: true, image: { id: image?.id, url: blob.url } }, { status: 201, headers: { "cache-control": "no-store" } });
    } catch (error) {
      // DB rejected the metadata (for example image limit): do not leave an
      // unreferenced public object behind. A later retry cannot reuse this key.
      await queueRetailBlobDelete(blob.url);
      const outbox = (await listRetailBlobDeleteOutbox()).find((row) => row.blob_url === blob.url);
      try { await del(blob.url); if (outbox) await markRetailBlobDeleteOutbox(String(outbox.id), true); }
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
    const outbox = (await listRetailBlobDeleteOutbox()).find((row) => row.blob_url === removed.blob_url);
    try { await del(removed.blob_url); if (outbox) await markRetailBlobDeleteOutbox(String(outbox.id), true); } catch {
      // The DB detach and outbox insert are already atomic. A worker/retry may
      // safely delete this immutable URL later.
      const row = (await listRetailBlobDeleteOutbox()).find((item) => item.blob_url === removed.blob_url);
      if (row) await markRetailBlobDeleteOutbox(String(row.id), false);
    }
    return Response.json({ ok: true, deleted: true }, { headers: { "cache-control": "no-store" } });
  } catch (error) { return fail(error, error instanceof Error && error.message === "unauthorized" ? 401 : 400); }
}
