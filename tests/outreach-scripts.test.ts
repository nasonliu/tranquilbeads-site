import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it, vi, afterEach } from "vitest";

import { createEmailOutreachSender } from "@/src/lib/email-outreach";
import { buildOutreachTaskBundle } from "@/src/lib/outreach-task-factory";
import { createEmptyOutreachStore, readOutreachStore, writeOutreachStore } from "@/src/lib/outreach-store";
import type { OutreachLead, OutreachStore, OutreachTask } from "@/src/lib/outreach-types";
import { createWhatsAppOutreachSender } from "@/src/lib/whatsapp-outreach";
import { importObsidianLeads } from "../scripts/import-obsidian-leads";
import { queueOutreachTasks } from "../scripts/queue-outreach-tasks";
import { runOutreachFirstTouch } from "../scripts/run-outreach-first-touch";
import { syncOpenClawWhatsAppReplies } from "../scripts/sync-openclaw-whatsapp-replies";
import { syncOutreachReplies } from "../scripts/sync-outreach-replies";

const fixturePath = join(
  process.cwd(),
  "tests/fixtures/obsidian-uae-leads.md",
);

const fixedTime = new Date("2026-03-29T12:00:00.000Z");

afterEach(() => {
  vi.useRealTimers();
});

async function createOutreachFixtureDir() {
  const dir = await mkdtemp(join(tmpdir(), "tranquilbeads-outreach-scripts-"));
  const store = createEmptyOutreachStore();

  await writeOutreachStore(store, dir);

  return dir;
}

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

function makeSentTask(): OutreachTask {
  return {
    id: "camp_gulf_2026-lead-1-whatsapp",
    campaignId: "camp_gulf_2026",
    leadId: makeLead().id,
    channel: "whatsapp",
    variant: "personalized",
    status: "sent",
    websiteUrl: "https://www.tranquilbeads.com",
    subject: null,
    body: "Hello, this is Nason from TranquilBeads.",
    recipientAddress: "+971559051926",
    attachmentImagePaths: [
      "/images/real-products/natural-kuka-wood/hero.jpeg",
      "/images/real-products/natural-kuka-wood/detail-1.jpeg",
    ],
    channelMessageId: "wa-thread-1",
    sentAt: "2026-03-29T10:00:00.000Z",
    lastReplyAt: null,
    needsHumanFollowup: false,
    failureReason: null,
  };
}

