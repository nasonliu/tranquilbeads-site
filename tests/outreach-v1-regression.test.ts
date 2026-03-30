import { describe, expect, it } from "vitest";

import { createWhatsAppOutreachSender } from "@/src/lib/whatsapp-outreach";
import { processQueuedOutreachTasks } from "@/src/lib/outreach-orchestrator";
import { ingestWhatsAppReply } from "@/src/lib/outreach-replies";
import { createEmptyOutreachStore } from "@/src/lib/outreach-store";
import { buildOutreachTaskBundle } from "@/src/lib/outreach-task-factory";
import type { OutreachLead, OutreachStore } from "@/src/lib/outreach-types";

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
    whatsapp: "+971559051926",
    email: "amina@example.com",
    score: 100,
    notes: "Interest: Tasbih. Estimated quantity: 500 pieces.",
    createdAt: "2026-03-29T00:00:00.000Z",
    updatedAt: "2026-03-29T00:00:00.000Z",
  };
}

describe("outreach v1 regression", () => {
  it("does not auto-send a second-touch message after a reply has moved the task to human follow-up", async () => {
    const lead = makeLead();
    const bundle = buildOutreachTaskBundle({
      lead,
      campaignId: "camp_gulf_2026",
      websiteUrl: "https://www.tranquilbeads.com",
      locale: "en",
    });

    const sentStore: OutreachStore = {
      ...createEmptyOutreachStore(),
      leads: [lead],
      tasks: bundle.queuedTasks,
      events: bundle.events,
    };

    const sentResult = await processQueuedOutreachTasks(sentStore, {
      whatsapp: createWhatsAppOutreachSender(async (task) => `wa:${task.id}`),
    });

    const sentTask = sentResult.store.tasks.find(
      (task) => task.channel === "whatsapp",
    );

    const repliedStore = ingestWhatsAppReply(sentResult.store, {
      channelMessageId: sentTask?.channelMessageId ?? "",
      body: "Please send the catalog and MOQ details.",
      receivedAt: "2026-03-29T12:05:00.000Z",
    });

    const sendCalls: string[] = [];
    const secondPass = await processQueuedOutreachTasks(repliedStore, {
      whatsapp: createWhatsAppOutreachSender(async (task) => {
        sendCalls.push(task.id);
        return `wa:${task.id}:second-touch`;
      }),
    });

    expect(sendCalls).toEqual([]);
    expect(secondPass.store.tasks.every((task) => task.status !== "queued")).toBe(true);
    expect(
      secondPass.store.tasks.find((task) => task.id === bundle.queuedTasks[0].id)?.status,
    ).toBe("needs_human_followup");
  });
});
