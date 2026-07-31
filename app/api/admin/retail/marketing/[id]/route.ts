import { z } from "zod";

import { assertSameOrigin, requireRetailPermission } from "@/src/lib/retail/admin-auth";
import { marketingStatusDto, setMarketingSubscriberStatus } from "@/src/lib/retail/marketing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "cache-control": "no-store" };

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRetailPermission("customers:write");
    await assertSameOrigin();
    const { id } = await context.params;
    const result = await setMarketingSubscriberStatus(z.string().uuid().parse(id), marketingStatusDto.parse(await request.json()), actor);
    return Response.json({ ok: true, subscriber: result }, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid_request";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 400;
    return Response.json({ ok: false, error: status === 400 ? "invalid_request" : message }, { status, headers });
  }
}
