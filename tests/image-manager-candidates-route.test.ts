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
  });

  it("returns ranked local image candidates", async () => {
    const execFileSync = vi.fn(() =>
      JSON.stringify([
        {
          id: 11,
          product_group: "GP-WOOD",
          material: "木",
          bead_count: "33",
          product_type: "",
          shot_type: "overview",
          source_folder: "1号店",
          filename_pattern: "main",
          original_path: "/vol1/1000/office/products/Pic/upload/wood/main.jpg",
        },
        {
          id: 12,
          product_group: "GP-AMBER",
          material: "琥珀",
          bead_count: "33",
          product_type: "",
          shot_type: "overview",
          source_folder: "1号店",
          filename_pattern: "main",
          original_path: "/vol1/1000/office/products/Pic/upload/amber/main.jpg",
        },
      ]),
    );

    vi.doMock("child_process", () => ({
      default: { execFileSync },
      execFileSync,
    }));

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
    const copyFileSync = vi.fn();
    const mkdirSync = vi.fn();
    const existsSync = vi.fn((target: string) => !target.endsWith("gift-product"));

    vi.doMock("fs", () => ({
      default: {
        existsSync,
        mkdirSync,
        copyFileSync,
      },
    }));

    const route = await import("@/app/api/image-manager/candidates/route");
    const response = await route.POST(
      jsonRequest({
        slug: "gift-product",
        originalPath: "/vol1/1000/office/products/Pic/upload/amber/main.jpg",
      }) as never,
    );
    const payload = await response.json();

    expect(mkdirSync).toHaveBeenCalled();
    expect(copyFileSync).toHaveBeenCalledWith(
      "/Volumes/office/products/Pic/upload/amber/main.jpg",
      expect.stringContaining("/public/images/imported/gift-product/"),
    );
    expect(payload.url).toMatch(/^\/images\/imported\/gift-product\/.+main\.jpg$/);
  });

  it("matches path and folder clues even when the material column is generic", async () => {
    const execFileSync = vi.fn(() =>
      JSON.stringify([
        {
          id: 21,
          product_group: "GP-TIGER",
          material: "其他",
          bead_count: "33",
          product_type: "",
          shot_type: "overview",
          source_folder: "0325",
          filename_pattern: "main",
          original_path: "/vol1/1000/office/products/Pic/upload/tasbih/0325/blueredtiger33/main.jpg",
        },
      ]),
    );

    vi.doMock("child_process", () => ({
      default: { execFileSync },
      execFileSync,
    }));

    const route = await import("@/app/api/image-manager/candidates/route");
    const response = await route.GET(
      new Request(
        "http://localhost/api/image-manager/candidates?material=Blue%20Tiger%27s%20Eye&name=Blue%20Tiger%27s%20Eye%20Tasbih&limit=10",
      ) as never,
    );
    const payload = await response.json();

    expect(execFileSync).toHaveBeenCalledTimes(1);
    expect(payload.candidates[0]).toMatchObject({
      id: 21,
      original_path: "/vol1/1000/office/products/Pic/upload/tasbih/0325/blueredtiger33/main.jpg",
    });
  });
});
