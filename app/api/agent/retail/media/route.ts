import { requireRetailAgentPermission } from "@/src/lib/retail/agent-auth";
import { deleteRetailProductImage, reorderRetailProductImages, retailMediaError, retailMediaStatus, uploadRetailProductImage } from "@/src/lib/retail/media-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "cache-control": "no-store" };

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "invalid_request";
  const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : message.startsWith("agent_") ? 503 : retailMediaStatus(error);
  return Response.json({ ok: false, error: status === 400 ? retailMediaError(error) : message }, { status, headers });
}

function capabilities(request: Request) {
  try {
    requireRetailAgentPermission(request, "products:write");
    const writesEnabled = process.env.RETAIL_AGENT_CATALOG_WRITE_ENABLED === "true"
      && (process.env.VERCEL_ENV !== "production" || process.env.RETAIL_AGENT_PRODUCTION_ENABLED === "true");
    return Response.json({ ok: true, capabilities: { upload: writesEnabled, delete: writesEnabled, reorder: writesEnabled } }, { headers });
  } catch (error) {
    return failure(error);
  }
}

export const GET = capabilities;
export async function POST(request: Request) {
  try { const actor = requireRetailAgentPermission(request, "products:write", true); const result = await uploadRetailProductImage(request, actor); return Response.json({ ok: true, image: result.image, replayed: result.replayed }, { status: result.created ? 201 : 200, headers }); }
  catch (error) { return failure(error); }
}
export async function PATCH(request: Request) {
  try { const actor = requireRetailAgentPermission(request, "products:write", true); return Response.json({ ok: true, ...(await reorderRetailProductImages(await request.json(), actor)) }, { headers }); }
  catch (error) { return failure(error); }
}
export async function DELETE(request: Request) {
  try { const actor = requireRetailAgentPermission(request, "products:write", true); return Response.json({ ok: true, ...(await deleteRetailProductImage(await request.json(), actor)) }, { headers }); }
  catch (error) { return failure(error); }
}
