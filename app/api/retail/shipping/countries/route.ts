import { consumeRetailRateLimit } from "@/src/lib/retail/rate-limit";
import { listStorefrontShippingCountries } from "@/src/lib/retail/storefront-shipping";

export const runtime = "nodejs";
const noStore = { "cache-control": "private, max-age=300" };

export async function GET(request: Request) {
  try {
    if (!await consumeRetailRateLimit(request, "shipping_countries", 30, 5_000)) return Response.json({ ok: false, error: "rate_limited" }, { status: 429, headers: { ...noStore, "retry-after": "300" } });
    const countries = await listStorefrontShippingCountries();
    if (!countries) return Response.json({ ok: true, countries: [] }, { headers: noStore });
    return Response.json({ ok: true, countries: countries.map(({ code, name }) => ({ code, name })) }, { headers: noStore });
  } catch {
    return Response.json({ ok: false, error: "shipping_countries_unavailable" }, { status: 503, headers: noStore });
  }
}
