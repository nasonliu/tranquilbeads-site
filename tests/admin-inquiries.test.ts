import { describe, expect, it, vi } from "vitest";

import {
  createAdminInquiriesSessionToken,
  isAdminInquiriesConfigured,
  isValidAdminInquiriesPassword,
  isValidAdminInquiriesSession,
  listWebsiteInquiryLeads,
} from "@/src/lib/admin-inquiries";

const { readOutreachStore } = vi.hoisted(() => ({
  readOutreachStore: vi.fn(),
}));

vi.mock("@/src/lib/outreach-store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/lib/outreach-store")>();

  return {
    ...actual,
    readOutreachStore,
  };
});

describe("admin inquiries helpers", () => {
  it("requires a configured password before enabling the dashboard", () => {
    vi.stubEnv("ADMIN_INQUIRIES_PASSWORD", "");

    expect(isAdminInquiriesConfigured()).toBe(false);

    vi.stubEnv("ADMIN_INQUIRIES_PASSWORD", "long-enough-admin-password");

    expect(isAdminInquiriesConfigured()).toBe(true);

    vi.unstubAllEnvs();
  });

  it("validates password and session token without exposing the raw password", () => {
    vi.stubEnv("ADMIN_INQUIRIES_PASSWORD", "long-enough-admin-password");

    const token = createAdminInquiriesSessionToken();

    expect(token).not.toContain("long-enough-admin-password");
    expect(isValidAdminInquiriesPassword("long-enough-admin-password")).toBe(true);
    expect(isValidAdminInquiriesPassword("wrong-password")).toBe(false);
    expect(isValidAdminInquiriesSession(token)).toBe(true);
    expect(isValidAdminInquiriesSession("wrong-token")).toBe(false);

    vi.unstubAllEnvs();
  });

  it("returns website inquiry leads newest first", async () => {
    readOutreachStore.mockResolvedValue({
      leads: [
        {
          id: "obsidian-1",
          sourceType: "obsidian",
          sourcePath: "leads.md",
          company: "Old Lead",
          contactName: "",
          country: "",
          website: "",
          whatsapp: "",
          email: "",
          score: 10,
          notes: "",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "website-inquiry-old",
          sourceType: "website_inquiry",
          sourcePath: "/en/contact",
          company: "Older Buyer",
          contactName: "Amina",
          country: "UAE",
          website: "",
          whatsapp: "",
          email: "amina@example.com",
          score: 100,
          notes: "Older inquiry",
          createdAt: "2026-02-01T00:00:00.000Z",
          updatedAt: "2026-02-01T00:00:00.000Z",
        },
        {
          id: "website-inquiry-new",
          sourceType: "website_inquiry",
          sourcePath: "/en/contact",
          company: "New Buyer",
          contactName: "Noor",
          country: "SA",
          website: "",
          whatsapp: "",
          email: "noor@example.com",
          score: 100,
          notes: "Newest inquiry",
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-01T00:00:00.000Z",
        },
      ],
      campaigns: [],
      tasks: [],
      events: [],
      templates: [],
      suppressions: [],
    });

    const leads = await listWebsiteInquiryLeads();

    expect(leads).toHaveLength(2);
    expect(leads[0]).toMatchObject({
      id: "website-inquiry-new",
      company: "New Buyer",
    });
    expect(leads[1].id).toBe("website-inquiry-old");
  });
});
