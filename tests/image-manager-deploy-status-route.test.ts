import { beforeEach, describe, expect, it, vi } from "vitest";

describe("image-manager deploy status route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.VERCEL;
  });

  it("reports a ready vercel deployment from github checks", async () => {
    const fsMock = {
      existsSync: vi.fn(() => true),
      readFileSync: vi.fn(() => JSON.stringify({ githubToken: "ghp_abcdef123456" })),
      writeFileSync: vi.fn(),
      mkdirSync: vi.fn(),
    };
    const execFileSync = vi.fn(() => "https://github.com/nasonliu/tranquilbeads-site.git\n");
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/commits/abc123/check-runs")) {
        return new Response(JSON.stringify({
          check_runs: [
            {
              name: "Vercel",
              status: "completed",
              conclusion: "success",
              details_url: "https://vercel.com/tranquilbeads/tranquilbeads-site/deployments/abc123",
            },
          ],
        }), { status: 200 });
      }

      if (url.includes("/commits/abc123/status")) {
        return new Response(JSON.stringify({
          state: "success",
          statuses: [
            {
              context: "Vercel",
              state: "success",
              target_url: "https://www.tranquilbeads.com",
            },
          ],
        }), { status: 200 });
      }

      return new Response("not found", { status: 404 });
    });

    vi.doMock("fs", () => ({
      __esModule: true,
      default: fsMock,
    }));
    vi.doMock("child_process", () => ({
      default: { execFileSync },
      execFileSync,
    }));
    vi.stubGlobal("fetch", fetchMock);

    const route = await import("@/app/api/image-manager/deploy-status/route");
    const response = await route.GET(
      new Request("http://localhost/api/image-manager/deploy-status?sha=abc123") as never,
    );
    const payload = await response.json();

    expect(payload).toMatchObject({
      state: "ready",
      repo: "nasonliu/tranquilbeads-site",
      commitSha: "abc123",
      deploymentUrl: "https://vercel.com/tranquilbeads/tranquilbeads-site/deployments/abc123",
      productionUrl: "https://www.tranquilbeads.com",
    });
  });

  it("returns not_configured when no github token is saved", async () => {
    const fsMock = {
      existsSync: vi.fn(() => false),
      readFileSync: vi.fn(),
      writeFileSync: vi.fn(),
      mkdirSync: vi.fn(),
    };
    const execFileSync = vi.fn(() => "https://github.com/nasonliu/tranquilbeads-site.git\n");

    vi.doMock("fs", () => ({
      __esModule: true,
      default: fsMock,
    }));
    vi.doMock("child_process", () => ({
      default: { execFileSync },
      execFileSync,
    }));

    const route = await import("@/app/api/image-manager/deploy-status/route");
    const response = await route.GET(
      new Request("http://localhost/api/image-manager/deploy-status?sha=abc123") as never,
    );
    const payload = await response.json();

    expect(payload).toMatchObject({
      state: "not_configured",
      repo: "nasonliu/tranquilbeads-site",
      commitSha: "abc123",
    });
  });
});
