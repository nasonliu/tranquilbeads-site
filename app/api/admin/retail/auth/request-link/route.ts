import { after } from "next/server";
import { z } from "zod";

import { assertSameOrigin } from "@/src/lib/retail/admin-auth";
import { issueRetailAdminLoginLink, sendRetailAdminLoginEmail } from "@/src/lib/retail/admin-magic-link";
import { consumeRetailRateLimit } from "@/src/lib/retail/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const input = z.object({ email: z.string().trim().email().max(254) }).strict();

export async function POST(request: Request) {
  const startedAt = Date.now();
  try {
    await assertSameOrigin();
    if (!await consumeRetailRateLimit(request, "admin_magic_link", 5, 100, 900)) return Response.json({ ok: true }, { status: 202, headers: { "cache-control": "no-store" } });
    const body = input.parse(await request.json());
    const email = body.email.trim().toLowerCase();
    const result = await issueRetailAdminLoginLink(email);
    if (result.issued) after(() => sendRetailAdminLoginEmail(email, result.token).catch(() => false));
  } catch { /* Uniform response prevents administrator email enumeration. */ }
  const remaining = 150 - (Date.now() - startedAt);
  if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
  return Response.json({ ok: true }, { status: 202, headers: { "cache-control": "no-store" } });
}
