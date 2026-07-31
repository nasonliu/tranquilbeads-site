import { confirmMarketingSubscription } from "@/src/lib/retail/marketing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const locale = url.searchParams.get("locale") === "ar" ? "ar" : "en";
  const confirmed = await confirmMarketingSubscription(token).catch(() => false);
  const destination = new URL(`/${locale}/shop/subscribe/confirmed`, url.origin);
  destination.searchParams.set("result", confirmed ? "confirmed" : "invalid");
  return Response.redirect(destination, 303);
}
