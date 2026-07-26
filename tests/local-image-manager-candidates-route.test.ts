import { beforeEach, describe, expect, it, vi } from "vitest";

describe("local image-manager candidate import", () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); });

  it("refuses an unresolvable originalPath before copyFileSync", async () => {
    const resolveCandidateImagePath = vi.fn(() => null);
    const copyFileSync = vi.fn();
    vi.doMock("@/src/lib/image-manager-candidates", () => ({
      buildBroadCandidateQuerySql: vi.fn(), buildCandidateQuerySql: vi.fn(), rankCandidateImages: vi.fn(), resolveCandidateImagePath,
    }));
    vi.doMock("fs", () => ({ __esModule: true, default: { copyFileSync, existsSync: vi.fn(), mkdirSync: vi.fn() } }));
    const { handleCandidatesPost } = await import("@/src/lib/local-image-manager-candidates-route");
    const response = await handleCandidatesPost(new Request("http://localhost", {
      method: "POST", body: JSON.stringify({ slug: "amber", originalPath: "/etc/passwd" }), headers: { "content-type": "application/json" },
    }) as never);
    expect(response.status).toBe(404);
    expect(resolveCandidateImagePath).toHaveBeenCalledWith("/etc/passwd");
    expect(copyFileSync).not.toHaveBeenCalled();
  });
});
