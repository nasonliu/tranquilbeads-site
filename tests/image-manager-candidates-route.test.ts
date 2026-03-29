import { beforeEach, describe, expect, it, vi } from "vitest";

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/image-manager/candidates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("image manager candidates route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.VERCEL;
    delete (
      globalThis as typeof globalThis & {
        __loadLocalImageManagerCandidatesRoute?: unknown;
      }
    ).__loadLocalImageManagerCandidatesRoute;
  });

  it("returns ranked local image candidates", async () => {
    const handleCandidatesGet = vi.fn(async () =>
      Response.json({
        candidates: [
          {
            id: 12,
            material: "琥珀",
            previewUrl: "/api/image-manager/candidates/preview?path=%2Fvol1%2F1000%2Foffice%2Fproducts%2FPic%2Fupload%2Famber%2Fmain.jpg",
          },
        ],
      }),
    );

    (
      globalThis as typeof globalThis & {
        __loadLocalImageManagerCandidatesRoute?: unknown;
      }
    ).__loadLocalImageManagerCandidatesRoute = async () => ({
      handleCandidatesGet,
      handleCandidatesPost: vi.fn(),
    });

    const route = await import("@/app/api/image-manager/candidates/route");
    const response = await route.GET(
      new Request(
        "http://localhost/api/image-manager/candidates?material=Amber-look&name=Baltic%20Amber%20Gift%20Set&limit=10",
      ) as never,
    );
    const payload = await response.json();

    expect(payload.candidates[0]).toMatchObject({
      id: 12,
      material: "琥珀",
    });
    expect(payload.candidates[0].previewUrl).toContain("/api/image-manager/candidates/preview?path=");
  });

  it("imports a selected local file into the product image folder", async () => {
    const handleCandidatesPost = vi.fn(async () =>
      Response.json({
        url: "/images/imported/gift-product/1774778400000-main.jpg",
      }),
    );

    (
      globalThis as typeof globalThis & {
        __loadLocalImageManagerCandidatesRoute?: unknown;
      }
    ).__loadLocalImageManagerCandidatesRoute = async () => ({
      handleCandidatesGet: vi.fn(),
      handleCandidatesPost,
    });

    const route = await import("@/app/api/image-manager/candidates/route");
    const response = await route.POST(
      jsonRequest({
        slug: "gift-product",
        originalPath: "/vol1/1000/office/products/Pic/upload/amber/main.jpg",
      }) as never,
    );
    const payload = await response.json();

    expect(handleCandidatesPost).toHaveBeenCalled();
    expect(payload.url).toMatch(/^\/images\/imported\/gift-product\/.+main\.jpg$/);
  });

  it("matches path and folder clues even when the material column is generic", async () => {
    const handleCandidatesGet = vi.fn(async () =>
      Response.json({
        candidates: [
          {
            id: 21,
            original_path: "/vol1/1000/office/products/Pic/upload/tasbih/0325/blueredtiger33/main.jpg",
          },
        ],
      }),
    );

    (
      globalThis as typeof globalThis & {
        __loadLocalImageManagerCandidatesRoute?: unknown;
      }
    ).__loadLocalImageManagerCandidatesRoute = async () => ({
      handleCandidatesGet,
      handleCandidatesPost: vi.fn(),
    });

    const route = await import("@/app/api/image-manager/candidates/route");
    const response = await route.GET(
      new Request(
        "http://localhost/api/image-manager/candidates?material=Blue%20Tiger%27s%20Eye&name=Blue%20Tiger%27s%20Eye%20Tasbih&limit=10",
      ) as never,
    );
    const payload = await response.json();

    expect(handleCandidatesGet).toHaveBeenCalledTimes(1);
    expect(payload.candidates[0]).toMatchObject({
      id: 21,
      original_path: "/vol1/1000/office/products/Pic/upload/tasbih/0325/blueredtiger33/main.jpg",
    });
  });
});
