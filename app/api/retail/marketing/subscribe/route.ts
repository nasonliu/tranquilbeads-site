import { after } from "next/server";
import { marketingSubscribeDto, requestMarketingSubscription, sendMarketingConfirmationEmail } from "@/src/lib/retail/marketing";
import { consumeRetailRateLimit } from "@/src/lib/retail/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "cache-control": "no-store" };

export async function POST(request: Request) {
  try {
    if (!await consumeRetailRateLimit(request, "marketing_subscribe", 8, 500, 3600)) {
      return Response.json({ ok: true }, { status: 202, headers });
    }
    const input = marketingSubscribeDto.parse(await request.json());
    const email = input.email.toLowerCase();
    const result = await requestMarketingSubscription(email, input.locale);
    if (result.shouldSend) after(() => sendMarketingConfirmationEmail(email, result.token, input.locale, new URL(request.url).origin).catch(() => false));
    // The same response is used for active and provider-suppressed addresses.
    return Response.json({ ok: true }, { status: 202, headers });
  } catch {
    return Response.json({ ok: false, error: "invalid_request" }, { status: 400, headers });
  }
}
