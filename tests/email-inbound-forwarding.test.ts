import { describe, expect, it, vi } from "vitest";

import { maybeForwardInboundEmailReply } from "@/src/lib/email-inbound-forwarding";

describe("email inbound forwarding", () => {
  it("forwards an inbound email reply to the configured mailbox via Resend", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ id: "forwarded_123" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await maybeForwardInboundEmailReply({
      reply: {
        channel: "email",
        channelMessageId: "thread-1",
        recipientAddress: "buyer@example.com",
        body: "Please send your latest MOQ and prices.",
        receivedAt: "2026-03-30T15:00:00.000Z",
      },
      env: {
        OUTREACH_EMAIL_FORWARD_TO: "sales@tranquilbeads.com",
        OUTREACH_RESEND_API_KEY: "re_test_123",
        OUTREACH_EMAIL_FROM: "Nason <sales@agent.tranquilbeads.com>",
      },
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("\"to\":[\"sales@tranquilbeads.com\"]"),
      }),
    );
  });

  it("does nothing when forwarding is not configured", async () => {
    const fetchImpl = vi.fn();

    await maybeForwardInboundEmailReply({
      reply: {
        channel: "email",
        channelMessageId: "thread-1",
        recipientAddress: "buyer@example.com",
        body: "Hello",
        receivedAt: "2026-03-30T15:00:00.000Z",
      },
      env: {},
      fetchImpl,
    });

    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
