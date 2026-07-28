import { adminReturnTransitionDto, transitionAdminReturn } from "@/src/lib/retail/returns";
import { assertSameOrigin, requireRetailPermission } from "@/src/lib/retail/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
const headers = { "cache-control": "no-store" };

export async function PATCH(request: Request, context: Context) {
  try {
    await assertSameOrigin();
    const { id } = await context.params;
    const input = adminReturnTransitionDto.parse(await request.json());
    await requireRetailPermission("returns:manage");
    if (input.sellableRestock) await requireRetailPermission("inventory:write");
    const result = await transitionAdminReturn(id, input);
    return Response.json({ ok: true, return: result }, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid_request";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 400;
    return Response.json({ ok: false, error: status === 401 ? "unauthorized" : status === 403 ? "forbidden" : "invalid_request" }, { status, headers });
  }
}
