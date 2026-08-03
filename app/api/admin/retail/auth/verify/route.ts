import { NextResponse } from "next/server";

import { assertSameOrigin, setRetailAdminSession } from "@/src/lib/retail/admin-auth";
import { redeemRetailAdminLoginLink } from "@/src/lib/retail/admin-magic-link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const tokenPattern = /^[A-Za-z0-9_-]{43}$/;

function confirmationHtml(token: string) {
  const valid = tokenPattern.test(token);
  const content = valid
    ? `<h1>Confirm admin sign-in</h1><p>This one-time link expires after 15 minutes.</p><form method="post"><input type="hidden" name="token" value="${token}"><button type="submit">Sign in to retail admin</button></form>`
    : `<h1>Sign-in link unavailable</h1><p>Request a new link from the retail admin login page.</p>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="referrer" content="no-referrer"><title>TranquilBeads admin sign-in</title><style>body{margin:0;background:#f5efe5;color:#211b16;font:16px system-ui}main{max-width:30rem;margin:12vh auto;padding:2rem;border:1px solid #dfd2c0;border-radius:1rem;background:#fbf7f1}button{border:0;border-radius:.6rem;background:#7b5f3f;color:white;padding:.8rem 1rem;font-weight:600}</style></head><body><main>${content}</main></body></html>`;
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  return new Response(confirmationHtml(token), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "referrer-policy": "no-referrer", "x-frame-options": "DENY" } });
}

export async function POST(request: Request) {
  try {
    await assertSameOrigin();
    const form = await request.formData();
    const token = String(form.get("token") || "");
    const actor = await redeemRetailAdminLoginLink(token);
    if (!actor) throw new Error("invalid_link");
    await setRetailAdminSession(actor);
    return NextResponse.redirect(new URL("/admin/retail/settings", request.url), { status: 303, headers: { "referrer-policy": "no-referrer" } });
  } catch {
    return NextResponse.redirect(new URL("/admin/retail/settings?error=link", request.url), { status: 303, headers: { "referrer-policy": "no-referrer" } });
  }
}
