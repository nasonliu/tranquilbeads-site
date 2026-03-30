import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createConfiguredEmailOutreachSender,
  createEmailOutreachSender,
} from "@/src/lib/email-outreach";
import { sendQueuedOutreachTask } from "@/src/lib/outreach-senders";
import {
  createConfiguredWhatsAppOutreachSender,
  createWhatsAppOutreachSender,
} from "@/src/lib/whatsapp-outreach";
import type { OutreachTask } from "@/src/lib/outreach-types";

const fixedTime = new Date("2026-03-29T12:00:00.000Z");

function makeQueuedTask(overrides: Partial<OutreachTask> = {}): OutreachTask {
  return {
    id: "camp-gulf-2026-lead-1-whatsapp",
    campaignId: "camp-gulf-2026",
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

afterEach(() => {
  vi.useRealTimers();
});

describe("outreach senders", () => {
  it("sends a queued WhatsApp task and returns sent metadata", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedTime);

    const sender = createWhatsAppOutreachSender(async (task) => `wa:${task.id}`);

    const result = await sendQueuedOutreachTask(makeQueuedTask(), sender);

    expect(result).toEqual({
      taskId: "camp-gulf-2026-lead-1-whatsapp",
      leadId: "lead-1",
      campaignId: "camp-gulf-2026",
      channel: "whatsapp",
      variant: "personalized",
      status: "sent",
      sentAt: "2026-03-29T12:00:00.000Z",
      attachmentImagePaths: [
        "/images/real-products/natural-kuka-wood/hero.jpeg",
        "/images/real-products/natural-kuka-wood/detail-1.jpeg",
      ],
      channelMessageId: "wa:camp-gulf-2026-lead-1-whatsapp",
    });
  });

  it("sends a queued email task and keeps the channel metadata separate", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedTime);

    const sender = createEmailOutreachSender(async (task) => `email:${task.id}`);

    const result = await sendQueuedOutreachTask(
      makeQueuedTask({
        id: "camp-gulf-2026-lead-1-email",
        channel: "email",
        subject: "Premium Tasbih Collection for Noor Retail Group",
      }),
      sender,
    );

    expect(result.channel).toBe("email");
    expect(result.sentAt).toBe("2026-03-29T12:00:00.000Z");
    expect(result.channelMessageId).toBe("email:camp-gulf-2026-lead-1-email");
    expect(result.attachmentImagePaths).toHaveLength(2);
  });

  it("rejects tasks that have not been queued", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedTime);

    const sender = createWhatsAppOutreachSender();

    await expect(
      sendQueuedOutreachTask(makeQueuedTask({ status: "draft" }), sender),
    ).rejects.toThrow(/queued/i);
  });

  it("rejects send attempts without a recipient address", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedTime);

    const sender = createWhatsAppOutreachSender();

    await expect(
      sendQueuedOutreachTask(makeQueuedTask({ recipientAddress: "" }), sender),
    ).rejects.toThrow(/recipient/i);
  });

  it("uses the configured WhatsApp webhook transport in non-dry-run mode", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedTime);

    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ messageId: "wa-live-1" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const sender = createConfiguredWhatsAppOutreachSender({
      env: {
        OUTREACH_WHATSAPP_PROVIDER: "webhook",
        OUTREACH_WHATSAPP_WEBHOOK_URL: "https://example.com/whatsapp",
      },
      fetchImpl,
    });

    const result = await sendQueuedOutreachTask(makeQueuedTask(), sender);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe("https://example.com/whatsapp");
    expect(result.channelMessageId).toBe("wa-live-1");
  });

  it("uses the configured email webhook transport in non-dry-run mode", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedTime);

    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ messageId: "email-live-1" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const sender = createConfiguredEmailOutreachSender({
      env: {
        OUTREACH_EMAIL_PROVIDER: "webhook",
        OUTREACH_EMAIL_WEBHOOK_URL: "https://example.com/email",
      },
      fetchImpl,
    });

    const result = await sendQueuedOutreachTask(
      makeQueuedTask({
        id: "camp-gulf-2026-lead-1-email",
        channel: "email",
        recipientAddress: "buyer@example.com",
        subject: "Premium Tasbih Collection for Noor Retail Group",
      }),
      sender,
    );

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe("https://example.com/email");
    expect(result.channelMessageId).toBe("email-live-1");
  });

  it("uses the configured Twilio transport for WhatsApp delivery", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedTime);

    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ sid: "SM123" }), {
        status: 201,
        headers: { "content-type": "application/json" },
      }),
    );
    const sender = createConfiguredWhatsAppOutreachSender({
      env: {
        OUTREACH_WHATSAPP_PROVIDER: "twilio",
        OUTREACH_TWILIO_ACCOUNT_SID: "AC123",
        OUTREACH_TWILIO_AUTH_TOKEN: "token-123",
        OUTREACH_TWILIO_WHATSAPP_FROM: "+14155238886",
        OUTREACH_PUBLIC_BASE_URL: "https://www.tranquilbeads.com",
      },
      fetchImpl,
    });

    const result = await sendQueuedOutreachTask(makeQueuedTask(), sender);
    const [, init] = fetchImpl.mock.calls[0] ?? [];
    const body = init?.body instanceof URLSearchParams ? init.body : null;

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "https://api.twilio.com/2010-04-01/Accounts/AC123/Messages.json",
    );
    expect(init?.method).toBe("POST");
    expect(body?.get("To")).toBe("whatsapp:+971559051926");
    expect(body?.get("From")).toBe("whatsapp:+14155238886");
    expect(body?.get("Body")).toContain("Nason");
    expect(body?.getAll("MediaUrl")).toEqual([
      "https://www.tranquilbeads.com/images/real-products/natural-kuka-wood/hero.jpeg",
      "https://www.tranquilbeads.com/images/real-products/natural-kuka-wood/detail-1.jpeg",
    ]);
    expect(result.channelMessageId).toBe("SM123");
  });

  it("normalizes spaced WhatsApp numbers before handing them to OpenClaw", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedTime);

    const execFileImpl = vi.fn(async () => ({
      stdout: JSON.stringify({ messageId: "oc_123" }),
      stderr: "",
    }));
    const sender = createConfiguredWhatsAppOutreachSender({
      env: {
        OUTREACH_WHATSAPP_PROVIDER: "openclaw",
        OUTREACH_OPENCLAW_CLI_PATH: "/Users/nason/.openclaw/bin/openclaw",
        OUTREACH_OPENCLAW_WORKSPACE: "/Users/nason/.openclaw/workspace",
      },
      execFileImpl,
    });

    const result = await sendQueuedOutreachTask(
      makeQueuedTask({ recipientAddress: "+971 55 905 1926" }),
      sender,
    );

    expect(execFileImpl).toHaveBeenCalledTimes(1);
    expect(execFileImpl.mock.calls[0]?.[1]).toContain("+971559051926");
    expect(execFileImpl.mock.calls[0]?.[1]).toContain(
      "/Volumes/新加卷/Documents/ProjectNoor/public/images/real-products/natural-kuka-wood/hero.jpeg",
    );
    expect(execFileImpl.mock.calls[0]?.[1]).toContain(
      "/Volumes/新加卷/Documents/ProjectNoor/public/images/real-products/natural-kuka-wood/detail-1.jpeg",
    );
    expect(result.channelMessageId).toBe("oc_123");
  });

  it("uses the configured Resend transport for email delivery", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedTime);

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
    const sender = createConfiguredEmailOutreachSender({
      env: {
        OUTREACH_EMAIL_PROVIDER: "resend",
        OUTREACH_RESEND_API_KEY: "re_test_123",
        OUTREACH_EMAIL_FROM: "Nason <sales@tranquilbeads.com>",
        OUTREACH_PUBLIC_BASE_URL: "https://www.tranquilbeads.com",
      },
      fetchImpl,
    });

    const result = await sendQueuedOutreachTask(
      makeQueuedTask({
        id: "camp-gulf-2026-lead-1-email",
        channel: "email",
        recipientAddress: "buyer@example.com",
        subject: "Premium Tasbih Collection for Noor Retail Group",
      }),
      sender,
    );

    const [, init] = fetchImpl.mock.calls[1] ?? [];
    const payload = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe("https://api.resend.com/domains");
    expect(fetchImpl.mock.calls[1]?.[0]).toBe("https://api.resend.com/emails");
    expect(init?.method).toBe("POST");
    expect(payload.from).toBe("Nason <sales@tranquilbeads.com>");
    expect(payload.to).toEqual(["buyer@example.com"]);
    expect(payload.subject).toBe("Premium Tasbih Collection for Noor Retail Group");
    expect(payload.attachments).toEqual([
      {
        path: "https://www.tranquilbeads.com/images/real-products/natural-kuka-wood/hero.jpeg",
      },
      {
        path: "https://www.tranquilbeads.com/images/real-products/natural-kuka-wood/detail-1.jpeg",
      },
    ]);
    expect(result.channelMessageId).toBe("re_123");
  });

  it("blocks resend delivery until the sender domain is verified", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedTime);

    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: [{ name: "agent.tranquilbeads.com", status: "pending" }],
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );
    const sender = createConfiguredEmailOutreachSender({
      env: {
        OUTREACH_EMAIL_PROVIDER: "resend",
        OUTREACH_RESEND_API_KEY: "re_test_123",
        OUTREACH_EMAIL_FROM: "Nason <sales@agent.tranquilbeads.com>",
      },
      fetchImpl,
    });

    await expect(
      sendQueuedOutreachTask(
        makeQueuedTask({
          id: "camp-gulf-2026-lead-1-email",
          channel: "email",
          recipientAddress: "buyer@example.com",
          subject: "Premium Tasbih Collection for Noor Retail Group",
        }),
        sender,
      ),
    ).rejects.toThrow(/not verified/i);
  });

  it("uses the configured OpenClaw transport for WhatsApp delivery", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedTime);

    const execFileImpl = vi.fn(async () => ({
      stdout: JSON.stringify({ ok: true, messageId: "openclaw-1" }),
      stderr: "",
    }));
    const sender = createConfiguredWhatsAppOutreachSender({
      env: {
        OUTREACH_WHATSAPP_PROVIDER: "openclaw",
        OUTREACH_OPENCLAW_CLI_PATH: "/Users/nason/.openclaw/bin/openclaw",
        OUTREACH_OPENCLAW_WORKSPACE: "/Users/nason/.openclaw/workspace",
      },
      execFileImpl,
    });

    const result = await sendQueuedOutreachTask(makeQueuedTask(), sender);

    expect(execFileImpl).toHaveBeenCalledTimes(1);
    expect(execFileImpl.mock.calls[0]?.[0]).toBe("/Users/nason/.openclaw/bin/openclaw");
    expect(execFileImpl.mock.calls[0]?.[1]).toEqual([
      "message",
      "send",
      "--channel",
      "whatsapp",
      "--target",
      "+971559051926",
      "--message",
      "Hello, this is Nason from TranquilBeads.",
      "--json",
      "--media",
      "/Volumes/新加卷/Documents/ProjectNoor/public/images/real-products/natural-kuka-wood/hero.jpeg",
      "--media",
      "/Volumes/新加卷/Documents/ProjectNoor/public/images/real-products/natural-kuka-wood/detail-1.jpeg",
    ]);
    expect(result.channelMessageId).toBe("openclaw-1");
  });
});
