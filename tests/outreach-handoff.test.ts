import { describe, expect, it } from "vitest";

import { prepareHumanHandoffReply } from "@/src/lib/lead-tools";
import { buildHumanHandoffItem } from "@/src/lib/outreach-handoff";
import type { OutreachLead, OutreachTask } from "@/src/lib/outreach-types";

function makeLead(): OutreachLead {
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

function makeTask(): OutreachTask {
  return {
    id: "camp_gulf_2026-lead-1-whatsapp",
    campaignId: "camp_gulf_2026",
    leadId: "website-inquiry-contact-noor-retail-group-1",
    channel: "whatsapp",
    variant: "personalized",
    status: "needs_human_followup",
    websiteUrl: "https://www.tranquilbeads.com",
    subject: null,
    body: "Hello, this is Nason from TranquilBeads.",
    recipientAddress: "+971559051926",
    attachmentImagePaths: [
      "/images/real-products/natural-kuka-wood/hero.jpeg",
      "/images/real-products/natural-kuka-wood/detail-1.jpeg",
    ],
    channelMessageId: "wa-thread-1",
    sentAt: "2026-03-29T12:00:00.000Z",
    lastReplyAt: "2026-03-29T12:05:00.000Z",
    needsHumanFollowup: true,
    failureReason: null,
  };
}

describe("outreach handoff", () => {
  it("builds a human handoff item from the original task and latest reply", () => {
    const handoff = buildHumanHandoffItem({
      lead: makeLead(),
      task: makeTask(),
      latestReply: {
        body: "Please send the catalog and MOQ details.",
        receivedAt: "2026-03-29T12:05:00.000Z",
        channelMessageId: "wa-thread-1",
      },
    });

    expect(handoff).toEqual({
      taskId: "camp_gulf_2026-lead-1-whatsapp",
      leadId: "website-inquiry-contact-noor-retail-group-1",
      channel: "whatsapp",
      sourceReference: "/contact",
      leadIdentity: {
        company: "Noor Retail Group",
        contactName: "Amina Noor",
        country: "UAE",
        sourceType: "website_inquiry",
      },
      latestReply: {
        body: "Please send the catalog and MOQ details.",
        receivedAt: "2026-03-29T12:05:00.000Z",
        channelMessageId: "wa-thread-1",
      },
      suggestedReply:
        "Hello Amina Noor, thanks for your reply. We can send the relevant catalog section and confirm MOQ, packaging, and lead time for Noor Retail Group.",
    });
  });

  it("prepares a concise human reply draft from the normalized inquiry payload", () => {
    const result = prepareHumanHandoffReply(
      {
        name: "Amina Noor",
        company: "Noor Retail Group",
        country: "UAE",
        contact: "amina@example.com",
        interest: "Tasbih",
        quantity: "500 pieces",
        message: "We want a premium sandalwood tasbih assortment.",
      },
      "Please send the catalog and MOQ details.",
    );

    expect(result.normalizedLead).toMatchObject({
      name: "Amina Noor",
      company: "Noor Retail Group",
      country: "UAE",
      contact: "amina@example.com",
      interest: "Tasbih",
      quantity: "500 pieces",
      message: "We want a premium sandalwood tasbih assortment.",
    });
    expect(result.suggestedReply).toBe(
      "Hello Amina Noor, thanks for your reply. We can send the relevant catalog section and confirm MOQ, packaging, and lead time for Noor Retail Group.",
    );
  });

  it("rejects a handoff when the task and lead ids do not match", () => {
    expect(() =>
      buildHumanHandoffItem({
        lead: makeLead(),
        task: {
          ...makeTask(),
          leadId: "different-lead-id",
        },
        latestReply: {
          body: "Please send the catalog and MOQ details.",
          receivedAt: "2026-03-29T12:05:00.000Z",
          channelMessageId: "wa-thread-1",
        },
      }),
    ).toThrow(/belong to lead/i);
  });
});
