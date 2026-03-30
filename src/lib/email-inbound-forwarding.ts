import type { OutreachReplySyncInput } from "@/scripts/sync-outreach-replies";

export type MaybeForwardInboundEmailReplyOptions = {
  reply: OutreachReplySyncInput;
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
};

export async function maybeForwardInboundEmailReply(
  options: MaybeForwardInboundEmailReplyOptions,
) {
  if (options.reply.channel !== "email") {
    return;
  }

  const env = options.env ?? process.env;
  const forwardTo = env.OUTREACH_EMAIL_FORWARD_TO?.trim();
  const apiKey = env.OUTREACH_RESEND_API_KEY?.trim();
  const from = env.OUTREACH_EMAIL_FROM?.trim();

  if (!forwardTo || !apiKey || !from) {
    return;
  }

  const response = await (options.fetchImpl ?? fetch)("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [forwardTo],
      reply_to: options.reply.recipientAddress || undefined,
      subject: buildForwardSubject(options.reply),
      text: buildForwardBody(options.reply),
    }),
  });

  if (!response.ok) {
    throw new Error(`Inbound email forward failed with status ${response.status}.`);
  }
}

function buildForwardSubject(reply: OutreachReplySyncInput) {
  const sender = reply.recipientAddress || "unknown sender";
  return `Lead reply from ${sender}`;
}

function buildForwardBody(reply: OutreachReplySyncInput) {
  return [
    `From: ${reply.recipientAddress || "unknown sender"}`,
    `Thread: ${reply.channelMessageId || "unknown"}`,
    `Received: ${reply.receivedAt || "unknown"}`,
    "",
    reply.body || "",
  ].join("\n");
}
