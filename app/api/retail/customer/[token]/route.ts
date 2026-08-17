import { redeemCustomerPortalToken } from "@/src/lib/retail/customer-portal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const privateHeaders = {
  "cache-control": "no-store, private",
  "referrer-policy": "no-referrer",
  "x-robots-tag": "noindex, nofollow, noarchive",
};

type ParamsContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: ParamsContext) {
  const { token } = await context.params;
  try {
    const order = await redeemCustomerPortalToken(token);
    // Do not distinguish malformed, expired, revoked, or unknown credentials.
    if (!order) return Response.json({ ok: false, error: "portal_unavailable" }, { status: 404, headers: privateHeaders });
    return Response.json({ ok: true, order }, { headers: privateHeaders });
  } catch {
    return Response.json({ ok: false, error: "portal_unavailable" }, { status: 404, headers: privateHeaders });
  }
}
