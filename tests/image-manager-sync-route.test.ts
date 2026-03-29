import { beforeEach, describe, expect, it, vi } from "vitest";

describe("image-manager sync route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns structured sync counts from the python script output", async () => {
    const execSync = vi.fn(() =>
      JSON.stringify({
        success: true,
        added: 2,
        updated: 3,
        total: 5,
        message: "sync ok",
      }),
    );

    vi.doMock("child_process", () => ({
      default: { execSync },
      execSync,
    }));

    vi.doMock("next/cache", () => ({
      revalidatePath: vi.fn(),
    }));

    const route = await import("@/app/api/image-manager/sync/route");
    const response = await route.POST();
    const payload = await response.json();

    expect(payload).toMatchObject({
      success: true,
      added: 2,
      updated: 3,
      total: 5,
      message: "sync ok",
    });
  });

  it("revalidates localized collection and product routes discovered from image-manager data", async () => {
    const execSync = vi.fn(() =>
      JSON.stringify({
        success: true,
        added: 0,
        updated: 1,
        total: 1,
      }),
    );
    const revalidatePath = vi.fn();
    const fsMock = {
      existsSync: vi.fn((target: string) =>
        target.endsWith("src/data/site.ts") || target.endsWith("app/data/image-manager-products.json"),
      ),
      readFileSync: vi.fn((target: string) => {
        if (target.endsWith("src/data/site.ts")) {
          return "export const products: Product[] = [];\nexport const contactFormCopy = {};\n";
        }

        if (target.endsWith("app/data/image-manager-products.json")) {
          return JSON.stringify([
            {
              slug: "baltic-amber-gift-set",
              collections: ["gift-sets", "premium"],
            },
          ]);
        }

        return "";
      }),
      writeFileSync: vi.fn(),
    };

    vi.doMock("child_process", () => ({
      default: { execSync },
      execSync,
    }));
    vi.doMock("next/cache", () => ({
      revalidatePath,
    }));
    vi.doMock("fs", () => ({
      __esModule: true,
      default: fsMock,
    }));

    const route = await import("@/app/api/image-manager/sync/route");
    await route.POST();

    expect(revalidatePath).toHaveBeenCalledWith("/en/collections/gift-sets");
    expect(revalidatePath).toHaveBeenCalledWith("/ar/collections/gift-sets");
    expect(revalidatePath).toHaveBeenCalledWith("/en/collections/gift-sets/baltic-amber-gift-set");
    expect(revalidatePath).toHaveBeenCalledWith("/ar/collections/gift-sets/baltic-amber-gift-set");
  });
});
