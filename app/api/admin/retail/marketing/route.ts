import { requireRetailPermission } from "@/src/lib/retail/admin-auth";
import { listMarketingSubscribers } from "@/src/lib/retail/marketing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "cache-control": "no-store" };
const csv = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export async function GET(request: Request) {
  try {
    const actor = await requireRetailPermission("orders:pii");
    const format = new URL(request.url).searchParams.get("format");
    const subscribers = await listMarketingSubscribers(actor, format === "csv" ? "export" : "view");
    if (format === "csv") {
      const rows = ["email,locale,source,status,consented_at,unsubscribed_at,unsubscribe_token", ...subscribers.filter((row) => row.status === "active").map((row) => [row.email,row.locale,row.source,row.status,row.consented_at,row.unsubscribed_at,row.public_id].map(csv).join(","))];
      return new Response(rows.join("\n"), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=tranquilbeads-active-marketing-list.csv", ...noStore } });
    }
    return Response.json({ ok: true, subscribers }, { headers: noStore });
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid_request";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 400;
    return Response.json({ ok: false, error: status === 400 ? "invalid_request" : message }, { status, headers: noStore });
  }
}
