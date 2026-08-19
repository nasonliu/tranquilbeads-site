import fs from "node:fs";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HomepageAdmin } from "@/app/admin/retail/pages/homepage-admin";
import { defaultHomepageConfig, homepageConfigSchema, selectHomepageProducts } from "@/src/lib/retail/homepage-config";

const page = {
  draft: defaultHomepageConfig,
  published: defaultHomepageConfig,
  version: 0,
  publishedVersion: null,
  updatedAt: null,
  publishedAt: null,
};

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("retail homepage management", () => {
  it("validates safe homepage links and keeps selected products in operator order", () => {
    expect(homepageConfigSchema.parse(defaultHomepageConfig)).toEqual(defaultHomepageConfig);
    expect(() => homepageConfigSchema.parse({ ...defaultHomepageConfig, hero: { ...defaultHomepageConfig.hero, primaryHref: "https://evil.example" } })).toThrow();
    expect(() => homepageConfigSchema.parse({ ...defaultHomepageConfig, featuredProductSkus: ["A", "A"] })).toThrow();
    expect(selectHomepageProducts([{ sku: "A" }, { sku: "B" }, { sku: "C" }], ["C", "A"])).toEqual([{ sku: "C" }, { sku: "A" }, { sku: "B" }]);
  });

  it("saves a homepage draft before enabling publish", async () => {
    const requests: Array<{ path: string; method: string; body?: Record<string, unknown> }> = [];
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input); const method = init?.method ?? "GET";
      if (path === "/api/admin/retail/pages/home" && method === "GET") return Response.json({ ok: true, page });
      if (path === "/api/admin/retail/products") return Response.json({ ok: true, products: [{ sku: "AMBER-33", title_en: "Amber Tasbih", status: "published", images: [{ url: "https://assets.example/amber.jpg" }] }] });
      if (path === "/api/admin/retail/auth/session") return Response.json({ ok: true, actor: { name: "Admin", role: "admin" } });
      if (path === "/api/admin/retail/pages/home" && method === "PUT") {
        const body = JSON.parse(String(init?.body)) as { config: typeof defaultHomepageConfig };
        requests.push({ path, method, body: body as unknown as Record<string, unknown> });
        return Response.json({ ok: true, page: { ...page, draft: body.config, version: 1 } });
      }
      return Response.json({ ok: false, error: "unexpected_request" }, { status: 400 });
    });
    vi.stubGlobal("fetch", fetcher);
    render(<HomepageAdmin />);

    const title = await screen.findByDisplayValue(defaultHomepageConfig.hero.title.en);
    const publish = screen.getByRole("button", { name: "Publish homepage" });
    expect(publish).toBeDisabled();
    fireEvent.change(title, { target: { value: "A new homepage title" } });
    expect(screen.getByText("Unsaved edits")).toBeInTheDocument();
    expect(publish).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));

    await screen.findByText("Draft saved.");
    expect(requests).toHaveLength(1);
    expect((requests[0].body?.config as typeof defaultHomepageConfig).hero.title.en).toBe("A new homepage title");
    await waitFor(() => expect(publish).not.toBeDisabled());
  });

  it("registers a staged page table, guarded publish function, and admin-only routes", () => {
    const migration = fs.readFileSync("migrations/20260901_retail_storefront_pages.sql", "utf8");
    const route = fs.readFileSync("app/api/admin/retail/pages/home/route.ts", "utf8");
    const mediaRoute = fs.readFileSync("app/api/admin/retail/pages/home/media/route.ts", "utf8");
    const adminUi = fs.readFileSync("app/admin/retail/ui.tsx", "utf8");
    expect(migration).toContain("draft_payload JSONB NOT NULL");
    expect(migration).toContain("published_payload JSONB");
    expect(migration).toContain("retail_publish_storefront_page");
    expect(route).toContain('requireRetailPermission("products:write")');
    expect(route).toContain("assertSameOrigin");
    expect(mediaRoute).toContain("uploadStorefrontHomepageImage");
    expect(adminUi).toContain('{ section: "pages" }');
  });

  it("keeps native image processing out of the public homepage read module", () => {
    const pageService = fs.readFileSync("src/lib/retail/storefront-pages.ts", "utf8");
    const mediaService = fs.readFileSync("src/lib/retail/storefront-page-media.ts", "utf8");
    const publicHomepage = fs.readFileSync("app/[locale]/page.tsx", "utf8");
    expect(publicHomepage).toContain('from "@/src/lib/retail/storefront-pages"');
    expect(pageService).not.toContain("upload-validation");
    expect(pageService).not.toContain("sharp");
    expect(pageService).not.toContain("@vercel/blob");
    expect(mediaService).toContain('await import("./upload-validation")');
  });
});
