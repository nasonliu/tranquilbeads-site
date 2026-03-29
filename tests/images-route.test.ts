import { beforeEach, describe, expect, it, vi } from "vitest";

describe("images api", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("lists imported folders and top-level static image files", async () => {
    const fsMock = {
      existsSync: vi.fn((target: string) =>
        target.includes("public/images/imported") || target.includes("public/images"),
      ),
      mkdirSync: vi.fn(),
      readdirSync: vi.fn((target: string, options?: { withFileTypes?: boolean }) => {
        const withFileTypes = options?.withFileTypes;
        if (target.endsWith("public/images/imported")) {
          return withFileTypes
            ? [
                { name: "amber-set", isDirectory: () => true, isFile: () => false },
              ]
            : [];
        }

        if (target.endsWith("public/images/imported/amber-set")) {
          return withFileTypes
            ? [
                { name: "1.jpg", isDirectory: () => false, isFile: () => true },
                { name: "2.webp", isDirectory: () => false, isFile: () => true },
              ]
            : [];
        }

        if (target.endsWith("public/images")) {
          return withFileTypes
            ? [
                { name: "hero.jpg", isDirectory: () => false, isFile: () => true },
                { name: "factory", isDirectory: () => true, isFile: () => false },
                { name: "logo.svg", isDirectory: () => false, isFile: () => true },
                { name: "README.md", isDirectory: () => false, isFile: () => true },
              ]
            : [];
        }

        return [];
      }),
      writeFileSync: vi.fn(),
    };

    vi.doMock("fs", () => ({
      __esModule: true,
      default: fsMock,
    }));

    const route = await import("@/app/api/images/route");
    const response = await route.GET();
    const payload = await response.json();

    expect(payload).toEqual({
      folders: {
        "amber-set": [
          "/images/imported/amber-set/1.jpg",
          "/images/imported/amber-set/2.webp",
        ],
      },
      staticFiles: ["/images/hero.jpg", "/images/logo.svg"],
    });
  });

  it("uploads a file into the product import directory and returns a public url", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-29T10:00:00Z"));

    const fsMock = {
      existsSync: vi.fn(() => false),
      mkdirSync: vi.fn(),
      readdirSync: vi.fn(),
      writeFileSync: vi.fn(),
    };

    vi.doMock("fs", () => ({
      __esModule: true,
      default: fsMock,
    }));

    const route = await import("@/app/api/images/route");
    const formData = new FormData();
    formData.append("slug", "Amber Gift Set");
    formData.append(
      "file",
      new File(["image-bytes"], "Amber Hero.JPG", { type: "image/jpeg" }),
      "Amber Hero.JPG",
    );
    const request = new Request("http://localhost/api/images", {
      method: "POST",
      body: formData,
    });

    const response = await route.POST(request as never);
    const payload = await response.json();

    expect(payload.url).toMatch(
      /^\/images\/imported\/amber-gift-set\/1774778400000-(amber-hero|blob)\.jpg$/,
    );
    expect(fsMock.mkdirSync).toHaveBeenCalledWith(
      expect.stringContaining("public/images/imported/amber-gift-set"),
      { recursive: true },
    );
    expect(fsMock.writeFileSync).toHaveBeenCalledWith(
      expect.stringMatching(
        /public\/images\/imported\/amber-gift-set\/1774778400000-(amber-hero|blob)\.jpg$/,
      ),
      expect.any(Buffer),
    );

    vi.useRealTimers();
  });
});
