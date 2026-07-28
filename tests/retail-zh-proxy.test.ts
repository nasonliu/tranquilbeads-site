import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { proxy } from "@/proxy";

function route(pathname: string) {
  return proxy(new NextRequest(`https://shop.example${pathname}`));
}

describe("Chinese direct-retail routing", () => {
  it.each([
    "/zh/shop",
    "/zh/shop/order/00000000-0000-4000-8000-000000000000",
    "/zh/shop/account/customer-access-token",
    "/zh/shop/account/customer-access-token/returns",
    "/zh/privacy",
    "/zh/terms",
    "/zh/shipping-returns",
  ])("keeps the supported Chinese retail route %s", (pathname) => {
    expect(route(pathname).headers.get("x-middleware-next")).toBe("1");
  });

  it("redirects unsupported Chinese wholesale routes to the independent shop", () => {
    const response = route("/zh/wholesale");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://shop.example/zh/shop");
  });
});
