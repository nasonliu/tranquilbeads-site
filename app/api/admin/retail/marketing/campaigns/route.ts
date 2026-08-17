import { assertSameOrigin, requireRetailPermission } from "@/src/lib/retail/admin-auth";
import { createMarketingCampaign, listMarketingCampaigns, marketingCampaignCreateDto } from "@/src/lib/retail/marketing-campaigns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "cache-control": "no-store" };
const failure = (error: unknown) => { const message = error instanceof Error ? error.message : "invalid_request"; const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 400; return Response.json({ ok: false, error: status === 400 ? "invalid_request" : message }, { status, headers }); };

export async function GET() {
  try { await requireRetailPermission("orders:pii"); return Response.json({ ok: true, campaigns: await listMarketingCampaigns() }, { headers }); }
  catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try { const actor = await requireRetailPermission("orders:pii"); await assertSameOrigin(); return Response.json({ ok: true, campaign: await createMarketingCampaign(marketingCampaignCreateDto.parse(await request.json()), actor) }, { status: 201, headers }); }
  catch (error) { return failure(error); }
}
