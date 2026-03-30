import { describe, expect, it } from "vitest";

import { createEmptyOutreachStore, persistOutreachTaskBundle } from "@/src/lib/outreach-store";
import type { OutreachLead } from "@/src/lib/outreach-types";
import {
  buildOutreachTaskBundle,
  sortOutreachLeadsForTaskCreation,
} from "@/src/lib/outreach-task-factory";

function makeWebsiteInquiryLead(): OutreachLead {
  return {
    id: "website-inquiry-contact-noor-retail-group-1",
    sourceType: "website_inquiry",
    sourcePath: "/contact",
    priorityTier: "high",
    company: "Noor Retail Group",
    contactName: "Amina Noor",
    country: "UAE",
    website: "",
    whatsapp: "",
    email: "amina@example.com",
    score: 100,
    notes: "Interest: Tasbih. Estimated quantity: 500 pieces.",
    createdAt: "2026-03-29T00:00:00.000Z",
    updatedAt: "2026-03-29T00:00:00.000Z",
  };
}

function makeObsidianLead(): OutreachLead {
  return {
    id: "uae-1-beads-elegant-gift-trading-llc",
    sourceType: "obsidian",
    sourcePath: "/Users/nason/Documents/Obsidian Vault/United_Arab_Emirates_Tasbih_Leads_2026-03-19.md",
    company: "Beads Elegant Gift Trading LLC",
    contactName: "",
    country: "United Arab Emirates",
    website: "https://www.beadselegant.com/",
    whatsapp: "+971 55 905 1926",
    email: "",
    score: 100,
    notes: "Good match for premium Ramadan and gift-channel selling.",
    createdAt: "2026-03-19T00:00:00.000Z",
    updatedAt: "2026-03-19T00:00:00.000Z",
  };
}

describe("outreach task factory", () => {
  it("builds distinct WhatsApp and email tasks from one lead", () => {
    const bundle = buildOutreachTaskBundle({
      lead: makeWebsiteInquiryLead(),
      campaignId: "camp_gulf_2026",
      websiteUrl: "https://www.tranquilbeads.com",
      locale: "en",
    });

    expect(bundle.draftTasks).toHaveLength(2);
    expect(bundle.queuedTasks).toHaveLength(2);
    expect(bundle.draftTasks[0].id).not.toBe(bundle.draftTasks[1].id);
    expect(bundle.queuedTasks[0].id).not.toBe(bundle.queuedTasks[1].id);
    expect(bundle.queuedTasks[0].status).toBe("queued");
    expect(bundle.queuedTasks[0].body).toContain("Noor Retail Group");
    expect(bundle.queuedTasks[0].body).toContain("https://www.tranquilbeads.com");
    expect(bundle.queuedTasks[0].recipientAddress).toBe("");
    expect(bundle.queuedTasks[1].recipientAddress).toBe("amina@example.com");
    expect(bundle.queuedTasks[0].attachmentImagePaths).toEqual([
      "/images/real-products/natural-kuka-wood/hero.jpeg",
      "/images/real-products/natural-kuka-wood/detail-1.jpeg",
    ]);
    expect(bundle.queuedTasks[1].subject).toBe(
      "Premium Tasbih Collection for Noor Retail Group",
    );
    expect(bundle.events).toHaveLength(2);
    expect(bundle.events.map((event) => event.taskId)).toEqual([
      bundle.queuedTasks[0].id,
      bundle.queuedTasks[1].id,
    ]);
  });

  it("defaults Arabic-market leads to Arabic copy when no locale override is provided", () => {
    const bundle = buildOutreachTaskBundle({
      lead: makeObsidianLead(),
      campaignId: "camp_gulf_2026",
      websiteUrl: "https://www.tranquilbeads.com",
    });

    expect(bundle.queuedTasks[0].body).toContain("مرحبًا");
    expect(bundle.queuedTasks[0].recipientAddress).toBe("+971 55 905 1926");
    expect(bundle.queuedTasks[1].body).toContain("أنا Nason من TranquilBeads");
    expect(bundle.queuedTasks[1].recipientAddress).toBe("");
  });

  it("sorts website inquiry leads ahead of obsidian cold leads", () => {
    const sorted = sortOutreachLeadsForTaskCreation([
      makeObsidianLead(),
      makeWebsiteInquiryLead(),
    ]);

    expect(sorted[0].sourceType).toBe("website_inquiry");
    expect(sorted[1].sourceType).toBe("obsidian");
  });

  it("persists draft and queued task records with matching creation events", () => {
    const bundle = buildOutreachTaskBundle({
      lead: makeWebsiteInquiryLead(),
      campaignId: "camp_gulf_2026",
      websiteUrl: "https://www.tranquilbeads.com",
      locale: "en",
    });

    const draftedStore = persistOutreachTaskBundle(
      createEmptyOutreachStore(),
      bundle,
      "draft",
    );

    expect(draftedStore.tasks).toHaveLength(2);
    expect(draftedStore.tasks.every((task) => task.status === "draft")).toBe(true);
    expect(draftedStore.events).toHaveLength(2);
    expect(draftedStore.events.every((event) => event.type === "task_created")).toBe(true);

    const queuedStore = persistOutreachTaskBundle(draftedStore, bundle, "queued");

    expect(queuedStore.tasks).toHaveLength(2);
    expect(queuedStore.tasks.every((task) => task.status === "queued")).toBe(true);
    expect(queuedStore.events).toHaveLength(2);
  });
});
