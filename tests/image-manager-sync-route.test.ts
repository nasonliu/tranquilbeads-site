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
});
