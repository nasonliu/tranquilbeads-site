import { NextResponse } from "next/server";
import { redeemCustomerLoginLink, setCustomerSession } from "@/src/lib/retail/customer-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") === "ar" ? "ar" : "en";
  const result = await redeemCustomerLoginLink(url.searchParams.get("token") || "").catch(() => null);
  if (!result) return NextResponse.redirect(new URL(`/${locale}/shop/account?error=link`, url), { status: 303 });
  await setCustomerSession(result.session);
  return NextResponse.redirect(new URL(`/${locale}/shop/account`, url), { status: 303 });
}
