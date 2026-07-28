import { readFileSync } from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

import { assertRetailBlobUrl, getRetailBlobConfig, isRetailBlobConfigured } from "@/src/lib/retail/blob";

const read = (path: string) => readFileSync(path, "utf8");

describe("retail Blob isolation", () => {
  const routes = [
    "app/api/admin/retail/media/route.ts",
    "app/api/admin/retail/media/outbox/route.ts",
  ];

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects a read-write token for a different store", () => {
    vi.stubEnv("RETAIL_BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_wrong_secret");
    vi.stubEnv("RETAIL_BLOB_STORE_ID", "store_retail");
    vi.stubEnv("RETAIL_BLOB_HOSTNAME", "retail.public.blob.vercel-storage.com");
    expect(() => getRetailBlobConfig()).toThrow("retail_blob_store_mismatch");
  });

  it("accepts normalized store ids and rejects cross-store delete URLs", () => {
    vi.stubEnv("RETAIL_BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_retail_secret");
    vi.stubEnv("RETAIL_BLOB_STORE_ID", "store_retail");
    vi.stubEnv("RETAIL_BLOB_HOSTNAME", "retail.public.blob.vercel-storage.com");
    const config = getRetailBlobConfig();
    expect(config.auth).toMatchObject({ storeId: "retail" });
    expect(() => assertRetailBlobUrl("https://outreach.public.blob.vercel-storage.com/file.jpg", config.hostname)).toThrow("retail_blob_url_mismatch");
  });

  it("maps mixed-case Vercel store ids to lower-case DNS hostnames without weakening token binding", () => {
    vi.stubEnv("RETAIL_BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_d9xXrHN8Mf6uXkhp_secret");
    vi.stubEnv("RETAIL_BLOB_STORE_ID", "store_d9xXrHN8Mf6uXkhp");
    vi.stubEnv("RETAIL_BLOB_HOSTNAME", "d9xxrhn8mf6uxkhp.public.blob.vercel-storage.com");

    expect(getRetailBlobConfig()).toEqual({
      auth: { token: "vercel_blob_rw_d9xXrHN8Mf6uXkhp_secret", storeId: "d9xXrHN8Mf6uXkhp" },
      hostname: "d9xxrhn8mf6uxkhp.public.blob.vercel-storage.com",
    });
    expect(isRetailBlobConfigured()).toBe(true);
  });

  it("requires the configured public hostname to be the exact hostname generated for the retail store", () => {
    vi.stubEnv("RETAIL_BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_retail_secret");
    vi.stubEnv("RETAIL_BLOB_STORE_ID", "store_retail");
    vi.stubEnv("RETAIL_BLOB_HOSTNAME", "outreach.public.blob.vercel-storage.com");
    expect(() => getRetailBlobConfig()).toThrow("retail_blob_hostname_store_mismatch");
    expect(isRetailBlobConfigured()).toBe(false);
  });

  it("rejects a hostname that is not a bare Vercel public Blob hostname", () => {
    vi.stubEnv("RETAIL_BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_retail_secret");
    vi.stubEnv("RETAIL_BLOB_STORE_ID", "store_retail");
    vi.stubEnv("RETAIL_BLOB_HOSTNAME", "https://retail.public.blob.vercel-storage.com");
    expect(() => getRetailBlobConfig()).toThrow("retail_blob_not_configured");
  });

  it("supports Vercel OIDC without falling back to the outreach token", () => {
    vi.stubEnv("RETAIL_BLOB_READ_WRITE_TOKEN", "");
    vi.stubEnv("VERCEL_OIDC_TOKEN", "oidc-token");
    vi.stubEnv("RETAIL_BLOB_STORE_ID", "store_retail");
    vi.stubEnv("RETAIL_BLOB_HOSTNAME", "retail.public.blob.vercel-storage.com");
    expect(getRetailBlobConfig().auth).toEqual({ oidcToken: "oidc-token", storeId: "retail" });
  });

  it("uses only the dedicated retail Blob credentials for all media writes and deletes", () => {
    for (const route of routes) {
      const source = read(route);
      expect(source).not.toContain("process.env.BLOB_READ_WRITE_TOKEN");
      expect(source).toContain("getRetailBlobConfig()");
      expect(source).toContain("assertRetailBlobUrl");
    }
  });

  it("documents the dedicated retail Blob store without repurposing the outreach token", () => {
    const environment = read(".env.local.example");
    expect(environment).toContain("RETAIL_BLOB_READ_WRITE_TOKEN");
    expect(environment).toContain("RETAIL_BLOB_STORE_ID");
    expect(environment).toContain("RETAIL_BLOB_HOSTNAME");
    expect(environment).toContain("BLOB_READ_WRITE_TOKEN here");
  });
});
