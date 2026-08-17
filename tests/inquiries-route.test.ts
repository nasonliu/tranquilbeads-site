import { beforeEach, describe, expect, it, vi } from "vitest";

const { readOutreachStore, writeOutreachStore } = vi.hoisted(() => ({
  readOutreachStore: vi.fn(),
  writeOutreachStore: vi.fn(),
}));

import { POST } from "@/app/api/inquiries/route";
import { createEmptyOutreachStore } from "@/src/lib/outreach-store";

vi.mock("@/src/lib/outreach-store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/lib/outreach-store")>();

  return {
    ...actual,
    readOutreachStore,
    writeOutreachStore,
  };
});

describe("inquiries route", () => {
  beforeEach(() => {
    readOutreachStore.mockReset();
    writeOutreachStore.mockReset();
    readOutreachStore.mockResolvedValue(createEmptyOutreachStore());
  });

  it("stores valid inquiry submissions as website inquiry leads", async () => {
    const request = new Request("https://www.tranquilbeads.com/api/inquiries", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        referer: "https://www.tranquilbeads.com/en/contact",
      },
      body: JSON.stringify({
        name: "Amina Noor",
        company: "Noor Retail Group",
        country: "UAE",
        contact: "amina@example.com",
        interest: "Tasbih",
        quantity: "500 pieces",
        message: "Please send your premium tasbih assortment.",
        sourcePath: "/en/contact",
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload).toMatchObject({ ok: true });
    expect(writeOutreachStore).toHaveBeenCalledWith(
      expect.objectContaining({
        leads: [
          expect.objectContaining({
            sourceType: "website_inquiry",
            sourcePath: "/en/contact",
            company: "Noor Retail Group",
            contactName: "Amina Noor",
            email: "amina@example.com",
            notes: expect.stringContaining("Tasbih"),
          }),
        ],
      }),
    );
  });

  it("rejects missing required fields", async () => {
    const request = new Request("https://www.tranquilbeads.com/api/inquiries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        company: "Noor Retail Group",
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      errors: expect.objectContaining({
        name: "required",
        contact: "required",
        message: "required",
      }),
    });
    expect(writeOutreachStore).not.toHaveBeenCalled();
  });
});
