import { assertSameOrigin, requireRetailPermission } from "@/src/lib/retail/admin-auth";
import { deleteCatalogStyle, styleDeleteDto, styleUpdateDto, updateCatalogStyle } from "@/src/lib/retail/catalog-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "cache-control": "no-store" };
function failure(error: unknown) { const message = error instanceof Error ? error.message : "invalid_request"; const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 400; return Response.json({ ok: false, error: status === 400 ? "invalid_request" : message }, { status, headers }); }
type ParamsContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: ParamsContext) {
  try { const actor = await requireRetailPermission("products:write"); await assertSameOrigin(); const { id } = await context.params; return Response.json({ ok: true, style: await updateCatalogStyle(id, styleUpdateDto.parse(await request.json()), actor) }, { headers }); }
  catch (error) { return failure(error); }
}
export async function DELETE(request: Request, context: ParamsContext) {
  try { const actor = await requireRetailPermission("products:write"); await assertSameOrigin(); const { id } = await context.params; return Response.json({ ok: true, style: await deleteCatalogStyle(id, styleDeleteDto.parse(await request.json()), actor) }, { headers }); }
  catch (error) { return failure(error); }
}
