import { neon } from "@neondatabase/serverless";
import { isAuthorizedRetailReservationCron } from "@/src/lib/retail/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "cache-control": "no-store" };

export async function GET(request: Request) {
  if (!isAuthorizedRetailReservationCron(request.headers.get("authorization"))) {
    return Response.json({ ok: false }, { status: 401, headers: noStore });
  }
  const url = process.env.DATABASE_URL;
  if (!url) return Response.json({ ok: false, error: "retail_database_unavailable" }, { status: 503, headers: noStore });
  try {
    const rows = await neon(url)`SELECT retail_release_expired_reservations() AS released`;
    return Response.json({ ok: true, released: Number(rows[0]?.released ?? 0) }, { headers: noStore });
  } catch {
    return Response.json({ ok: false, error: "retail_reservation_cleanup_failed" }, { status: 503, headers: noStore });
  }
}