describe("outreach scripts", () => {
  it("imports Obsidian lead files into the outreach store and persists them", async () => {
    const outreachDir = await createOutreachFixtureDir();
    const lead = makeLead();
    const existingStore: OutreachStore = {
      ...createEmptyOutreachStore(),
      leads: [lead],
    };

    await writeOutreachStore(existingStore, outreachDir);

    const result = await importObsidianLeads({
      sourcePaths: [fixturePath],
      outreachDir,
    });

    expect(result.importedLeads).toHaveLength(3);
    expect(result.store.leads).toHaveLength(4);
    expect(result.store.leads[0].company).toBe("Noor Retail Group");

    const persisted = await readOutreachStore(outreachDir);
    expect(persisted.leads).toHaveLength(4);
  });

  it("runs first-touch sending for queued tasks and writes the sent state", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedTime);

    const outreachDir = await createOutreachFixtureDir();
    const lead = makeLead();
    const bundle = buildOutreachTaskBundle({
      lead,
      campaignId: "camp_gulf_2026",
      websiteUrl: "https://www.tranquilbeads.com",
      locale: "en",
    });
    const store: OutreachStore = {
      ...createEmptyOutreachStore(),
      leads: [lead],
      tasks: bundle.queuedTasks,
      events: bundle.events,
    };

    await writeOutreachStore(store, outreachDir);

    const result = await runOutreachFirstTouch({
      outreachDir,
      senders: {
        whatsapp: createWhatsAppOutreachSender(async (task) => `wa:${task.id}`),
        email: createEmailOutreachSender(async (task) => `email:${task.id}`),
      },
    });

    expect(result.sentResults).toHaveLength(2);
    expect(result.store.tasks.every((task) => task.status === "sent")).toBe(true);
    expect(
      result.store.tasks.find((task) => task.channel === "whatsapp")?.channelMessageId,
    ).toBe("wa:camp-gulf-2026-website-inquiry-contact-noor-retail-group-1-whatsapp");

    const persisted = await readOutreachStore(outreachDir);
    expect(persisted.tasks.every((task) => task.status === "sent")).toBe(true);
  });

  it("queues a campaign worth of eligible lead tasks into the outreach store", async () => {
    const outreachDir = await createOutreachFixtureDir();
    const lead = makeLead();
    const store: OutreachStore = {
      ...createEmptyOutreachStore(),
      leads: [lead],
    };

    await writeOutreachStore(store, outreachDir);

    const result = await queueOutreachTasks({
      outreachDir,
      campaign: {
        id: "camp_gulf_2026",
        name: "Gulf outreach",
        description: "First-touch Gulf outreach batch",
        channels: ["whatsapp", "email"],
        status: "active",
        createdAt: "2026-03-29T00:00:00.000Z",
      },
      websiteUrl: "https://www.tranquilbeads.com",
    });

    expect(result.store.campaigns).toHaveLength(1);
    expect(result.store.tasks).toHaveLength(2);
    expect(result.store.tasks.every((task) => task.status === "queued")).toBe(true);

    const persisted = await readOutreachStore(outreachDir);
    expect(persisted.campaigns).toHaveLength(1);
    expect(persisted.tasks).toHaveLength(2);
  });

  it("queues only the channels selected on the campaign", async () => {
    const outreachDir = await createOutreachFixtureDir();
    const lead = makeLead();
    const store: OutreachStore = {
      ...createEmptyOutreachStore(),
      leads: [lead],
    };

    await writeOutreachStore(store, outreachDir);

    const result = await queueOutreachTasks({
      outreachDir,
      campaign: {
        id: "camp_whatsapp_only",
        name: "WhatsApp only",
        description: "WhatsApp batch",
        channels: ["whatsapp"],
        status: "active",
        createdAt: "2026-03-29T00:00:00.000Z",
      },
      websiteUrl: "https://www.tranquilbeads.com",
    });

    expect(result.store.tasks).toHaveLength(1);
    expect(result.store.tasks[0]?.channel).toBe("whatsapp");
  });

  it("keeps suppressed email tasks queued during first-touch sending", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedTime);

    const outreachDir = await createOutreachFixtureDir();
    const lead = makeLead();
    const bundle = buildOutreachTaskBundle({
      lead,
      campaignId: "camp_gulf_2026",
      websiteUrl: "https://www.tranquilbeads.com",
      locale: "en",
    });
    const store: OutreachStore = {
      ...createEmptyOutreachStore(),
      leads: [lead],
      tasks: bundle.queuedTasks,
      events: bundle.events,
      suppressions: [
        {
          address: "amina@example.com",
          channel: "email",
          reason: "unsubscribe",
          createdAt: "2026-03-29T11:00:00.000Z",
        },
      ],
    };

    await writeOutreachStore(store, outreachDir);

    const result = await runOutreachFirstTouch({
      outreachDir,
      senders: {
        whatsapp: createWhatsAppOutreachSender(async (task) => `wa:${task.id}`),
        email: createEmailOutreachSender(async (task) => `email:${task.id}`),
      },
    });

    expect(result.sentResults).toHaveLength(1);
    expect(result.store.tasks.find((task) => task.channel === "whatsapp")?.status).toBe("sent");
    expect(result.store.tasks.find((task) => task.channel === "email")?.status).toBe("queued");
  });

  it("respects the daily email send cap while continuing to send whatsapp", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedTime);
    vi.stubEnv("OUTREACH_EMAIL_DAILY_LIMIT", "1");

    const outreachDir = await createOutreachFixtureDir();
    const lead = makeLead();
    const bundle = buildOutreachTaskBundle({
      lead,
      campaignId: "camp_gulf_2026",
      websiteUrl: "https://www.tranquilbeads.com",
      locale: "en",
    });
    const alreadySentEmail = {
      ...bundle.queuedTasks.find((task) => task.channel === "email")!,
      id: "already-sent-email",
      status: "sent" as const,
      sentAt: "2026-03-29T01:00:00.000Z",
      recipientAddress: "other@example.com",
    };
    const store: OutreachStore = {
      ...createEmptyOutreachStore(),
      leads: [lead],
      tasks: [alreadySentEmail, ...bundle.queuedTasks],
      events: bundle.events,
    };

    await writeOutreachStore(store, outreachDir);

    const result = await runOutreachFirstTouch({
      outreachDir,
      senders: {
        whatsapp: createWhatsAppOutreachSender(async (task) => `wa:${task.id}`),
        email: createEmailOutreachSender(async (task) => `email:${task.id}`),
      },
    });

    expect(result.sentResults).toHaveLength(1);
    expect(result.store.tasks.find((task) => task.channel === "whatsapp" && task.id !== "already-sent-email")?.status).toBe("sent");
    expect(result.store.tasks.find((task) => task.channel === "email" && task.id !== "already-sent-email")?.status).toBe("queued");
  });

  it("defaults the first-touch script to OpenClaw WhatsApp plus Resend email senders", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedTime);

    const execFileImpl = vi.fn(async () => ({
      stdout: JSON.stringify({ ok: true, messageId: "openclaw-1" }),
      stderr: "",
    }));
    const fetchImpl = vi.fn(async (input: string | URL) => {
      const url = String(input);

      if (url === "https://api.resend.com/domains") {
        return new Response(
          JSON.stringify({
            data: [{ name: "tranquilbeads.com", status: "verified" }],
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      }

      return new Response(JSON.stringify({ id: "re_123" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    vi.stubEnv("OUTREACH_WHATSAPP_PROVIDER", "openclaw");
    vi.stubEnv("OUTREACH_EMAIL_PROVIDER", "resend");
    vi.stubEnv("OUTREACH_OPENCLAW_CLI_PATH", "/Users/nason/.openclaw/bin/openclaw");
    vi.stubEnv("OUTREACH_OPENCLAW_WORKSPACE", "/Users/nason/.openclaw/workspace");
    vi.stubEnv("OUTREACH_RESEND_API_KEY", "re_test_123");
    vi.stubEnv("OUTREACH_EMAIL_FROM", "Nason <sales@tranquilbeads.com>");
    vi.stubEnv("OUTREACH_PUBLIC_BASE_URL", "https://www.tranquilbeads.com");

    const outreachDir = await createOutreachFixtureDir();
    const lead = makeLead();
    const bundle = buildOutreachTaskBundle({
      lead,
      campaignId: "camp_gulf_2026",
      websiteUrl: "https://www.tranquilbeads.com",
      locale: "en",
    });
    const store: OutreachStore = {
      ...createEmptyOutreachStore(),
      leads: [lead],
      tasks: bundle.queuedTasks,
      events: bundle.events,
    };

    await writeOutreachStore(store, outreachDir);

    const { runOutreachFirstTouch } = await import("../scripts/run-outreach-first-touch");
    const result = await runOutreachFirstTouch({
      outreachDir,
      execFileImpl,
      fetchImpl,
    });

    expect(result.sentResults).toHaveLength(2);
    expect(execFileImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("syncs replies into handoff items and persists the human follow-up state", async () => {
    const outreachDir = await createOutreachFixtureDir();
    const lead = makeLead();
    const store: OutreachStore = {
      ...createEmptyOutreachStore(),
      leads: [lead],
      tasks: [makeSentTask()],
    };

    await writeOutreachStore(store, outreachDir);

    const result = await syncOutreachReplies({
      outreachDir,
      replies: [
        {
          channel: "whatsapp",
          channelMessageId: "wa-thread-1",
          body: "Please send the catalog and MOQ details.",
          receivedAt: "2026-03-29T12:05:00.000Z",
        },
      ],
    });

    expect(result.handoffItems).toHaveLength(1);
    expect(result.handoffItems[0]).toMatchObject({
      taskId: "camp_gulf_2026-lead-1-whatsapp",
      leadId: lead.id,
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
    });
    expect(result.store.tasks[0].status).toBe("needs_human_followup");
    expect(result.store.events.map((event) => event.type)).toEqual([
      "reply_detected",
      "handoff_created",
    ]);

    const persisted = await readOutreachStore(outreachDir);
    expect(persisted.tasks[0].status).toBe("needs_human_followup");
    expect(persisted.events).toHaveLength(2);
  });

  it("syncs recent WhatsApp replies through the OpenClaw read bridge", async () => {
    const outreachDir = await createOutreachFixtureDir();
    const lead = makeLead();
    const store: OutreachStore = {
      ...createEmptyOutreachStore(),
      leads: [lead],
      tasks: [makeSentTask()],
    };

    await writeOutreachStore(store, outreachDir);

    const execFileImpl = vi.fn(async () => ({
      stdout: JSON.stringify({
        messages: [
          {
            id: "wa-reply-2",
            direction: "inbound",
            text: "Please send your latest pricing.",
            from: "+971559051926",
            timestamp: "2026-03-29T12:10:00.000Z",
          },
        ],
      }),
      stderr: "",
    }));

    const result = await syncOpenClawWhatsAppReplies({
      outreachDir,
      execFileImpl,
    });

    expect(execFileImpl).toHaveBeenCalledTimes(1);
    expect(result.handoffItems).toHaveLength(1);
    expect(result.handoffItems[0]?.latestReply.body).toBe("Please send your latest pricing.");
    expect(result.store.tasks[0]?.status).toBe("needs_human_followup");
  });
});
