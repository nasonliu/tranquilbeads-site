import { assertSameOrigin, requireRetailPermission } from "@/src/lib/retail/admin-auth";
import { createCatalogVariant, listCatalogVariants, variantCreateDto } from "@/src/lib/retail/catalog-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "cache-control": "no-store" };
function failure(error: unknown) { const message = error instanceof Error ? error.message : "invalid_request"; const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 400; return Response.json({ ok: false, error: status === 400 ? "invalid_request" : message }, { status, headers }); }

export async function GET(request: Request) {
  try { await requireRetailPermission("products:write"); return Response.json({ ok: true, variants: await listCatalogVariants(new URL(request.url).searchParams.get("productId") ?? undefined) }, { headers }); }
  catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try { const actor = await requireRetailPermission("products:write"); await assertSameOrigin(); return Response.json({ ok: true, variant: await createCatalogVariant(variantCreateDto.parse(await request.json()), actor) }, { status: 201, headers }); }
  catch (error) { return failure(error); }
}
