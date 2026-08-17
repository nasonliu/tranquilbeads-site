import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { proxy } from "@/proxy";

function route(pathname: string) {
  return proxy(new NextRequest(`https://shop.example${pathname}`));
}

describe("Chinese retail compatibility routing", () => {
  it.each([
    "/zh/shop/order/00000000-0000-4000-8000-000000000000",
    "/zh/shop/account/customer-access-token",
    "/zh/shop/account/customer-access-token/returns",
    "/zh/privacy",
    "/zh/terms",
    "/zh/shipping-returns",
  ])("keeps the supported Chinese customer or policy route %s", (pathname) => {
    expect(route(pathname).headers.get("x-middleware-next")).toBe("1");
  });

  it.each([
    ["/zh/shop", "/en/shop"],
    ["/zh/shop/mvp-sandbox-tasbih-20260727", "/en/shop/mvp-sandbox-tasbih-20260727"],
  ])("redirects the Chinese storefront route %s to English", (pathname, target) => {
    const response = route(pathname);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`https://shop.example${target}`);
  });

  it.each(["/zh/wholesale", "/zh/collections/tasbih"])('redirects unsupported Chinese public route %s to the English shop', (pathname) => {
    const response = route(pathname);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://shop.example/en/shop");
  });
});
