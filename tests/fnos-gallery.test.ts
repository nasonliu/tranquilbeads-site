import { describe, expect, it } from "vitest";

import {
  DEFAULT_FNOS_APP_ID,
  buildFnosAuthX,
  listFnosGalleryItems,
  rankFnosGalleryItems,
} from "@/src/lib/fnos-gallery";

describe("fnos gallery helpers", () => {
  it("builds authx with sorted params and md5 signing", () => {
    const authx = buildFnosAuthX(
      {
        method: "GET",
        url: "/p/api/v1/gallery/getList",
        params: {
          limit: 32,
          offset: 0,
          end_time: "2026:03:27 23:59:59",
          start_time: "2026:03:27 00:00:00",
          mode: "index",
        },
      },
      {
        appId: DEFAULT_FNOS_APP_ID,
        nonce: "123456",
        timestamp: "1774771200000",
      },
    );

    expect(authx).toBe(
      "nonce=123456&timestamp=1774771200000&sign=17cf7945f52ac294565ef3f115743839",
    );
  });

  it("ranks closer material matches ahead of generic photos", () => {
    const ranked = rankFnosGalleryItems(
      [
        {
          id: 1,
          fileName: "random.jpg",
          filePath: "/vol1/1000/office/catalog/misc/random.jpg",
          fileType: "jpeg",
          category: "photo",
          photoUUID: "uuid-1",
          additional: {
            thumbnail: {
              sUrl: "/p/api/v1/stream/p/t/1/s/uuid-1",
              originalUrl: "/p/api/v1/stream/p/t/1/o/uuid-1",
            },
          },
        },
        {
          id: 2,
          fileName: "amber-main.jpg",
          filePath: "/vol1/1000/office/catalog/tasbih/Amber series/amber-main.jpg",
          fileType: "jpeg",
          category: "photo",
          photoUUID: "uuid-2",
          additional: {
            thumbnail: {
              sUrl: "/p/api/v1/stream/p/t/2/s/uuid-2",
              originalUrl: "/p/api/v1/stream/p/t/2/o/uuid-2",
            },
          },
        },
      ],
      {
        material: "Amber",
        name: "Baltic Amber Gift Set",
      },
    );

    expect(ranked[0]?.id).toBe(2);
    expect(ranked[0]?.reasons.join(" ")).toContain("材质");
  });

  it("filters out raw camera files from browse results", async () => {
    const originalFetch = global.fetch;
    global.fetch = (async (input: string | URL) => {
      const url = String(input);
      if (url.includes("/gallery/timeline")) {
        return new Response(JSON.stringify({
          code: 0,
          data: {
            list: [
              { year: 2026, month: 3, day: 27, itemCount: 3 },
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
                id: 1,
                fileName: "amber-main.jpg",
                filePath: "/vol1/1000/office/catalog/tasbih/Amber series/amber-main.jpg",
                fileType: "jpeg",
                category: "photo",
                photoUUID: "uuid-1",
                additional: {
                  thumbnail: {
                    sUrl: "/p/api/v1/stream/p/t/1/s/uuid-1",
                    originalUrl: "/p/api/v1/stream/p/t/1/o/uuid-1",
                  },
                },
              },
              {
                id: 2,
                fileName: "amber-raw.arw",
                filePath: "/vol1/1000/office/catalog/tasbih/Amber series/amber-raw.arw",
                fileType: "arw",
                category: "photo",
                photoUUID: "uuid-2",
                additional: {
                  thumbnail: {
                    sUrl: "/p/api/v1/stream/p/t/2/s/uuid-2",
                    originalUrl: "/p/api/v1/stream/p/t/2/o/uuid-2",
                  },
                },
              },
              {
                id: 3,
                fileName: "amber-edit.dng",
                filePath: "/vol1/1000/office/catalog/tasbih/Amber series/amber-edit.dng",
                fileType: "dng",
                category: "photo",
                photoUUID: "uuid-3",
                additional: {
                  thumbnail: {
                    sUrl: "/p/api/v1/stream/p/t/3/s/uuid-3",
                    originalUrl: "/p/api/v1/stream/p/t/3/o/uuid-3",
                  },
                },
              },
              {
                id: 4,
                fileName: "amber-reel.mp4",
                filePath: "/vol1/1000/office/catalog/tasbih/Amber series/amber-reel.mp4",
                fileType: "mp4",
                category: "photo",
                photoUUID: "uuid-4",
                additional: {
                  thumbnail: {
                    sUrl: "/p/api/v1/stream/p/t/4/s/uuid-4",
                    originalUrl: "/p/api/v1/stream/p/t/4/o/uuid-4",
                  },
                },
              },
            ],
          },
        }), { status: 200 });
      }

      return new Response("not found", { status: 404 });
    }) as typeof fetch;

    try {
      const paged = await listFnosGalleryItems(
        {
          baseUrl: "http://nas.local:5666",
          token: "token-123",
          secret: "secret-123",
        },
        {
          material: "Amber",
          name: "Baltic Amber Gift Set",
          limit: 10,
          offset: 0,
        },
      );

      expect(paged.map((item) => item.fileName)).toEqual(["amber-main.jpg"]);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("supports offset-based pagination for gallery browsing", async () => {
    const originalFetch = global.fetch;
    global.fetch = (async (input: string | URL) => {
      const url = String(input);
      if (url.includes("/gallery/timeline")) {
        return new Response(JSON.stringify({
          code: 0,
          data: {
            list: [
              { year: 2026, month: 3, day: 27, itemCount: 3 },
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
                id: 1,
                fileName: "amber-main.jpg",
                filePath: "/vol1/1000/office/catalog/tasbih/Amber series/amber-main.jpg",
                fileType: "jpeg",
                category: "photo",
                photoUUID: "uuid-1",
                additional: {
                  thumbnail: {
                    sUrl: "/p/api/v1/stream/p/t/1/s/uuid-1",
                    originalUrl: "/p/api/v1/stream/p/t/1/o/uuid-1",
                  },
                },
              },
              {
                id: 2,
                fileName: "amber-side.jpg",
                filePath: "/vol1/1000/office/catalog/tasbih/Amber series/amber-side.jpg",
                fileType: "jpeg",
                category: "photo",
                photoUUID: "uuid-2",
                additional: {
                  thumbnail: {
                    sUrl: "/p/api/v1/stream/p/t/2/s/uuid-2",
                    originalUrl: "/p/api/v1/stream/p/t/2/o/uuid-2",
                  },
                },
              },
              {
                id: 3,
                fileName: "amber-detail.jpg",
                filePath: "/vol1/1000/office/catalog/tasbih/Amber series/amber-detail.jpg",
                fileType: "jpeg",
                category: "photo",
                photoUUID: "uuid-3",
                additional: {
                  thumbnail: {
                    sUrl: "/p/api/v1/stream/p/t/3/s/uuid-3",
                    originalUrl: "/p/api/v1/stream/p/t/3/o/uuid-3",
                  },
                },
              },
            ],
          },
        }), { status: 200 });
      }

      return new Response("not found", { status: 404 });
    }) as typeof fetch;

    try {
      const paged = await listFnosGalleryItems(
        {
          baseUrl: "http://nas.local:5666",
          token: "token-123",
          secret: "secret-123",
        },
        {
          material: "Amber",
          name: "Baltic Amber Gift Set",
          limit: 2,
          offset: 1,
        },
      );

      expect(paged).toHaveLength(2);
      expect(paged.map((item) => item.id)).toEqual(expect.arrayContaining([2, 3]));
      expect(paged.map((item) => item.id)).not.toContain(1);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("keeps paging within a busy timeline bucket so browsing is not capped at 48 items", async () => {
    const originalFetch = global.fetch;
    const offsets: number[] = [];
    global.fetch = (async (input: string | URL) => {
      const url = new URL(String(input));
      if (url.pathname.includes("/gallery/timeline")) {
        return new Response(JSON.stringify({
          code: 0,
          data: {
            list: [
              { year: 2026, month: 3, day: 27, itemCount: 120 },
            ],
          },
        }), { status: 200 });
      }

      if (url.pathname.includes("/gallery/getList")) {
        const offset = Number(url.searchParams.get("offset") || "0");
        offsets.push(offset);
        const startId = offset + 1;
        const list = Array.from({ length: 48 }, (_, index) => {
          const id = startId + index;
          return {
            id,
            fileName: `amber-${id}.jpg`,
            filePath: `/vol1/1000/office/catalog/tasbih/Amber series/amber-${id}.jpg`,
            fileType: "jpeg",
            category: "photo",
            photoUUID: `uuid-${id}`,
            additional: {
              thumbnail: {
                sUrl: `/p/api/v1/stream/p/t/${id}/s/uuid-${id}`,
                originalUrl: `/p/api/v1/stream/p/t/${id}/o/uuid-${id}`,
              },
            },
          };
        });

        return new Response(JSON.stringify({
          code: 0,
          data: { list },
        }), { status: 200 });
      }

      return new Response("not found", { status: 404 });
    }) as typeof fetch;

    try {
      const paged = await listFnosGalleryItems(
        {
          baseUrl: "http://nas.local:5666",
          token: "token-123",
          secret: "secret-123",
        },
        {
          material: "Amber",
          name: "Baltic Amber Gift Set",
          limit: 60,
          offset: 0,
        },
      );

      expect(paged).toHaveLength(60);
      expect(offsets).toEqual(expect.arrayContaining([0, 48]));
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("deduplicates repeated gallery items before slicing pages", async () => {
    const originalFetch = global.fetch;
    global.fetch = (async (input: string | URL) => {
      const url = new URL(String(input));
      if (url.pathname.includes("/gallery/timeline")) {
        return new Response(JSON.stringify({
          code: 0,
          data: {
            list: [
              { year: 2026, month: 3, day: 27, itemCount: 96 },
            ],
          },
        }), { status: 200 });
      }

      if (url.pathname.includes("/gallery/getList")) {
        const offset = Number(url.searchParams.get("offset") || "0");
        const base = Array.from({ length: 48 }, (_, index) => {
          const id = index + 1;
          return {
            id,
            fileName: `amber-${id}.jpg`,
            filePath: `/vol1/1000/office/catalog/tasbih/Amber series/amber-${id}.jpg`,
            fileType: "jpeg",
            category: "photo",
            photoUUID: `uuid-${id}`,
            additional: {
              thumbnail: {
                sUrl: `/p/api/v1/stream/p/t/${id}/s/uuid-${id}`,
                originalUrl: `/p/api/v1/stream/p/t/${id}/o/uuid-${id}`,
              },
            },
          };
        });

        const list = offset === 0
          ? base
          : [
              ...base.slice(0, 24),
              ...Array.from({ length: 24 }, (_, index) => {
                const id = 49 + index;
                return {
                  id,
                  fileName: `amber-${id}.jpg`,
                  filePath: `/vol1/1000/office/catalog/tasbih/Amber series/amber-${id}.jpg`,
                  fileType: "jpeg",
                  category: "photo",
                  photoUUID: `uuid-${id}`,
                  additional: {
                    thumbnail: {
                      sUrl: `/p/api/v1/stream/p/t/${id}/s/uuid-${id}`,
                      originalUrl: `/p/api/v1/stream/p/t/${id}/o/uuid-${id}`,
                    },
                  },
                };
              }),
            ];

        return new Response(JSON.stringify({
          code: 0,
          data: { list },
        }), { status: 200 });
      }

      return new Response("not found", { status: 404 });
    }) as typeof fetch;

    try {
      const paged = await listFnosGalleryItems(
        {
          baseUrl: "http://nas.local:5666",
          token: "token-123",
          secret: "secret-123",
        },
        {
          material: "Amber",
          name: "Baltic Amber Gift Set",
          limit: 60,
          offset: 0,
        },
      );

      const ids = paged.map((item) => item.id);
      expect(new Set(ids).size).toBe(60);
      expect(ids).toContain(63);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("scans beyond the first 18 timeline buckets so full-gallery browsing can continue", async () => {
    const originalFetch = global.fetch;
    const bucketCalls: number[] = [];
    global.fetch = (async (input: string | URL) => {
      const url = new URL(String(input));
      if (url.pathname.includes("/gallery/timeline")) {
        return new Response(JSON.stringify({
          code: 0,
          data: {
            list: Array.from({ length: 25 }, (_, index) => ({
              year: 2026,
              month: 3,
              day: index + 1,
              itemCount: 1,
            })),
          },
        }), { status: 200 });
      }

      if (url.pathname.includes("/gallery/getList")) {
        const start = url.searchParams.get("start_time") || "";
        const day = Number(start.split(":")[2]?.slice(0, 2) || "0");
        bucketCalls.push(day);
        return new Response(JSON.stringify({
          code: 0,
          data: {
            list: [
              {
                id: day,
                fileName: `file-${day}.jpg`,
                filePath: `/vol1/1000/office/all/file-${day}.jpg`,
                fileType: "jpeg",
                category: "photo",
                photoUUID: `uuid-${day}`,
                additional: {
                  thumbnail: {
                    sUrl: `/p/api/v1/stream/p/t/${day}/s/uuid-${day}`,
                    originalUrl: `/p/api/v1/stream/p/t/${day}/o/uuid-${day}`,
                  },
                },
              },
            ],
          },
        }), { status: 200 });
      }

      return new Response("not found", { status: 404 });
    }) as typeof fetch;

    try {
      const paged = await listFnosGalleryItems(
        {
          baseUrl: "http://nas.local:5666",
          token: "token-123",
          secret: "secret-123",
        },
        {
          material: "",
          name: "",
          limit: 25,
          offset: 0,
        },
      );

      expect(paged).toHaveLength(25);
      expect(bucketCalls).toHaveLength(25);
      expect(bucketCalls).toContain(25);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
