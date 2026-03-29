import { beforeEach, describe, expect, it, vi } from "vitest";

describe("image-manager config route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.VERCEL;
  });

  it("returns masked github token status and repo info", async () => {
    const fsMock = {
      existsSync: vi.fn(() => true),
      readFileSync: vi.fn(() => JSON.stringify({ githubToken: "ghp_1234567890abcdef" })),
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

    const route = await import("@/app/api/image-manager/config/route");
    const response = await route.GET();
    const payload = await response.json();

    expect(payload).toMatchObject({
      hasGithubToken: true,
      githubTokenMask: "ghp_...cdef",
      repo: "nasonliu/tranquilbeads-site",
    });
  });

  it("saves the github token to local config", async () => {
    let stored = "{}";
    const fsMock = {
      existsSync: vi.fn(() => true),
      readFileSync: vi.fn(() => stored),
      writeFileSync: vi.fn((_path: string, contents: string) => {
        stored = contents;
      }),
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

    const route = await import("@/app/api/image-manager/config/route");
    const response = await route.POST(
      new Request("http://localhost/api/image-manager/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubToken: "ghp_savedtoken1234" }),
      }) as never,
    );
    const payload = await response.json();

    expect(payload).toMatchObject({
      success: true,
      hasGithubToken: true,
      githubTokenMask: "ghp_...1234",
    });
    expect(JSON.parse(stored)).toMatchObject({
      githubToken: "ghp_savedtoken1234",
    });
  });

  it("tests github auth with the provided token", async () => {
    const fsMock = {
      existsSync: vi.fn(() => false),
      readFileSync: vi.fn(),
      writeFileSync: vi.fn(),
      mkdirSync: vi.fn(),
    };
    const execFileSync = vi.fn(() => "https://github.com/nasonliu/tranquilbeads-site.git\n");
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ login: "nasonliu" }), { status: 200 }),
    );

    vi.doMock("fs", () => ({
      __esModule: true,
      default: fsMock,
    }));
    vi.doMock("child_process", () => ({
      default: { execFileSync },
      execFileSync,
    }));
    vi.stubGlobal("fetch", fetchMock);

    const route = await import("@/app/api/image-manager/config/route");
    const response = await route.POST(
      new Request("http://localhost/api/image-manager/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test", githubToken: "ghp_testtoken9999" }),
      }) as never,
    );
    const payload = await response.json();

    expect(payload).toMatchObject({
      success: true,
      login: "nasonliu",
    });
  });
});
