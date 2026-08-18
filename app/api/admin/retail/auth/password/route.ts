import { z } from "zod";

import {
  assertSameOrigin,
  changeRetailAdminPassword,
  clearRetailAdminSession,
  requireRetailAdmin,
} from "@/src/lib/retail/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const passwordDto = z.object({
  currentPassword: z.string().min(8).max(256),
  newPassword: z.string().min(8).max(256),
  confirmPassword: z.string().min(8).max(256),
}).strict().superRefine((value, context) => {
  if (value.newPassword !== value.confirmPassword) {
    context.addIssue({ code: "custom", path: ["confirmPassword"], message: "password_confirmation_mismatch" });
  }
});

export async function POST(request: Request) {
  try {
    await assertSameOrigin();
    const actor = await requireRetailAdmin();
    const input = passwordDto.parse(await request.json());
    await changeRetailAdminPassword(actor, input.currentPassword, input.newPassword);
    await clearRetailAdminSession();
    return Response.json({ ok: true, requiresSignIn: true }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const code = error instanceof Error ? error.message : "request_failed";
    const status = code === "unauthorized" ? 401
      : code === "current_password_invalid" ? 401
        : code.includes("database") ? 503
          : 400;
    const safeCode = code === "current_password_invalid" || code === "password_reused"
      ? code
      : status === 401 ? "unauthorized"
        : status === 503 ? "service_unavailable"
          : "invalid_request";
    return Response.json({ ok: false, error: safeCode }, { status, headers: { "cache-control": "no-store" } });
  }
}
