import { describe, expect, it } from "vitest";

import {
  applyComplianceFooter,
  countEmailSendsOnDate,
  filterQueuedEmailTasksForDelivery,
} from "@/src/lib/outreach-guardrails";
import { createEmptyOutreachStore } from "@/src/lib/outreach-store";
import type { OutreachStore, OutreachTask, SuppressionEntry } from "@/src/lib/outreach-types";

function makeTask(overrides: Partial<OutreachTask> = {}): OutreachTask {
  return {
    id: "camp-gulf-2026-lead-1-email",
    campaignId: "camp_gulf_2026",
    leadId: "lead-1",
    channel: "email",
    variant: "personalized",
    status: "queued",
    websiteUrl: "https://www.tranquilbeads.com",
    subject: "Premium Tasbih Collection for Noor Retail Group",
    body: "Hello,\n\nThis is Nason from TranquilBeads.",
    recipientAddress: "buyer@example.com",
    attachmentImagePaths: [],
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
    suppressions: [],
  };
}

describe("outreach guardrails", () => {
  it("adds an unsubscribe footer to English emails", () => {
    expect(applyComplianceFooter("email", "Base body", "en")).toContain(
      "If you prefer not to receive further emails",
    );
  });

  it("adds an unsubscribe footer to Arabic emails", () => {
    expect(applyComplianceFooter("email", "Base body", "ar")).toContain(
      "إذا كنتم لا ترغبون في تلقي رسائل أخرى",
    );
  });

  it("does not add an unsubscribe footer to WhatsApp messages", () => {
    expect(applyComplianceFooter("whatsapp", "Base body", "en")).toBe("Base body");
  });

  it("filters suppressed recipients out of the send batch", () => {
    const queued = makeTask();
    const suppression: SuppressionEntry = {
      address: "buyer@example.com",
      channel: "email",
      reason: "unsubscribe",
      createdAt: "2026-03-30T00:00:00.000Z",
    };

    const filtered = filterQueuedEmailTasksForDelivery(makeStore([queued]), {
      suppressions: [suppression],
      maxPerDay: 20,
      now: "2026-03-30T12:00:00.000Z",
    });

    expect(filtered.allowedTasks).toEqual([]);
    expect(filtered.blockedTasks[0]?.reason).toContain("suppression");
  });

  it("respects the configured daily email cap", () => {
    const alreadySent = makeTask({
      id: "sent-email",
      status: "sent",
      sentAt: "2026-03-30T01:00:00.000Z",
    });
    const queued = makeTask({
      id: "queued-email",
      recipientAddress: "next@example.com",
    });

    const filtered = filterQueuedEmailTasksForDelivery(makeStore([alreadySent, queued]), {
      suppressions: [],
      maxPerDay: 1,
      now: "2026-03-30T12:00:00.000Z",
    });

    expect(filtered.allowedTasks).toEqual([]);
    expect(filtered.blockedTasks[0]?.reason).toContain("daily email cap");
  });

  it("counts only today's sent email tasks against the cap", () => {
    const store = makeStore([
      makeTask({
        id: "sent-today",
        status: "sent",
        sentAt: "2026-03-30T01:00:00.000Z",
      }),
      makeTask({
        id: "sent-yesterday",
        status: "sent",
        sentAt: "2026-03-29T23:00:00.000Z",
      }),
      makeTask({
        id: "whatsapp-sent",
        channel: "whatsapp",
        subject: null,
        status: "sent",
        sentAt: "2026-03-30T02:00:00.000Z",
        recipientAddress: "+971559051926",
      }),
    ]);

    expect(countEmailSendsOnDate(store, "2026-03-30T12:00:00.000Z")).toBe(1);
  });
});
