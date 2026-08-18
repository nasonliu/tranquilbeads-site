import { assertSameOrigin, requireRetailPermission } from "@/src/lib/retail/admin-auth";
import {
  getStorefrontHomepageAdmin,
  homepageDraftDto,
  homepagePublishDto,
  publishStorefrontHomepage,
  saveStorefrontHomepageDraft,
} from "@/src/lib/retail/storefront-pages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "cache-control": "no-store" };

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "invalid_request";
  const publicError = message.includes("page_version_conflict") ? "page_version_conflict"
    : message === "page_result_unknown" ? message
      : message === "unauthorized" || message === "forbidden" ? message
        : "invalid_request";
  const status = publicError === "unauthorized" ? 401 : publicError === "forbidden" ? 403 : publicError === "page_version_conflict" ? 409 : publicError === "page_result_unknown" ? 503 : 400;
  return Response.json({ ok: false, error: publicError }, { status, headers });
}

export async function GET() {
  try {
    await requireRetailPermission("products:write");
    return Response.json({ ok: true, page: await getStorefrontHomepageAdmin() }, { headers });
  } catch (error) {
    return failure(error);
  }
}

export async function PUT(request: Request) {
  try {
    const actor = await requireRetailPermission("products:write");
    await assertSameOrigin();
    const page = await saveStorefrontHomepageDraft(homepageDraftDto.parse(await request.json()), actor);
    return Response.json({ ok: true, page }, { headers });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireRetailPermission("products:write");
    await assertSameOrigin();
    const page = await publishStorefrontHomepage(homepagePublishDto.parse(await request.json()), actor);
    return Response.json({ ok: true, page }, { headers });
  } catch (error) {
    return failure(error);
  }
}
