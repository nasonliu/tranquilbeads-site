import { afterEach, describe, expect, it, vi } from "vitest";

import { createEmailOutreachSender } from "@/src/lib/email-outreach";
import { processQueuedOutreachTasks } from "@/src/lib/outreach-orchestrator";
import { createEmptyOutreachStore } from "@/src/lib/outreach-store";
import type { OutreachStore, OutreachTask } from "@/src/lib/outreach-types";
import { createWhatsAppOutreachSender as createWhatsAppSender } from "@/src/lib/whatsapp-outreach";

const fixedTime = new Date("2026-03-29T12:00:00.000Z");

afterEach(() => {
  vi.useRealTimers();
});

function makeTask(overrides: Partial<OutreachTask> = {}): OutreachTask {
  return {
    id: "camp-gulf-2026-lead-1-whatsapp",
    campaignId: "camp_gulf_2026",
    leadId: "lead-1",
    channel: "whatsapp",
    variant: "personalized",
    status: "queued",
    websiteUrl: "https://www.tranquilbeads.com",
    subject: null,
    body: "Hello, this is Nason from TranquilBeads.",
    recipientAddress: "+971559051926",
    attachmentImagePaths: [
      "/images/real-products/natural-kuka-wood/hero.jpeg",
      "/images/real-products/natural-kuka-wood/detail-1.jpeg",
    ],
    sentAt: null,
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

describe("outreach orchestrator", () => {
  it("sends queued tasks through the matching sender and records sent events", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedTime);

    const whatsappTask = makeTask({
      id: "camp_gulf_2026-lead-1-whatsapp",
      channel: "whatsapp",
    });
    const emailTask = makeTask({
      id: "camp_gulf_2026-lead-1-email",
      channel: "email",
      recipientAddress: "buyer@example.com",
      subject: "Premium Tasbih Collection for Noor Retail Group",
    });
    const alreadySentTask = makeTask({
      id: "camp_gulf_2026-lead-2-whatsapp",
      channel: "whatsapp",
      status: "sent",
      sentAt: "2026-03-29T10:00:00.000Z",
    });

    const whatsappCalls: string[] = [];
    const emailCalls: string[] = [];

    const result = await processQueuedOutreachTasks(
      makeStore([whatsappTask, emailTask, alreadySentTask]),
      {
        whatsapp: createWhatsAppSender(async (task) => {
          whatsappCalls.push(task.id);
          return `wa:${task.id}`;
        }),
        email: createEmailOutreachSender(async (task) => {
          emailCalls.push(task.id);
          return `email:${task.id}`;
        }),
      },
    );

    expect(whatsappCalls).toEqual(["camp_gulf_2026-lead-1-whatsapp"]);
    expect(emailCalls).toEqual(["camp_gulf_2026-lead-1-email"]);
    expect(result.sentResults).toHaveLength(2);
    expect(result.store.tasks.find((task) => task.id === whatsappTask.id)?.status).toBe(
      "sent",
    );
    expect(result.store.tasks.find((task) => task.id === emailTask.id)?.status).toBe("sent");
    expect(result.store.tasks.find((task) => task.id === alreadySentTask.id)?.status).toBe(
      "sent",
    );
    expect(result.store.events.map((event) => event.type)).toEqual(["sent", "sent"]);
    expect(result.store.tasks.find((task) => task.id === whatsappTask.id)?.sentAt).toBe(
      "2026-03-29T12:00:00.000Z",
    );
    expect(
      result.store.tasks.find((task) => task.id === whatsappTask.id)?.channelMessageId,
    ).toBe("wa:camp_gulf_2026-lead-1-whatsapp");
  });

  it("marks a queued task as failed when the sender throws", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedTime);

    const whatsappTask = makeTask();
    const result = await processQueuedOutreachTasks(makeStore([whatsappTask]), {
      whatsapp: createWhatsAppSender(async () => {
        throw new Error("WhatsApp transport unavailable");
      }),
    });

    const updatedTask = result.store.tasks.find((task) => task.id === whatsappTask.id);

    expect(updatedTask?.status).toBe("failed");
    expect(updatedTask?.failureReason).toContain("WhatsApp transport unavailable");
    expect(updatedTask?.sentAt).toBeNull();
    expect(result.store.events).toHaveLength(1);
    expect(result.store.events[0].type).toBe("failed");
  });

  it("does not reschedule already sent tasks", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedTime);

    const sentTask = makeTask({
      status: "sent",
      sentAt: "2026-03-29T10:00:00.000Z",
    });
    const queuedTask = makeTask({
      id: "camp_gulf_2026-lead-1-email",
      channel: "email",
      recipientAddress: "buyer@example.com",
      subject: "Premium Tasbih Collection for Noor Retail Group",
    });

    const whatsappCalls: string[] = [];
    const emailCalls: string[] = [];

    await processQueuedOutreachTasks(makeStore([sentTask, queuedTask]), {
      whatsapp: createWhatsAppSender(async (task) => {
        whatsappCalls.push(task.id);
        return `wa:${task.id}`;
      }),
      email: createEmailOutreachSender(async (task) => {
        emailCalls.push(task.id);
        return `email:${task.id}`;
      }),
    });

    expect(whatsappCalls).toEqual([]);
    expect(emailCalls).toEqual(["camp_gulf_2026-lead-1-email"]);
  });
});
