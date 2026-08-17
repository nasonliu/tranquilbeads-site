import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Chinese stays available for administration-facing customer records and policy pages. */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/zh")) return NextResponse.next();
  if (/^\/zh\/(shop\/(?:order\/[0-9a-f-]{36}|account\/[^/]+(?:\/returns)?)|privacy|terms|shipping-returns)\/?$/i.test(pathname)) return NextResponse.next();
  const url = request.nextUrl.clone();
  if (/^\/zh\/shop(?:\/[^/]+)?\/?$/i.test(pathname)) {
    url.pathname = pathname.replace(/^\/zh/i, "/en");
    return NextResponse.redirect(url);
  }
  url.pathname = "/en/shop";
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/zh/:path*"] };
