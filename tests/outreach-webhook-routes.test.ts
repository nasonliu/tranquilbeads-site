import { afterEach, describe, expect, it, vi } from "vitest";

const { syncOutreachReplies } = vi.hoisted(() => ({
  syncOutreachReplies: vi.fn(),
}));

import { POST as postEmailWebhook } from "@/app/api/outreach/webhooks/email/route";
import { POST as postWhatsAppWebhook } from "@/app/api/outreach/webhooks/whatsapp/route";

vi.mock("@/scripts/sync-outreach-replies", () => ({
  syncOutreachReplies,
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("outreach webhook routes", () => {
  it("accepts a Twilio WhatsApp webhook payload and forwards a normalized reply", async () => {
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
    syncOutreachReplies.mockReset();
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
    expect(payload).toMatchObject({
      ok: true,
      totalTasks: 1,
    });
  });

  it("rejects webhook requests with a missing or invalid shared secret", async () => {
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
