import { cookies } from "next/headers";
import { clearCustomerSession, revokeCustomerSession } from "@/src/lib/retail/customer-auth";

export const runtime = "nodejs";
export async function POST() { const value = (await cookies()).get("retail_customer_session")?.value; await revokeCustomerSession(value).catch(() => false); await clearCustomerSession(); return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } }); }
