// @vitest-environment node
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  put: vi.fn(),
}));

vi.mock("@vercel/blob", () => ({ put: mocks.put }));

import { POST } from "@/app/api/internal/amazon-listing-images/route";

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const publicKeyDer = publicKey.export({ type: "spki", format: "der" }).toString("base64");
const nowSeconds = 2_000_000_000;
const body = Buffer.from("real amber prayer beads image bytes");
const digest = createHash("sha256").update(body).digest("hex");

type SignedRequestOptions = {
  body?: Buffer;
  candidateId?: string;
  contentLength?: number;
  digest?: string;
  mimeType?: string;
  sellerSku?: string;
  signature?: string;
  timestamp?: number;
};

function signedRequest(options: SignedRequestOptions = {}) {
  const requestBody = options.body ?? body;
  const timestamp = options.timestamp ?? nowSeconds;
  const sellerSku = options.sellerSku ?? "TBP-000082-001";
  const candidateId = options.candidateId ?? "lic_7e8e7c14ad4a417dbe0935b06eefc782";
  const mimeType = options.mimeType ?? "image/jpeg";
  const contentLength = options.contentLength ?? requestBody.byteLength;
  const declaredDigest = options.digest ?? createHash("sha256").update(requestBody).digest("hex");
  const canonical = [timestamp, sellerSku, candidateId, mimeType, contentLength, declaredDigest].join("\n");
  const signature = options.signature ?? sign(null, Buffer.from(canonical), privateKey).toString("base64");

  return new Request("https://tranquilbeads.example/api/internal/amazon-listing-images", {
    method: "POST",
    headers: {
      "content-type": mimeType,
      "content-length": String(contentLength),
      "x-ppcme-candidate-id": candidateId,
      "x-ppcme-content-sha256": declaredDigest,
      "x-ppcme-seller-sku": sellerSku,
      "x-ppcme-signature": signature,
      "x-ppcme-timestamp": String(timestamp),
    },
    body: requestBody,
  });
}

describe("Amazon listing image upload", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(Date, "now").mockReturnValue(nowSeconds * 1000);
    process.env.PPCME_IMAGE_UPLOAD_ED25519_PUBLIC_KEY = publicKeyDer;
    process.env.RETAIL_BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_store123_secret";
    process.env.RETAIL_BLOB_STORE_ID = "store123";
    process.env.RETAIL_BLOB_HOSTNAME = "store123.public.blob.vercel-storage.com";
    mocks.put.mockResolvedValue({
      url: `https://public.blob.vercel-storage.com/amazon-listings/TBP-000082-001/${digest}.jpg`,
      pathname: `amazon-listings/TBP-000082-001/${digest}.jpg`,
      etag: "etag-1",
      downloadUrl: "must-not-leak",
      contentType: "image/jpeg",
    });
  });

  it("accepts an Ed25519-signed JPEG and returns only the public publication receipt", async () => {
    const response = await POST(signedRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      url: `https://public.blob.vercel-storage.com/amazon-listings/TBP-000082-001/${digest}.jpg`,
      pathname: `amazon-listings/TBP-000082-001/${digest}.jpg`,
      etag: "etag-1",
      sha256: digest,
      byteCount: body.byteLength,
    });
    expect(mocks.put).toHaveBeenCalledWith(
      `amazon-listings/TBP-000082-001/${digest}.jpg`,
      expect.any(Uint8Array),
      {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "image/jpeg",
        token: "vercel_blob_rw_store123_secret",
        storeId: "store123",
      },
    );
  });

  it("rejects an invalid signature before writing a blob", async () => {
    const request = signedRequest({ signature: Buffer.alloc(64).toString("base64") });
    const arrayBuffer = vi.spyOn(request, "arrayBuffer");

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(arrayBuffer).not.toHaveBeenCalled();
    expect(mocks.put).not.toHaveBeenCalled();
  });

  it("rejects a configured public key that is not Ed25519 before writing a blob", async () => {
    const { publicKey: rsaPublicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    process.env.PPCME_IMAGE_UPLOAD_ED25519_PUBLIC_KEY = rsaPublicKey
      .export({ type: "spki", format: "der" })
      .toString("base64");

    const response = await POST(signedRequest());

    expect(response.status).toBe(503);
    expect(mocks.put).not.toHaveBeenCalled();
  });

  it("rejects a timestamp more than five minutes old", async () => {
    const response = await POST(signedRequest({ timestamp: nowSeconds - 301 }));

    expect(response.status).toBe(401);
    expect(mocks.put).not.toHaveBeenCalled();
  });

  it("rejects when the server-computed body digest differs from the signed digest", async () => {
    const response = await POST(signedRequest({ digest: "a".repeat(64) }));

    expect(response.status).toBe(400);
    expect(mocks.put).not.toHaveBeenCalled();
  });

  it.each(["image/gif", "application/octet-stream"])("rejects unsupported MIME %s", async (mimeType) => {
    const response = await POST(signedRequest({ mimeType }));

    expect(response.status).toBe(415);
    expect(mocks.put).not.toHaveBeenCalled();
  });

  it("accepts an image exactly at the 4.5 MB ingress-safe boundary", async () => {
    const boundaryBody = Buffer.alloc(4_500_000, 7);

    const response = await POST(signedRequest({ body: boundaryBody }));

    expect(response.status).toBe(200);
    expect(mocks.put).toHaveBeenCalledOnce();
  });

  it("rejects a declared payload over 4.5 MB without reading or storing it", async () => {
    const request = signedRequest({ contentLength: 4_500_001 });
    const arrayBuffer = vi.spyOn(request, "arrayBuffer");

    const response = await POST(request);

    expect(response.status).toBe(413);
    expect(arrayBuffer).not.toHaveBeenCalled();
    expect(mocks.put).not.toHaveBeenCalled();
  });

  it.each([
    { sellerSku: "../escape" },
    { sellerSku: "sku/child" },
    { candidateId: "../../candidate" },
    { candidateId: "candidate id" },
  ])("rejects unsafe identifiers: $sellerSku$candidateId", async (options) => {
    const response = await POST(signedRequest(options));

    expect(response.status).toBe(400);
    expect(mocks.put).not.toHaveBeenCalled();
  });

  it("uses the same deterministic pathname for repeated SKU and digest uploads", async () => {
    const first = await POST(signedRequest());
    const second = await POST(signedRequest());

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const firstPayload = await first.json();
    const secondPayload = await second.json();
    expect(firstPayload.pathname).toBe(secondPayload.pathname);
    expect(mocks.put).toHaveBeenCalledTimes(2);
    expect(mocks.put.mock.calls[0]?.[0]).toBe(mocks.put.mock.calls[1]?.[0]);
  });
});
