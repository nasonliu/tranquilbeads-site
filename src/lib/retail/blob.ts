type RetailBlobAuth =
  | { token: string; storeId: string }
  | { oidcToken: string; storeId: string };

export function getRetailBlobConfig(): { auth: RetailBlobAuth; hostname: string } {
  const token = process.env.RETAIL_BLOB_READ_WRITE_TOKEN;
  const oidcToken = process.env.VERCEL_OIDC_TOKEN;
  const storeId = process.env.RETAIL_BLOB_STORE_ID;
  const hostname = process.env.RETAIL_BLOB_HOSTNAME?.trim().toLowerCase();
  if (!storeId || !hostname) throw new Error("retail_blob_not_configured");

  let auth: RetailBlobAuth;
  if (token) {
    // @vercel/blob selects the store from a read-write token and otherwise
    // ignores storeId. Validate the token's embedded store id before any I/O.
    const tokenStoreId = token.split("_")[3] ?? "";
    const normalizedStoreId = storeId.startsWith("store_") ? storeId.slice("store_".length) : storeId;
    if (!tokenStoreId || tokenStoreId !== normalizedStoreId) throw new Error("retail_blob_store_mismatch");
    auth = { token, storeId };
  } else if (oidcToken) {
    auth = { oidcToken, storeId };
  } else {
    throw new Error("retail_blob_not_configured");
  }

  return { auth, hostname };
}

export function assertRetailBlobUrl(value: string, hostname: string): URL {
  let url: URL;
  try { url = new URL(value); }
  catch { throw new Error("retail_blob_url_invalid"); }
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.hostname.toLowerCase() !== hostname) {
    throw new Error("retail_blob_url_mismatch");
  }
  return url;
}
