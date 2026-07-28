import { z } from "zod";
import { assertSameOrigin, requireRetailPermission } from "@/src/lib/retail/admin-auth";
import { mediaReorderDto, reorderRetailProductMedia } from "@/src/lib/retail/operations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function reorder(request: Request) {
  try {
    const actor = await requireRetailPermission("products:write");
    await assertSameOrigin();
    const input = mediaReorderDto.parse(await request.json());
    const result = await reorderRetailProductMedia(input, actor);
    return Response.json({ ok: true, mediaVersion: Number(result.media_version), imageIds: result.image_ids, replayed: result.replayed === true }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid_request";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : message === "media_version_conflict" ? 409 : message === "image_set_mismatch" || message === "duplicate_image" ? 422 : error instanceof z.ZodError ? 400 : 400;
    return Response.json({ ok: false, error: message }, { status, headers: { "cache-control": "no-store" } });
  }
}

export const PATCH = reorder;
// Compatibility for pre-contract clients; PATCH is the canonical method.
export const POST = reorder;
