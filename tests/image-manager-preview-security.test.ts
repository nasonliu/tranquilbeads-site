import { beforeEach, describe, expect, it, vi } from "vitest";

describe("image manager candidate preview path security", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("rejects traversal, dotfiles, outside absolute paths, and non-image extensions before filesystem access", async () => {
    const fsMock = { lstatSync: vi.fn(), realpathSync: vi.fn(), statSync: vi.fn() };
    vi.doMock("node:fs", () => ({ __esModule: true, default: fsMock }));
    const { resolveCandidateImagePath } = await import("@/src/lib/image-manager-candidates");

    for (const input of [
      "/vol1/1000/office/products/Pic/upload/../.env",
      "/vol1/1000/office/products/Pic/upload/.env",
      "/etc/passwd",
      "/vol1/1000/office/products/Pic/upload/amber/readme.txt",
    ]) expect(resolveCandidateImagePath(input)).toBeNull();
    expect(fsMock.lstatSync).not.toHaveBeenCalled();
  });

  it("requires a regular non-symlink file whose realpath remains inside the one allowed root", async () => {
    const root = "/Volumes/office/products/Pic/upload";
    const file = `${root}/amber/main.jpg`;
    const fsMock = {
      lstatSync: vi.fn(() => ({ isFile: () => false as boolean })),
      realpathSync: vi.fn((value: string) => value),
      statSync: vi.fn(() => ({ isFile: () => true })),
    };
    vi.doMock("node:fs", () => ({ __esModule: true, default: fsMock }));
    const { resolveCandidateImagePath } = await import("@/src/lib/image-manager-candidates");
    expect(resolveCandidateImagePath("/vol1/1000/office/products/Pic/upload/amber/main.jpg")).toBeNull();

    fsMock.lstatSync.mockReturnValue({ isFile: () => true as boolean });
    fsMock.realpathSync.mockImplementation((value: string) => value === file ? "/etc/passwd" : root);
    expect(resolveCandidateImagePath("/vol1/1000/office/products/Pic/upload/amber/main.jpg")).toBeNull();
  });
});
