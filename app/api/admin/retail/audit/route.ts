import { requireRetailPermission } from "@/src/lib/retail/admin-auth";
import { listRetailAdminAudit } from "@/src/lib/retail/operations";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireRetailPermission("audit:read");
    const query = new URL(request.url).searchParams;
    const input = z.object({
      page: z.coerce.number().int().positive().max(10_000).default(1),
      action: z.string().trim().max(120).optional(),
      actor: z.string().trim().max(120).optional(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    }).parse(Object.fromEntries(query));
    const limit = 50;
    const rows = await listRetailAdminAudit({ limit, offset: (input.page - 1) * limit, action: input.action, actor: input.actor, date: input.date });
    const hasNext = rows.length > limit;
    return Response.json({ ok: true, entries: rows.slice(0, limit), page: input.page, hasNext }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid_request";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 400;
    const code = status === 401 ? "unauthorized" : status === 403 ? "forbidden" : "invalid_request";
    return Response.json({ ok: false, error: code }, { status, headers: { "cache-control": "no-store" } });
  }
}
