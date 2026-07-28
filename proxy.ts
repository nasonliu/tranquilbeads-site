import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Chinese currently ships only for the direct-retail experience. */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/zh")) return NextResponse.next();
  if (/^\/zh\/(shop(?:\/order\/[0-9a-f-]{36}|\/account\/[^/]+(?:\/returns)?)?|privacy|terms|shipping-returns)\/?$/i.test(pathname)) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = "/zh/shop";
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/zh/:path*"] };
