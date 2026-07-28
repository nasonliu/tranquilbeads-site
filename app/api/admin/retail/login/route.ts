import { z } from "zod";
import { assertSameOrigin, authenticateRetailAdmin, consumeRetailAdminLoginFailure, setRetailAdminSession } from "@/src/lib/retail/admin-auth";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const loginDto = z.object({ password: z.string().min(16).max(256), actorId: z.string().trim().min(1).max(100).optional() }).strict();

export async function POST(request: Request) {
  try {
    await assertSameOrigin();
    const { password, actorId } = loginDto.parse(await request.json());
    const actor = authenticateRetailAdmin(password, actorId);
    if (!actor) {
      try {
        const allowed = await consumeRetailAdminLoginFailure(request, actorId);
        return Response.json({ ok: false, ...(allowed ? {} : { error: "rate_limited" }) }, { status: allowed ? 401 : 429, headers: { "cache-control": "no-store" } });
      } catch {
        // Without a trusted proxy identity or durable limiter storage, do not
        // turn a failed password check into an unbounded brute-force path.
        return Response.json({ ok: false, error: "login_unavailable" }, { status: 503, headers: { "cache-control": "no-store" } });
      }
    }
    await setRetailAdminSession(actor);
    return Response.json({ ok: true, actor: { id: actor.id, name: actor.name, role: actor.role, legacy: actor.legacy } }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ ok: false }, { status: 400, headers: { "cache-control": "no-store" } });
  }
}
