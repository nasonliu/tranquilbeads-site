import { assertSameOrigin, requireRetailPermission } from "@/src/lib/retail/admin-auth";
import { deleteRetailProductImage, reorderRetailProductImages, retailMediaError, retailMediaStatus, uploadRetailProductImage } from "@/src/lib/retail/media-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail = (error: unknown, status = 400) => {
  return Response.json({ ok: false, error: retailMediaError(error) }, { status, headers: { "cache-control": "no-store" } });
};

export async function POST(request: Request) {
  try {
    const actor = await requireRetailPermission("products:write");
    await assertSameOrigin();
    const result = await uploadRetailProductImage(request, actor);
    return Response.json({ ok: true, image: result.image, replayed: result.replayed }, { status: result.created ? 201 : 200, headers: { "cache-control": "no-store" } });
  } catch (error) { return fail(error, error instanceof Error && error.message === "unauthorized" ? 401 : error instanceof Error && error.message === "forbidden" ? 403 : retailMediaStatus(error)); }
}

export async function DELETE(request: Request) {
  try {
    const actor = await requireRetailPermission("products:write");
    await assertSameOrigin();
    return Response.json({ ok: true, ...(await deleteRetailProductImage(await request.json(), actor)) }, { headers: { "cache-control": "no-store" } });
  } catch (error) { return fail(error, error instanceof Error && error.message === "unauthorized" ? 401 : error instanceof Error && error.message === "forbidden" ? 403 : retailMediaStatus(error)); }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requireRetailPermission("products:write");
    await assertSameOrigin();
    return Response.json({ ok: true, ...(await reorderRetailProductImages(await request.json(), actor)) }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return fail(error, error instanceof Error && error.message === "unauthorized" ? 401 : error instanceof Error && error.message === "forbidden" ? 403 : retailMediaStatus(error));
  }
}
