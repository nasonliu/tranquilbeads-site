type RetailBlobAuth =
  | { token: string; storeId: string }
  | { oidcToken: string; storeId: string };

const VERCEL_PUBLIC_BLOB_SUFFIX = ".public.blob.vercel-storage.com";

function normalizeStoreId(value: string): string {
  const trimmed = value.trim();
  return trimmed.startsWith("store_") ? trimmed.slice("store_".length) : trimmed;
}

function expectedPublicHostname(storeId: string): string {
  // Vercel store IDs are case-sensitive credential identifiers, while their
  // DNS hostname is always lower-case. Keep the original ID for token binding
  // and normalize only the hostname label.
  return `${normalizeStoreId(storeId).toLowerCase()}${VERCEL_PUBLIC_BLOB_SUFFIX}`;
}

function configuredPublicHostname(value: string | undefined): string | null {
  const hostname = value?.trim().toLowerCase();
  if (!hostname || hostname.includes(":") || hostname.includes("/") || hostname !== hostname.replace(/\.+$/, "")) return null;
  return hostname;
}

export function getRetailBlobConfig(): { auth: RetailBlobAuth; hostname: string } {
  const token = process.env.RETAIL_BLOB_READ_WRITE_TOKEN;
  const oidcToken = process.env.VERCEL_OIDC_TOKEN;
  const storeId = process.env.RETAIL_BLOB_STORE_ID;
  const hostname = configuredPublicHostname(process.env.RETAIL_BLOB_HOSTNAME);
  if (!storeId || !hostname) throw new Error("retail_blob_not_configured");
  const normalizedStoreId = normalizeStoreId(storeId);
  if (!normalizedStoreId || hostname !== expectedPublicHostname(normalizedStoreId)) {
    throw new Error("retail_blob_hostname_store_mismatch");
  }

  let auth: RetailBlobAuth;
  if (token) {
    // @vercel/blob selects the store from a read-write token and otherwise
    // ignores storeId. Validate the token's embedded store id before any I/O.
    const tokenStoreId = token.split("_")[3] ?? "";
    if (!tokenStoreId || tokenStoreId !== normalizedStoreId) throw new Error("retail_blob_store_mismatch");
    auth = { token, storeId: normalizedStoreId };
  } else if (oidcToken) {
    auth = { oidcToken, storeId: normalizedStoreId };
  } else {
    throw new Error("retail_blob_not_configured");
  }

  return { auth, hostname };
}

/**
 * Configuration-only readiness check for a public health endpoint.  It never
 * returns credentials, token-derived identifiers, or raw configuration errors.
 */
export function isRetailBlobConfigured(): boolean {
  try {
    getRetailBlobConfig();
    return true;
  } catch {
    return false;
  }
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
