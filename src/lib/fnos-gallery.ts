import crypto from "crypto";

import { readLocalConfig } from "@/src/lib/image-manager-local-config";

export const DEFAULT_FNOS_APP_ID = "EAECCF25-80A6-4666-A7C2-A76904A74AB6";
const DEFAULT_SEED = "NDzZTVxnRKP8Z0jXg1VAMonaG8akvh";
const MAX_FNOS_SCAN_ITEMS = 10000;
const RAW_IMAGE_EXTENSIONS = new Set([
  ".arw",
  ".cr2",
  ".cr3",
  ".dng",
  ".nef",
  ".nrw",
  ".orf",
  ".pef",
  ".raf",
  ".raw",
  ".rw2",
  ".sr2",
  ".srf",
  ".x3f",
]);
const NON_IMAGE_EXTENSIONS = new Set([
  ".3gp",
  ".avi",
  ".m4v",
  ".mkv",
  ".mov",
  ".mp4",
  ".mpeg",
  ".mpg",
  ".webm",
  ".wmv",
]);

export type FnosConfig = {
  baseUrl: string;
  token: string;
  secret: string;
};

export type FnosTimelineBucket = {
  year: number;
  month: number;
  day: number;
  itemCount: number;
};

export type FnosGalleryItem = {
  id: number;
  fileName: string;
  filePath: string;
  fileType: string;
  category: string;
  photoUUID: string;
  additional?: {
    thumbnail?: {
      mUrl?: string;
      sUrl?: string;
      xsUrl?: string;
      xxsUrl?: string;
      originalUrl?: string;
    };
  };
};

export type RankedFnosGalleryItem = FnosGalleryItem & {
  score: number;
  reasons: string[];
  previewPath: string;
  originalPath: string;
};

function isBrowsableImage(item: FnosGalleryItem) {
  const extension = item.fileName.includes(".")
    ? `.${item.fileName.split(".").pop()?.toLowerCase() || ""}`
    : "";
  const type = item.fileType.toLowerCase();

  return (
    !RAW_IMAGE_EXTENSIONS.has(extension) &&
    !RAW_IMAGE_EXTENSIONS.has(`.${type}`) &&
    !NON_IMAGE_EXTENSIONS.has(extension) &&
    !NON_IMAGE_EXTENSIONS.has(`.${type}`)
  );
}

