import { beforeEach, describe, expect, it, vi } from "vitest";

describe("image-manager fnos route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.VERCEL;
  });

  it("returns ranked fnos gallery candidates", async () => {
    vi.doMock("@/src/lib/image-manager-local-config", () => ({
      readLocalConfig: () => ({
        fnosBaseUrl: "http://nas.local:5666",
        fnosToken: "token-123",
        fnosSecret: "secret-123",
      }),
    }));

    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.includes("/gallery/timeline")) {
        return new Response(JSON.stringify({
          code: 0,
          data: {
            list: [
              { year: 2026, month: 3, day: 27, itemCount: 2 },
            ],
          },
        }), { status: 200 });
      }

      if (url.includes("/gallery/getList")) {
        return new Response(JSON.stringify({
          code: 0,
          data: {
            list: [
              {
                id: 23536,
                fileName: "size2.jpg",
                filePath: "/vol1/1000/office/catalog/tasbih/Hematite series/size2.jpg",
                fileType: "jpeg",
                category: "photo",
                photoUUID: "uuid-hema",
                additional: {
                  thumbnail: {
                    sUrl: "/p/api/v1/stream/p/t/23536/s/uuid-hema",
                    originalUrl: "/p/api/v1/stream/p/t/23536/o/uuid-hema",
                  },
                },
              },
              {
                id: 23537,
                fileName: "amber-main.jpg",
                filePath: "/vol1/1000/office/catalog/tasbih/Amber series/amber-main.jpg",
                fileType: "jpeg",
                category: "photo",
                photoUUID: "uuid-amber",
                additional: {
                  thumbnail: {
                    sUrl: "/p/api/v1/stream/p/t/23537/s/uuid-amber",
                    originalUrl: "/p/api/v1/stream/p/t/23537/o/uuid-amber",
                  },
                },
              },
            ],
          },
        }), { status: 200 });
      }

      return new Response("not found", { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock);

    const route = await import("@/app/api/image-manager/fnos/route");
    const response = await route.GET(
      new Request("http://localhost/api/image-manager/fnos?material=Amber&name=Baltic%20Amber%20Gift%20Set"),
    );
    const payload = await response.json();

    expect(payload.connected).toBe(true);
    expect(payload.items[0]).toMatchObject({
      id: 23537,
      filePath: expect.stringContaining("Amber series"),
      previewUrl: "/api/image-manager/fnos/preview?path=%2Fp%2Fapi%2Fv1%2Fstream%2Fp%2Ft%2F23537%2Fs%2Fuuid-amber",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
