import { assertSameOrigin, requireRetailPermission } from "@/src/lib/retail/admin-auth";
import { uploadStorefrontHomepageImage } from "@/src/lib/retail/storefront-pages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "cache-control": "no-store" };

export async function POST(request: Request) {
  try {
    const actor = await requireRetailPermission("products:write");
    await assertSameOrigin();
    return Response.json({ ok: true, asset: await uploadStorefrontHomepageImage(request, actor) }, { status: 201, headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid_request";
    const publicError = message === "unauthorized" || message === "forbidden" || message === "invalid_image" || message === "invalid_size" || message === "invalid_dimensions" ? message : "invalid_request";
    return Response.json({ ok: false, error: publicError }, { status: publicError === "unauthorized" ? 401 : publicError === "forbidden" ? 403 : 400, headers });
  }
}
