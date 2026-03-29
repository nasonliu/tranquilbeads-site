import { describe, expect, it, vi, beforeEach } from "vitest";

type ImageManagerProduct = {
  slug: string;
  name: string;
  nameAr: string;
  material: string;
  collections: string[];
  images: string[];
};

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("image-manager products api", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("normalizes legacy single-collection records into collections arrays", async () => {
    const stored = [
      {
        slug: "legacy-item",
        name: "Legacy Item",
        nameAr: "منتج قديم",
        material: "Wood",
        collection: "signature-tasbih",
        images: [],
      },
    ];

    const fsMock = {
      existsSync: vi.fn(() => true),
      readFileSync: vi.fn(() => JSON.stringify(stored)),
      writeFileSync: vi.fn(),
    };

    vi.doMock("fs", () => ({
      ...fsMock,
      default: fsMock,
    }));

    const route = await import("@/app/api/image-manager/products/route");
    const response = await route.GET();
    const payload = await response.json();

    expect(payload).toEqual([
      expect.objectContaining({
        slug: "legacy-item",
        collections: ["signature-tasbih"],
      }),
    ]);
  });

  it("persists collections arrays on add", async () => {
    let stored: ImageManagerProduct[] = [];

    const fsMock = {
      existsSync: vi.fn(() => true),
      readFileSync: vi.fn(() => JSON.stringify(stored)),
      writeFileSync: vi.fn((_file: string, contents: string) => {
        stored = JSON.parse(contents) as ImageManagerProduct[];
      }),
    };

    vi.doMock("fs", () => ({
      ...fsMock,
      default: fsMock,
    }));

    const route = await import("@/app/api/image-manager/products/route");
    const response = await route.POST(
      jsonRequest({
        action: "add",
        product: {
          slug: "multi-collection-item",
          name: "Multi Collection Item",
          nameAr: "منتج متعدد المجموعات",
          material: "Agate",
          collections: ["gift-sets", "premium"],
          images: [],
        },
      }) as never,
    );
    const payload = await response.json();

    expect(payload.products[0].collections).toEqual(["gift-sets", "premium"]);
    expect(stored[0]?.collections).toEqual(["gift-sets", "premium"]);
  });
});
