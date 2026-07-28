// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const actor = { id: "owner-a", name: "Owner A", role: "owner" as const, legacy: false };
const productId = "00000000-0000-4000-8000-000000000001";
const idempotencyKey = "00000000-0000-4000-8000-000000000002";
const imageId = "00000000-0000-4000-8000-000000000003";
const blobUrl = "https://store.public.blob.vercel-storage.com/retail/products/test.jpg";

const mocks = vi.hoisted(() => ({
  requireRetailPermission: vi.fn(), assertSameOrigin: vi.fn(), put: vi.fn(), del: vi.fn(),
  getRetailBlobConfig: vi.fn(), assertRetailBlobUrl: vi.fn(), validateRetailImage: vi.fn(),
  attachRetailProductImage: vi.fn(), detachRetailProductImage: vi.fn(), findRetailProductImageByIdempotency: vi.fn(),
  listRetailBlobDeleteOutbox: vi.fn(), markRetailBlobDeleteOutbox: vi.fn(), queueRetailBlobDelete: vi.fn(), reorderRetailProductMedia: vi.fn(),
}));

vi.mock("@/src/lib/retail/admin-auth", () => ({ requireRetailPermission: mocks.requireRetailPermission, assertSameOrigin: mocks.assertSameOrigin }));
vi.mock("@vercel/blob", () => ({ put: mocks.put, del: mocks.del }));
vi.mock("@/src/lib/retail/blob", () => ({ getRetailBlobConfig: mocks.getRetailBlobConfig, assertRetailBlobUrl: mocks.assertRetailBlobUrl }));
vi.mock("@/src/lib/retail/upload-validation", () => ({ validateRetailImage: mocks.validateRetailImage }));
vi.mock("@/src/lib/retail/operations", async () => {
  const actual = await vi.importActual<typeof import("@/src/lib/retail/operations")>("@/src/lib/retail/operations");
  return { ...actual,
    attachRetailProductImage: mocks.attachRetailProductImage, detachRetailProductImage: mocks.detachRetailProductImage,
    findRetailProductImageByIdempotency: mocks.findRetailProductImageByIdempotency,
    listRetailBlobDeleteOutbox: mocks.listRetailBlobDeleteOutbox, markRetailBlobDeleteOutbox: mocks.markRetailBlobDeleteOutbox,
    queueRetailBlobDelete: mocks.queueRetailBlobDelete, reorderRetailProductMedia: mocks.reorderRetailProductMedia,
  };
});

import { POST } from "@/app/api/admin/retail/media/route";

describe("retail admin media route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireRetailPermission.mockResolvedValue(actor);
    mocks.assertSameOrigin.mockResolvedValue(undefined);
    mocks.findRetailProductImageByIdempotency.mockResolvedValue(undefined);
    mocks.getRetailBlobConfig.mockReturnValue({ hostname: "store.public.blob.vercel-storage.com", auth: { token: "test" } });
    mocks.validateRetailImage.mockResolvedValue({ bytes: new Uint8Array([1, 2, 3]), mime: "image/jpeg", extension: "jpg", sha256: "a".repeat(64) });
    mocks.put.mockResolvedValue({ url: blobUrl });
    mocks.attachRetailProductImage.mockResolvedValue({ id: imageId, blob_url: blobUrl, replayed: false });
  });

  it("passes the authenticated actor through form and Blob awaits to the DB image wrapper", async () => {
    const form = new FormData();
    form.set("productId", productId); form.set("idempotencyKey", idempotencyKey);
    form.set("altEn", "Retail test image"); form.set("altAr", "صورة اختبار");
    form.set("file", new File([new Uint8Array([1, 2, 3])], "test.jpg", { type: "image/jpeg" }));

    const response = await POST(new Request("https://preview.example/api/admin/retail/media", { method: "POST", headers: { origin: "https://preview.example" }, body: form }));

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ ok: true, image: { id: imageId, url: blobUrl } });
    expect(mocks.attachRetailProductImage).toHaveBeenCalledWith(productId, {
      url: blobUrl, key: `retail/products/${productId}/${idempotencyKey}-${"a".repeat(64)}.jpg`, mime: "image/jpeg", bytes: 3,
      sha256: "a".repeat(64), altEn: "Retail test image", altAr: "صورة اختبار", idempotencyKey,
    }, actor);
  });
});
