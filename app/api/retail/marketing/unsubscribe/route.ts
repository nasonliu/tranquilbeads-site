import { z } from "zod";

import { unsubscribeMarketing } from "@/src/lib/retail/marketing";
import { consumeRetailRateLimit } from "@/src/lib/retail/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "cache-control": "no-store" };

export async function POST(request: Request) {
  try {
    if (!await consumeRetailRateLimit(request, "marketing_unsubscribe", 20, 1000, 3600)) {
      return Response.json({ ok: true }, { status: 202, headers });
    }
    const input = z.object({ token: z.string().uuid() }).strict().parse(await request.json());
    await unsubscribeMarketing(input.token);
    return Response.json({ ok: true }, { status: 202, headers });
  } catch {
    // Unsubscribe is intentionally idempotent and does not reveal membership.
    return Response.json({ ok: true }, { status: 202, headers });
  }
}
