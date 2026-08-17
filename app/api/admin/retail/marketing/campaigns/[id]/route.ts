import { assertSameOrigin, requireRetailPermission } from "@/src/lib/retail/admin-auth";
import { cancelMarketingCampaign, marketingCampaignCancelDto, marketingCampaignScheduleDto, marketingCampaignTestDto, scheduleMarketingCampaign, sendMarketingCampaignTest } from "@/src/lib/retail/marketing-campaigns";

export const runtime = "nodejs";
const headers = { "cache-control": "no-store" };
const failure = (error: unknown) => { const message = error instanceof Error ? error.message : "invalid_request"; const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 400; return Response.json({ ok: false, error: status === 400 ? "invalid_request" : message }, { status, headers }); };

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRetailPermission("orders:pii"); await assertSameOrigin();
    const { id } = await context.params;
    const body = await request.json() as { action?: unknown };
    const { action, ...input } = body;
    if (action === "schedule") return Response.json({ ok: true, campaign: await scheduleMarketingCampaign(id, marketingCampaignScheduleDto.parse(input), actor) }, { headers });
    if (action === "cancel") return Response.json({ ok: true, campaign: await cancelMarketingCampaign(id, marketingCampaignCancelDto.parse(input), actor) }, { headers });
    if (action === "test") { const parsed = marketingCampaignTestDto.parse(input); await sendMarketingCampaignTest(id, parsed); return Response.json({ ok: true }, { headers }); }
    return Response.json({ ok: false, error: "invalid_request" }, { status: 400, headers });
  } catch (error) { return failure(error); }
}