function dedupeRankedItems(items: RankedFnosGalleryItem[]) {
  const uniqueItems: RankedFnosGalleryItem[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const key = `${item.id}:${item.filePath}:${item.originalPath}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueItems.push(item);
  }

  return uniqueItems;
}

function md5(value: string) {
  return crypto.createHash("md5").update(value).digest("hex");
}

function sortedQueryString(params: Record<string, string | number | undefined | null>) {
  const searchParams = new URLSearchParams();
  for (const key of Object.keys(params).sort()) {
    const value = params[key];
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  }

  return searchParams.toString().replace(/\+/g, "%20");
}

function hashPayload(rawValue = "") {
  try {
    const safeValue = rawValue.replace(/%(?![0-9A-Fa-f]{2})/g, "%25");
    return md5(decodeURIComponent(safeValue));
  } catch {
    return md5(rawValue);
  }
}

export function buildFnosAuthX(
  request: {
    method?: string;
    url: string;
    params?: Record<string, string | number | undefined | null>;
    data?: unknown;
  },
  options?: {
    appId?: string;
    nonce?: string;
    timestamp?: string;
  },
) {
  const isGet = (request.method || "GET").toUpperCase() === "GET";
  const [path, rawQuery] = request.url.split("?");
  const queryParams: Record<string, string> = {};

  if (rawQuery) {
    for (const piece of rawQuery.split("&")) {
      const [key, value] = piece.split("=");
      if (value !== "undefined" && value !== "null") {
        queryParams[key] = value || "";
      }
    }
  }

  const payload = isGet
    ? sortedQueryString({ ...request.params, ...queryParams })
    : request.data
      ? JSON.stringify(request.data)
      : "";
  const payloadHash = hashPayload(payload);
  const nonce = options?.nonce || String(Math.round(Math.random() * 900000 + 100000)).padStart(6, "0");
  const timestamp = options?.timestamp || String(Date.now());
  const source = [
    DEFAULT_SEED,
    path,
    nonce,
    timestamp,
    payloadHash,
    options?.appId || DEFAULT_FNOS_APP_ID,
  ].join("_");

  return `nonce=${nonce}&timestamp=${timestamp}&sign=${md5(source)}`;
}

export function getFnosConfig() {
  const config = readLocalConfig();
  const baseUrl = config.fnosBaseUrl?.trim().replace(/\/$/, "") || "";
  const token = config.fnosToken?.trim() || "";
  const secret = config.fnosSecret?.trim() || "";

  if (!baseUrl || !token || !secret) {
    return null;
  }

  return { baseUrl, token, secret } satisfies FnosConfig;
}

export async function fnosRequest<T>(
  config: FnosConfig,
  request: {
    method?: string;
    path: string;
    params?: Record<string, string | number | undefined | null>;
    data?: unknown;
    accept?: string;
  },
) {
  const method = (request.method || "GET").toUpperCase();
  const url = new URL(`${config.baseUrl}${request.path}`);
  if (request.params) {
    for (const [key, value] of Object.entries(request.params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const response = await fetch(url, {
    method,
    headers: {
      Accept: request.accept || "application/json",
      AccessToken: config.token,
      authx: buildFnosAuthX({
        method,
        url: request.path,
        params: request.params,
        data: request.data,
      }),
      ...(request.data ? { "Content-Type": "application/json" } : {}),
    },
    body: request.data ? JSON.stringify(request.data) : undefined,
    cache: "no-store",
  });

  return response as Response & { json(): Promise<T> };
}

function formatBucketDate(bucket: FnosTimelineBucket, boundary: "start" | "end") {
  const month = String(bucket.month).padStart(2, "0");
  const day = String(bucket.day).padStart(2, "0");
  return `${bucket.year}:${month}:${day} ${boundary === "start" ? "00:00:00" : "23:59:59"}`;
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function materialAliases(material: string) {
  const tokens = new Set(tokenize(material));
  const lower = material.toLowerCase();

  if (lower.includes("amber") || material.includes("琥珀")) {
    ["amber", "琥珀", "baltic"].forEach((token) => tokens.add(token));
  }
  if (lower.includes("hematite") || material.includes("赤铁")) {
    ["hematite", "赤铁", "hematite-series"].forEach((token) => tokens.add(token));
  }
  if (lower.includes("kuka")) {
    ["kuka", "wood", "kuka-wood"].forEach((token) => tokens.add(token));
  }
  if (lower.includes("oud")) {
    ["oud", "agarwood", "沉香"].forEach((token) => tokens.add(token));
  }

  return [...tokens];
}

export function rankFnosGalleryItems(
  items: FnosGalleryItem[],
  target: {
    material?: string;
    name?: string;
  },
) {
  const materialTokens = materialAliases(target.material || "");
  const nameTokens = tokenize(target.name || "");

  return items
    .map((item) => {
      const haystack = `${item.fileName} ${item.filePath}`.toLowerCase();
      let score = 0;
      const reasons: string[] = [];

      for (const token of materialTokens) {
        if (token && haystack.includes(token.toLowerCase())) {
          score += 12;
          reasons.push(`材质:${token}`);
        }
      }

      for (const token of nameTokens) {
        if (token && token.length > 2 && haystack.includes(token)) {
          score += 6;
          reasons.push(`名称:${token}`);
        }
      }

      if (/main|hero|overview|cover/.test(haystack)) {
        score += 4;
        reasons.push("主图");
      }

      if (/tasbih|beads|pendant|gift/.test(haystack)) {
        score += 2;
      }

      const previewPath =
        item.additional?.thumbnail?.sUrl ||
        item.additional?.thumbnail?.mUrl ||
        item.additional?.thumbnail?.xsUrl ||
        item.additional?.thumbnail?.originalUrl ||
        "";
      const originalPath = item.additional?.thumbnail?.originalUrl || previewPath;

      return {
        ...item,
        score,
        reasons: reasons.slice(0, 4),
        previewPath,
        originalPath,
      } satisfies RankedFnosGalleryItem;
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return left.filePath.localeCompare(right.filePath);
    });
}

export async function listFnosGalleryItems(
  config: FnosConfig,
  target: {
    material?: string;
    name?: string;
    limit?: number;
    offset?: number;
  },
) {
  const timelineResponse = await fnosRequest<{ code: number; data?: { list?: FnosTimelineBucket[] } }>(config, {
    path: "/p/api/v1/gallery/timeline",
  });
  const timelinePayload = await timelineResponse.json();
  const buckets = timelinePayload.data?.list || [];
  const collected: FnosGalleryItem[] = [];
  const limit = Math.max(1, target.limit || 48);
  const offset = Math.max(0, target.offset || 0);
  let ranked: RankedFnosGalleryItem[] = [];

  for (const bucket of buckets) {
    for (let bucketOffset = 0; bucketOffset < bucket.itemCount; bucketOffset += 48) {
      const response = await fnosRequest<{ code: number; data?: { list?: FnosGalleryItem[] } }>(config, {
        path: "/p/api/v1/gallery/getList",
        params: {
          start_time: formatBucketDate(bucket, "start"),
          end_time: formatBucketDate(bucket, "end"),
          limit: Math.min(bucket.itemCount - bucketOffset, 48),
          offset: bucketOffset,
          mode: "index",
        },
      });
      const payload = await response.json();
      const batch = (payload.data?.list || []).filter(isBrowsableImage);
      collected.push(...batch);
      ranked = dedupeRankedItems(rankFnosGalleryItems(collected, target));

      if (batch.length < 48) {
        break;
      }

      if (collected.length >= MAX_FNOS_SCAN_ITEMS) {
        break;
      }
    }

    if (collected.length >= MAX_FNOS_SCAN_ITEMS) {
      break;
    }
  }

  const resolved = ranked.length > 0
    ? ranked
    : dedupeRankedItems(rankFnosGalleryItems(collected, target));
  return resolved.slice(offset, offset + limit);
}
