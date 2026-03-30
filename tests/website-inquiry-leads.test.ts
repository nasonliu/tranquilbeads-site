import { describe, expect, it } from "vitest";

import { prepareLeadFollowUp, type InquiryLeadInput } from "@/src/lib/lead-tools";
import { normalizeWebsiteInquiryLead } from "@/src/lib/website-inquiry-leads";

describe("website inquiry leads", () => {
  it("normalizes inquiry payloads into shared outreach leads", () => {
    const lead = normalizeWebsiteInquiryLead(
      {
        name: "Amina Noor",
        company: "Noor Retail Group",
        country: "UAE",
        contact: "amina@example.com",
        interest: "Tasbih",
        quantity: "500 pieces",
        message: "We want a premium sandalwood tasbih assortment.",
      },
      "/contact",
    );

    expect(lead).toMatchObject({
      sourceType: "website_inquiry",
      sourcePath: "/contact",
      priorityTier: "high",
      company: "Noor Retail Group",
      contactName: "Amina Noor",
      country: "UAE",
      email: "amina@example.com",
      whatsapp: "",
      notes: "Interest: Tasbih. Estimated quantity: 500 pieces. We want a premium sandalwood tasbih assortment.",
    });
    expect(lead.score).toBe(100);
  });

  it("produces distinct ids for repeated website inquiries", () => {
    const first = normalizeWebsiteInquiryLead(
      {
        company: "TranquilBeads Sample",
      },
      "/contact",
    );
    const second = normalizeWebsiteInquiryLead(
      {
        company: "TranquilBeads Sample",
      },
      "/contact",
    );

    expect(first.id).toContain("website-inquiry");
    expect(second.id).toContain("website-inquiry");
    expect(first.id).not.toBe(second.id);
  });

  it("builds follow-up drafts from the normalized inquiry payload", () => {
    const accessCounts = {
      name: 0,
      company: 0,
      country: 0,
      contact: 0,
      interest: 0,
      quantity: 0,
      message: 0,
    };

    const lead = {
      get name() {
        accessCounts.name += 1;
        return "Amina Noor";
      },
      get company() {
        accessCounts.company += 1;
        return "Noor Retail Group";
      },
      get country() {
        accessCounts.country += 1;
        return "UAE";
      },
      get contact() {
        accessCounts.contact += 1;
        return "amina@example.com";
      },
      get interest() {
        accessCounts.interest += 1;
        return "Tasbih";
      },
      get quantity() {
        accessCounts.quantity += 1;
        return "500 pieces";
      },
      get message() {
        accessCounts.message += 1;
        return "We want a premium sandalwood tasbih assortment.";
      },
    } satisfies InquiryLeadInput;

    const result = prepareLeadFollowUp(lead);

    expect(result.normalizedLead).toMatchObject({
      name: "Amina Noor",
      company: "Noor Retail Group",
      country: "UAE",
      contact: "amina@example.com",
      interest: "Tasbih",
      quantity: "500 pieces",
      message: "We want a premium sandalwood tasbih assortment.",
    });
    expect(accessCounts).toEqual({
      name: 1,
      company: 1,
      country: 1,
      contact: 1,
      interest: 1,
      quantity: 1,
      message: 1,
    });
  });
});
