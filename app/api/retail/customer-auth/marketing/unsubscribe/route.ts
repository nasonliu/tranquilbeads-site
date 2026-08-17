import { withdrawCustomerMarketingConsent } from "@/src/lib/retail/customer-auth";

export const runtime = "nodejs";

export async function POST() {
  await withdrawCustomerMarketingConsent().catch(() => 0);
  return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
