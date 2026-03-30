import { afterEach, describe, expect, it, vi } from "vitest";
import { Webhook } from "svix";

const { syncOutreachReplies } = vi.hoisted(() => ({
  syncOutreachReplies: vi.fn(),
}));

const { maybeForwardInboundEmailReply } = vi.hoisted(() => ({
  maybeForwardInboundEmailReply: vi.fn(),
}));

import { POST as postEmailWebhook } from "@/app/api/outreach/webhooks/email/route";
import { POST as postWhatsAppWebhook } from "@/app/api/outreach/webhooks/whatsapp/route";

vi.mock("@/scripts/sync-outreach-replies", () => ({
  syncOutreachReplies,
}));

vi.mock("@/src/lib/email-inbound-forwarding", () => ({
  maybeForwardInboundEmailReply,
}));

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.OUTREACH_WEBHOOK_SECRET;
  delete process.env.OUTREACH_RESEND_API_KEY;
  delete process.env.OUTREACH_EMAIL_FORWARD_TO;
});

describe("outreach webhook routes", () => {
  it("accepts a Twilio WhatsApp webhook payload and forwards a normalized reply", async () => {
    process.env.OUTREACH_WEBHOOK_SECRET = "secret-123";
    syncOutreachReplies.mockReset();
    syncOutreachReplies.mockResolvedValueOnce({
      store: { tasks: [], events: [] },
      handoffItems: [{ taskId: "task-1" }],
    });

    const formData = new URLSearchParams();
    formData.set("MessageSid", "SM123");
    formData.set("From", "whatsapp:+971559051926");
    formData.set("Body", "Please send your catalog.");

    const request = new Request("http://localhost/api/outreach/webhooks/whatsapp", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "x-outreach-webhook-secret": "secret-123",
      },
      body: formData.toString(),
    });

    const response = await postWhatsAppWebhook(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(syncOutreachReplies).toHaveBeenCalledWith(
      expect.objectContaining({
        persist: true,
        replies: [
          {
            channel: "whatsapp",
            channelMessageId: "SM123",
            recipientAddress: "+971559051926",
            body: "Please send your catalog.",
          },
        ],
      }),
    );
    expect(payload).toMatchObject({
      ok: true,
      handoffItems: 1,
    });
  });

  it("accepts a Resend email.received webhook payload and forwards a normalized reply", async () => {
    process.env.OUTREACH_WEBHOOK_SECRET = "secret-123";
    process.env.OUTREACH_RESEND_API_KEY = "re_test_123";
    process.env.OUTREACH_EMAIL_FORWARD_TO = "sales@tranquilbeads.com";
    syncOutreachReplies.mockReset();
    maybeForwardInboundEmailReply.mockReset();
    syncOutreachReplies.mockResolvedValueOnce({
      store: { tasks: [{ id: "task-1" }], events: [] },
      handoffItems: [{ taskId: "task-1" }],
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            id: "email_123",
            from: "buyer@example.com",
            text: "Please send pricing.",
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        ),
      ),
    );

    const request = new Request("http://localhost/api/outreach/webhooks/email", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-outreach-webhook-secret": "secret-123",
      },
      body: JSON.stringify({
        type: "email.received",
        data: {
          email_id: "email_123",
          from: "buyer@example.com",
          thread_id: "email-thread-1",
        },
      }),
    });

    const response = await postEmailWebhook(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(syncOutreachReplies).toHaveBeenCalledWith(
      expect.objectContaining({
        persist: true,
        replies: [
          {
            channel: "email",
            channelMessageId: "email-thread-1",
            recipientAddress: "buyer@example.com",
            body: "Please send pricing.",
          },
        ],
      }),
    );
    expect(maybeForwardInboundEmailReply).toHaveBeenCalledWith(
      expect.objectContaining({
        reply: expect.objectContaining({
          channel: "email",
          recipientAddress: "buyer@example.com",
          body: "Please send pricing.",
        }),
      }),
    );
    expect(payload).toMatchObject({
      ok: true,
      totalTasks: 1,
    });
  });

  it("accepts a Resend email webhook signed with svix headers", async () => {
    process.env.OUTREACH_WEBHOOK_SECRET = "secret-123";
    process.env.OUTREACH_RESEND_API_KEY = "re_test_123";
    process.env.OUTREACH_RESEND_WEBHOOK_SECRET = `whsec_${Buffer.from("test_secret").toString("base64")}`;
    process.env.OUTREACH_EMAIL_FORWARD_TO = "sales@tranquilbeads.com";
    syncOutreachReplies.mockReset();
    maybeForwardInboundEmailReply.mockReset();
    syncOutreachReplies.mockResolvedValueOnce({
      store: { tasks: [{ id: "task-1" }], events: [] },
      handoffItems: [{ taskId: "task-1" }],
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).includes("/emails/email_123")) {
          return new Response(
            JSON.stringify({
              id: "email_123",
              from: "buyer@example.com",
              text: "Please send pricing.",
            }),
            {
              status: 200,
              headers: { "content-type": "application/json" },
            },
          );
        }

        return new Response(JSON.stringify({ id: "forward_123" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }),
    );

    const body = JSON.stringify({
      type: "email.received",
      data: {
        email_id: "email_123",
        from: "buyer@example.com",
        thread_id: "email-thread-1",
      },
    });
    const msgId = "msg_test_123";
    const timestampDate = new Date();
    const timestamp = `${Math.floor(timestampDate.getTime() / 1000)}`;
    const signature = new Webhook(process.env.OUTREACH_RESEND_WEBHOOK_SECRET).sign(
      msgId,
      timestampDate,
      body,
    );

    const request = new Request("http://localhost/api/outreach/webhooks/email", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "svix-id": msgId,
        "svix-timestamp": timestamp,
        "svix-signature": signature,
      },
      body,
    });

    const response = await postEmailWebhook(request);

    expect(response.status).toBe(200);
    expect(syncOutreachReplies).toHaveBeenCalledWith(
      expect.objectContaining({
        persist: true,
        replies: [
          expect.objectContaining({
            channel: "email",
            recipientAddress: "buyer@example.com",
            body: "Please send pricing.",
          }),
        ],
      }),
    );
    expect(maybeForwardInboundEmailReply).toHaveBeenCalled();
  });

  it("rejects webhook requests with a missing or invalid shared secret", async () => {
    process.env.OUTREACH_WEBHOOK_SECRET = "secret-123";
    syncOutreachReplies.mockReset();
    const request = new Request("http://localhost/api/outreach/webhooks/whatsapp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        messageId: "wa-thread-1",
        from: "+971559051926",
        body: "Hello",
      }),
    });

    const response = await postWhatsAppWebhook(request);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(syncOutreachReplies).not.toHaveBeenCalled();
    expect(payload).toMatchObject({
      error: "Unauthorized webhook request",
    });
  });
});
