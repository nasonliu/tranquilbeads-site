import { createOutreachSender, type OutreachChannelTransport } from "@/src/lib/outreach-senders";
import type { OutreachTask } from "@/src/lib/outreach-types";

export type ConfiguredEmailSenderOptions = {
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
};

export function createEmailOutreachSender(transport?: OutreachChannelTransport) {
  return createOutreachSender("email", transport);
}

export function createConfiguredEmailOutreachSender(
  options: ConfiguredEmailSenderOptions = {},
) {
  const env = options.env ?? process.env;
  const provider = env.OUTREACH_EMAIL_PROVIDER ?? "dry_run";

  if (provider === "resend") {
    return createEmailOutreachSender(
      createResendTransport({
        apiKey: env.OUTREACH_RESEND_API_KEY,
        from: env.OUTREACH_EMAIL_FROM,
        replyTo: env.OUTREACH_EMAIL_REPLY_TO,
        publicBaseUrl: env.OUTREACH_PUBLIC_BASE_URL,
        fetchImpl: options.fetchImpl ?? fetch,
      }),
    );
  }

  if (provider === "webhook") {
    return createEmailOutreachSender(
      createWebhookTransport({
        webhookUrl: env.OUTREACH_EMAIL_WEBHOOK_URL,
        webhookToken: env.OUTREACH_EMAIL_WEBHOOK_TOKEN,
        fetchImpl: options.fetchImpl ?? fetch,
      }),
    );
  }

  return createEmailOutreachSender(async (task) => ({
    channelMessageId: `dryrun:email:${task.id}`,
  }));
}

function createResendTransport(options: {
  apiKey?: string;
  from?: string;
  replyTo?: string;
  publicBaseUrl?: string;
  fetchImpl: typeof fetch;
}) {
  return async (task: OutreachTask) => {
    if (!options.apiKey || !options.from) {
      throw new Error("Missing Resend email configuration.");
    }

    const response = await options.fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${options.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: options.from,
        to: [task.recipientAddress],
        ...(options.replyTo ? { reply_to: options.replyTo } : {}),
        subject: task.subject,
        text: task.body,
        attachments: toResendAttachments(task.attachmentImagePaths, options.publicBaseUrl),
      }),
    });

    if (!response.ok) {
      throw new Error(`Resend email transport failed with status ${response.status}.`);
    }

    const payload = await safeParseJson(response);
    return {
      channelMessageId: readMessageId(payload) ?? `resend:${task.id}`,
    };
  };
}

function createWebhookTransport(options: {
  webhookUrl?: string;
  webhookToken?: string;
  fetchImpl: typeof fetch;
}) {
  return async (task: OutreachTask) => {
    if (!options.webhookUrl) {
      throw new Error("Missing OUTREACH_EMAIL_WEBHOOK_URL for email webhook transport.");
    }

    const response = await options.fetchImpl(options.webhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(options.webhookToken
          ? { authorization: `Bearer ${options.webhookToken}` }
          : {}),
      },
      body: JSON.stringify({
        taskId: task.id,
        leadId: task.leadId,
        campaignId: task.campaignId,
        channel: task.channel,
        to: task.recipientAddress,
        subject: task.subject,
        body: task.body,
        websiteUrl: task.websiteUrl,
        attachmentImagePaths: task.attachmentImagePaths,
      }),
    });

    if (!response.ok) {
      throw new Error(`Email webhook transport failed with status ${response.status}.`);
    }

    const payload = await safeParseJson(response);
    return {
      channelMessageId: readMessageId(payload) ?? `webhook:email:${task.id}`,
    };
  };
}

async function safeParseJson(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  return (await response.json()) as Record<string, unknown>;
}

function readMessageId(payload: Record<string, unknown> | null) {
  if (!payload) return null;

  const messageId = payload.messageId ?? payload.channelMessageId ?? payload.id;
  return typeof messageId === "string" && messageId.trim() ? messageId : null;
}

function toResendAttachments(paths: string[], publicBaseUrl?: string) {
  if (paths.length === 0) return [];
  if (!publicBaseUrl) {
    throw new Error("Missing OUTREACH_PUBLIC_BASE_URL for outbound media attachments.");
  }

  const baseUrl = publicBaseUrl.replace(/\/+$/, "");
  return paths.map((path) => ({
    path: `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`,
  }));
}
