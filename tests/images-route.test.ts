import { beforeEach, describe, expect, it, vi } from "vitest";

const requireRetailAdmin = vi.fn();
const assertSameOrigin = vi.fn();

vi.mock("@/src/lib/retail/admin-auth", () => ({ requireRetailAdmin, assertSameOrigin }));

describe("images api", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("lists only public raster image URLs without filesystem paths", async () => {
    const fsMock = {
      existsSync: vi.fn(() => true), mkdirSync: vi.fn(), writeFileSync: vi.fn(),
      readdirSync: vi.fn((target: string) => {
        if (target.endsWith("public/images/imported")) return [{ name: "amber-set", isDirectory: () => true, isFile: () => false }];
        if (target.endsWith("public/images/imported/amber-set")) return [
          { name: "1.jpg", isDirectory: () => false, isFile: () => true },
          { name: "2.webp", isDirectory: () => false, isFile: () => true },
          { name: ".env", isDirectory: () => false, isFile: () => true },
        ];
        return [
          { name: "hero.jpg", isDirectory: () => false, isFile: () => true },
          { name: "logo.svg", isDirectory: () => false, isFile: () => true },
          { name: ".env", isDirectory: () => false, isFile: () => true },
        ];
      }),
    };
    vi.doMock("fs", () => ({ __esModule: true, default: fsMock }));
    vi.doMock("sharp", () => ({ __esModule: true, default: vi.fn() }));

    const route = await import("@/app/api/images/route");
    expect(await (await route.GET()).json()).toEqual({
      folders: { "amber-set": ["/images/imported/amber-set/1.jpg", "/images/imported/amber-set/2.webp"] },
      staticFiles: ["/images/hero.jpg"],
    });
  });

  it("requires authentication and a same-origin request before parsing an upload", async () => {
    requireRetailAdmin.mockRejectedValueOnce(new Error("unauthorized"));
    vi.doMock("sharp", () => ({ __esModule: true, default: vi.fn() }));
    const route = await import("@/app/api/images/route");
    expect((await route.POST(new Request("http://localhost/api/images", { method: "POST" }) as never)).status).toBe(401);

    assertSameOrigin.mockRejectedValueOnce(new Error("csrf_rejected"));
    expect((await route.POST(new Request("http://localhost/api/images", { method: "POST" }) as never)).status).toBe(403);
  });

  it("rejects disguised HTML and writes only Sharp-reencoded bytes with a server-controlled name", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-29T10:00:00Z"));
    const fsMock = { existsSync: vi.fn(() => false), mkdirSync: vi.fn(), readdirSync: vi.fn(), writeFileSync: vi.fn() };
    const encoded = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    const sharpMock = vi.fn(() => ({ rotate: () => ({
      metadata: async () => ({ width: 1, height: 1 }),
      jpeg: () => ({ toBuffer: async () => encoded }),
      png: () => ({ toBuffer: async () => Buffer.from("png") }),
      webp: () => ({ toBuffer: async () => Buffer.from("webp") }),
    }) }));
    vi.doMock("fs", () => ({ __esModule: true, default: fsMock }));
    vi.doMock("sharp", () => ({ __esModule: true, default: sharpMock }));
    const route = await import("@/app/api/images/route");

    const html = new FormData();
    html.append("file", new File(["<svg onload=alert(1) />"], "x.png", { type: "image/png" }));
    expect((await route.POST(new Request("http://localhost/api/images", { method: "POST", body: html }) as never)).status).toBe(400);

    const upload = { name: "../../.env.jpg", type: "image/jpeg", size: 12, arrayBuffer: async () => new Uint8Array([0xff, 0xd8, 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0]).buffer };
    const response = await route.POST({ formData: async () => ({ get: (key: string) => key === "file" ? upload : key === "slug" ? "Amber Gift Set" : null }) } as never);
    expect(await response.json()).toEqual({ url: "/images/imported/amber-gift-set/1774778400000-upload.jpg" });
    expect(fsMock.writeFileSync).toHaveBeenCalledWith(expect.stringMatching(/1774778400000-upload\.jpg$/), encoded);
    expect(sharpMock).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
