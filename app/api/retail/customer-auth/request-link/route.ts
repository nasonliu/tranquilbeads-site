import { after } from "next/server";
import { z } from "zod";
import { consumeRetailRateLimit } from "@/src/lib/retail/rate-limit";
import { issueCustomerLoginLink, sendCustomerLoginEmail } from "@/src/lib/retail/customer-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const input = z.object({ email: z.string().trim().email().max(254), locale: z.enum(["en", "ar"]).optional() }).strict();

export async function POST(request: Request) {
  const startedAt = Date.now();
  try {
    if (!await consumeRetailRateLimit(request, "customer_account_link", 5, 100, 900)) return Response.json({ ok: true }, { status: 202, headers: { "cache-control": "no-store" } });
    const body = input.parse(await request.json());
    const result = await issueCustomerLoginLink(body.email);
    if (result.issued) after(() => sendCustomerLoginEmail(body.email.trim().toLowerCase(), result.token, body.locale ?? "en").catch(() => false));
  } catch { /* Generic response prevents account enumeration. */ }
  // Mask the small existing/missing-row database timing difference. Resend
  // delivery itself runs after the response and is never part of the signal.
  const remaining = 150 - (Date.now() - startedAt);
  if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
  return Response.json({ ok: true }, { status: 202, headers: { "cache-control": "no-store" } });
}
