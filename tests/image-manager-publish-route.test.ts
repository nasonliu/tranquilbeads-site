import { beforeEach, describe, expect, it, vi } from "vitest";

describe("image-manager publish route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.VERCEL;
  });

  it("previews publishable files and proposes a commit message", async () => {
    const execFileSync = vi.fn((command: string, args: string[]) => {
      if (command !== "git") {
        throw new Error(`unexpected command ${command}`);
      }

      if (args[0] === "status") {
        return [
          " M app/data/image-manager-products.json",
          " M src/data/site.ts",
          "?? public/images/imported/amber-set/hero.jpg",
        ].join("\n");
      }

      if (args[0] === "rev-parse") {
        return "main\n";
      }

      throw new Error(`unexpected args ${args.join(" ")}`);
    });

    vi.doMock("child_process", () => ({
      default: { execFileSync },
      execFileSync,
    }));

    const route = await import("@/app/api/image-manager/publish/route");
    const response = await route.GET();
    const payload = await response.json();

    expect(payload).toMatchObject({
      hasChanges: true,
      branch: "main",
      commitMessage: "chore: publish image-manager updates",
    });
    expect(payload.files).toEqual([
      { path: "app/data/image-manager-products.json", status: "modified" },
      { path: "src/data/site.ts", status: "modified" },
      { path: "public/images/imported/amber-set/hero.jpg", status: "untracked" },
    ]);
  });

  it("stages publishable files, commits, and pushes on confirm", async () => {
    const execFileSync = vi.fn((command: string, args: string[]) => {
      if (command !== "git") {
        if (command === "python3") {
          return JSON.stringify({
            success: true,
            added: 0,
            updated: 1,
            total: 1,
          });
        }
        throw new Error(`unexpected command ${command}`);
      }

      if (args[0] === "status") {
        return " M src/data/site.ts\n";
      }

      if (args[0] === "rev-parse" && args[1] === "--abbrev-ref") {
        return "main\n";
      }

      if (args[0] === "rev-parse" && args[1] === "HEAD") {
        return "abc123def456\n";
      }

      return "";
    });

    vi.doMock("child_process", () => ({
      default: { execFileSync },
      execFileSync,
    }));

    const route = await import("@/app/api/image-manager/publish/route");
    const response = await route.POST(
      new Request("http://localhost/api/image-manager/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commitMessage: "chore: publish image-manager updates" }),
      }) as never,
    );
    const payload = await response.json();

    expect(payload).toMatchObject({
      success: true,
      branch: "main",
      commitSha: "abc123def456",
      commitMessage: "chore: publish image-manager updates",
    });
    expect(execFileSync).toHaveBeenCalledWith(
      "python3",
      ["scripts/sync-products.py"],
      expect.any(Object),
    );
    expect(execFileSync).toHaveBeenCalledWith(
      "git",
      expect.arrayContaining(["add", "--"]),
      expect.any(Object),
    );
    expect(execFileSync).toHaveBeenCalledWith(
      "git",
      ["commit", "-m", "chore: publish image-manager updates"],
      expect.any(Object),
    );
    expect(execFileSync).toHaveBeenCalledWith(
      "git",
      ["push", "origin", "main"],
      expect.any(Object),
    );
  });
});
