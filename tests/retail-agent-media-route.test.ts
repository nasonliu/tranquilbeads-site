// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const actor = { id: "catalog-a", name: "Catalog agent", role: "operations" as const, legacy: false };
const imageId = "00000000-0000-4000-8000-000000000003";
const blobUrl = "https://store.public.blob.vercel-storage.com/retail/products/test.jpg";
const mocks = vi.hoisted(() => ({
  requireRetailAgentPermission: vi.fn(), uploadRetailProductImage: vi.fn(), deleteRetailProductImage: vi.fn(), reorderRetailProductImages: vi.fn(),
  retailMediaError: vi.fn(() => "invalid_request"), retailMediaStatus: vi.fn(() => 400),
}));

vi.mock("@/src/lib/retail/agent-auth", () => ({ requireRetailAgentPermission: mocks.requireRetailAgentPermission }));
vi.mock("@/src/lib/retail/media-service", () => ({
  uploadRetailProductImage: mocks.uploadRetailProductImage, deleteRetailProductImage: mocks.deleteRetailProductImage,
  reorderRetailProductImages: mocks.reorderRetailProductImages, retailMediaError: mocks.retailMediaError, retailMediaStatus: mocks.retailMediaStatus,
}));

import { DELETE, GET, PATCH, POST } from "@/app/api/agent/retail/media/route";

describe("retail agent media route", () => {
  afterEach(() => vi.unstubAllEnvs());
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireRetailAgentPermission.mockReturnValue(actor);
    mocks.uploadRetailProductImage.mockResolvedValue({ image: { id: imageId, url: blobUrl }, replayed: false, created: true });
    mocks.deleteRetailProductImage.mockResolvedValue({ deleted: true, replayed: false, removedReferences: true });
    mocks.reorderRetailProductImages.mockResolvedValue({ mediaVersion: 2, imageIds: [imageId], replayed: false });
  });

  it("reports whether the write and production switches currently allow media mutations", async () => {
    vi.stubEnv("RETAIL_AGENT_CATALOG_WRITE_ENABLED", "true");
    vi.stubEnv("VERCEL_ENV", "preview");
    const response = await GET(new Request("https://preview.example/api/agent/retail/media", { headers: { authorization: "Bearer agent" } }));
    expect(await response.json()).toEqual({ ok: true, capabilities: { upload: true, delete: true, reorder: true } });
    expect(mocks.requireRetailAgentPermission).toHaveBeenCalledWith(expect.any(Request), "products:write");

    vi.stubEnv("RETAIL_AGENT_CATALOG_WRITE_ENABLED", "false");
    const disabled = await GET(new Request("https://preview.example/api/agent/retail/media", { headers: { authorization: "Bearer agent" } }));
    expect(await disabled.json()).toEqual({ ok: true, capabilities: { upload: false, delete: false, reorder: false } });
  });

  it("uses the machine actor for multipart upload, reference-aware delete, and reorder", async () => {
    const upload = await POST(new Request("https://preview.example/api/agent/retail/media", { method: "POST", headers: { authorization: "Bearer agent" }, body: new FormData() }));
    expect(upload.status).toBe(201);
    expect(mocks.uploadRetailProductImage).toHaveBeenCalledWith(expect.any(Request), actor);

    const remove = await DELETE(new Request("https://preview.example/api/agent/retail/media", { method: "DELETE", headers: { authorization: "Bearer agent", "content-type": "application/json" }, body: JSON.stringify({ imageId, removeReferences: true, idempotencyKey: "00000000-0000-4000-8000-000000000002" }) }));
    expect(await remove.json()).toMatchObject({ ok: true, deleted: true, removedReferences: true });
    expect(mocks.deleteRetailProductImage).toHaveBeenCalledWith(expect.objectContaining({ imageId, removeReferences: true }), actor);

    const reorder = await PATCH(new Request("https://preview.example/api/agent/retail/media", { method: "PATCH", headers: { authorization: "Bearer agent", "content-type": "application/json" }, body: JSON.stringify({}) }));
    expect(await reorder.json()).toMatchObject({ ok: true, mediaVersion: 2 });
    expect(mocks.reorderRetailProductImages).toHaveBeenCalledWith({}, actor);
    expect(mocks.requireRetailAgentPermission).toHaveBeenCalledWith(expect.any(Request), "products:write", true);
  });
});
