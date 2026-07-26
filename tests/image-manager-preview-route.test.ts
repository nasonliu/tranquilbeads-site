import { beforeEach, describe, expect, it, vi } from "vitest";

describe("candidate preview route", () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); });

  it("does not read a candidate path when the resolver rejects it", async () => {
    const resolveCandidateImagePath = vi.fn(() => null);
    vi.doMock("@/src/lib/image-manager-candidates", () => ({ resolveCandidateImagePath }));
    const readFileSync = vi.fn();
    vi.doMock("fs", () => ({ __esModule: true, default: { readFileSync } }));
    const route = await import("@/app/api/image-manager/candidates/preview/route");
    const response = await route.GET(new Request("http://localhost/api/image-manager/candidates/preview?path=../../.env"));
    expect(response.status).toBe(404);
    expect(resolveCandidateImagePath).toHaveBeenCalledWith("../../.env");
    expect(readFileSync).not.toHaveBeenCalled();
  });
});
