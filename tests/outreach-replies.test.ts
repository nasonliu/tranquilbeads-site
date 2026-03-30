import { describe, expect, it } from "vitest";

import {
  ingestEmailReply,
  ingestWhatsAppReply,
} from "@/src/lib/outreach-replies";
import { createEmptyOutreachStore } from "@/src/lib/outreach-store";
import type { OutreachStore, OutreachTask } from "@/src/lib/outreach-types";

function makeSentTask(
  overrides: Partial<OutreachTask> & Pick<OutreachTask, "channel" | "id">,
): OutreachTask {
  return {
    campaignId: "camp_gulf_2026",
    leadId: "lead-1",
    variant: "personalized",
    status: "sent",
    websiteUrl: "https://www.tranquilbeads.com",
    subject: null,
    body: "Hello, this is Nason from TranquilBeads.",
    recipientAddress: overrides.channel === "email" ? "buyer@example.com" : "+971559051926",
    attachmentImagePaths: [
      "/images/real-products/natural-kuka-wood/hero.jpeg",
      "/images/real-products/natural-kuka-wood/detail-1.jpeg",
    ],
    channelMessageId: "channel-message-1",
    sentAt: "2026-03-29T10:00:00.000Z",
    lastReplyAt: null,
    needsHumanFollowup: false,
    failureReason: null,
    ...overrides,
  };
}

function makeStore(tasks: OutreachTask[]): OutreachStore {
  return {
    ...createEmptyOutreachStore(),
    tasks,
  };
}

describe("outreach replies", () => {
  it("moves a sent WhatsApp task into human follow-up and records reply events", () => {
    const sentTask = makeSentTask({
      id: "camp_gulf_2026-lead-1-whatsapp",
      channel: "whatsapp",
      channelMessageId: "wa-thread-1",
    });

    const result = ingestWhatsAppReply(makeStore([sentTask]), {
      channelMessageId: "wa-thread-1",
      body: "Please send the catalog and MOQ details.",
      receivedAt: "2026-03-29T12:05:00.000Z",
    });

    const updatedTask = result.tasks.find((task) => task.id === sentTask.id);

    expect(updatedTask?.status).toBe("needs_human_followup");
    expect(updatedTask?.lastReplyAt).toBe("2026-03-29T12:05:00.000Z");
    expect(updatedTask?.needsHumanFollowup).toBe(true);
    expect(updatedTask?.channelMessageId).toBe("wa-thread-1");
    expect(result.events.map((event) => event.type)).toEqual([
      "reply_detected",
      "handoff_created",
    ]);
    expect(result.events[0]).toMatchObject({
      taskId: sentTask.id,
      type: "reply_detected",
      payload: {
        channel: "whatsapp",
        channelMessageId: "wa-thread-1",
        body: "Please send the catalog and MOQ details.",
        receivedAt: "2026-03-29T12:05:00.000Z",
      },
    });
  });

  it("moves a sent email task into human follow-up and keeps the email channel separate", () => {
    const sentTask = makeSentTask({
      id: "camp_gulf_2026-lead-1-email",
      channel: "email",
      subject: "Premium Tasbih Collection for Noor Retail Group",
      channelMessageId: "email-thread-1",
    });

    const result = ingestEmailReply(makeStore([sentTask]), {
      channelMessageId: "email-thread-1",
      body: "Thanks, please send pricing and lead time.",
      receivedAt: "2026-03-29T12:10:00.000Z",
    });

    const updatedTask = result.tasks.find((task) => task.id === sentTask.id);

    expect(updatedTask?.status).toBe("needs_human_followup");
    expect(updatedTask?.channel).toBe("email");
    expect(result.events[0]).toMatchObject({
      taskId: sentTask.id,
      payload: {
        channel: "email",
        channelMessageId: "email-thread-1",
        body: "Thanks, please send pricing and lead time.",
        receivedAt: "2026-03-29T12:10:00.000Z",
      },
    });
  });

  it("treats duplicate reply delivery for an already handed-off thread as a no-op", () => {
    const handedOffTask = makeSentTask({
      id: "camp_gulf_2026-lead-1-whatsapp",
      channel: "whatsapp",
      status: "needs_human_followup",
      channelMessageId: "wa-thread-1",
      lastReplyAt: "2026-03-29T12:05:00.000Z",
      needsHumanFollowup: true,
    });

    const store = makeStore([handedOffTask]);
    const result = ingestWhatsAppReply(store, {
      channelMessageId: "wa-thread-1",
      body: "Checking in again",
      receivedAt: "2026-03-29T12:06:00.000Z",
    });

    expect(result).toBe(store);
  });

  it("can match a reply by recipient address when the provider does not return the original message id", () => {
    const sentTask = makeSentTask({
      id: "camp_gulf_2026-lead-1-whatsapp",
      channel: "whatsapp",
      channelMessageId: "wa-thread-1",
      recipientAddress: "+971559051926",
    });

    const result = ingestWhatsAppReply(makeStore([sentTask]), {
      channelMessageId: "",
      recipientAddress: "+971559051926",
      body: "Please send your latest catalog.",
      receivedAt: "2026-03-29T12:15:00.000Z",
    });

    expect(result.tasks.find((task) => task.id === sentTask.id)?.status).toBe(
      "needs_human_followup",
    );
    expect(result.events[0]).toMatchObject({
      payload: {
        recipientAddress: "+971559051926",
      },
    });
  });

  it("matches WhatsApp replies even when stored and inbound numbers use different spacing", () => {
    const sentTask = makeSentTask({
      id: "camp_gulf_2026-lead-1-whatsapp",
      channel: "whatsapp",
      channelMessageId: "wa-thread-1",
      recipientAddress: "+971 55 905 1926",
    });

    const result = ingestWhatsAppReply(makeStore([sentTask]), {
      channelMessageId: "",
      recipientAddress: "+971559051926",
      body: "Please send your latest catalog.",
      receivedAt: "2026-03-29T12:16:00.000Z",
    });

    expect(result.tasks.find((task) => task.id === sentTask.id)?.status).toBe(
      "needs_human_followup",
    );
  });
});
