import { createOutreachSender, type OutreachChannelTransport } from "@/src/lib/outreach-senders";
import { normalizeWhatsAppRecipientAddress } from "@/src/lib/outreach-addresses";
import { createConfiguredOpenClawWhatsAppSender, type OpenClawExecFile } from "@/src/lib/openclaw-whatsapp";
import type { OutreachTask } from "@/src/lib/outreach-types";

export type ConfiguredWhatsAppSenderOptions = {
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  execFileImpl?: OpenClawExecFile;
};

export function createWhatsAppOutreachSender(transport?: OutreachChannelTransport) {
  return createOutreachSender("whatsapp", transport);
}

export function createConfiguredWhatsAppOutreachSender(
  options: ConfiguredWhatsAppSenderOptions = {},
) {
  const env = options.env ?? process.env;
  const provider = env.OUTREACH_WHATSAPP_PROVIDER ?? "dry_run";

  if (provider === "openclaw") {
    return createConfiguredOpenClawWhatsAppSender({
      env,
      execFileImpl: options.execFileImpl,
    });
  }

  if (provider === "twilio") {
    return createWhatsAppOutreachSender(
      createTwilioTransport({
        accountSid: env.OUTREACH_TWILIO_ACCOUNT_SID,
        authToken: env.OUTREACH_TWILIO_AUTH_TOKEN,
        fromNumber: env.OUTREACH_TWILIO_WHATSAPP_FROM,
        publicBaseUrl: env.OUTREACH_PUBLIC_BASE_URL,
        fetchImpl: options.fetchImpl ?? fetch,
      }),
    );
  }

  if (provider === "webhook") {
    return createWhatsAppOutreachSender(
      createWebhookTransport({
        webhookUrl: env.OUTREACH_WHATSAPP_WEBHOOK_URL,
        webhookToken: env.OUTREACH_WHATSAPP_WEBHOOK_TOKEN,
        fetchImpl: options.fetchImpl ?? fetch,
      }),
    );
  }

  return createWhatsAppOutreachSender(async (task) => ({
    channelMessageId: `dryrun:whatsapp:${task.id}`,
  }));
}

function createTwilioTransport(options: {
  accountSid?: string;
  authToken?: string;
  fromNumber?: string;
  publicBaseUrl?: string;
  fetchImpl: typeof fetch;
}) {
  return async (task: OutreachTask) => {
    if (!options.accountSid || !options.authToken || !options.fromNumber) {
      throw new Error("Missing Twilio WhatsApp configuration.");
    }

    const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${options.accountSid}/Messages.json`;
    const body = new URLSearchParams();
    body.set("To", toWhatsAppAddress(task.recipientAddress));
    body.set("From", toWhatsAppAddress(options.fromNumber));
    body.set("Body", task.body);

    for (const attachment of toPublicAttachmentUrls(task.attachmentImagePaths, options.publicBaseUrl)) {
      body.append("MediaUrl", attachment);
    }

    const basicAuth = Buffer.from(`${options.accountSid}:${options.authToken}`).toString("base64");
    const response = await options.fetchImpl(endpoint, {
      method: "POST",
      headers: {
        authorization: `Basic ${basicAuth}`,
      },
      body,
    });

    if (!response.ok) {
      throw new Error(`Twilio WhatsApp transport failed with status ${response.status}.`);
    }

    const payload = await safeParseJson(response);
    return {
      channelMessageId: readMessageId(payload) ?? `twilio:${task.id}`,
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
      throw new Error("Missing OUTREACH_WHATSAPP_WEBHOOK_URL for WhatsApp webhook transport.");
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
        body: task.body,
        websiteUrl: task.websiteUrl,
        attachmentImagePaths: task.attachmentImagePaths,
      }),
    });

    if (!response.ok) {
      throw new Error(`WhatsApp webhook transport failed with status ${response.status}.`);
    }

    const payload = await safeParseJson(response);
    return {
      channelMessageId:
        readMessageId(payload) ?? `webhook:whatsapp:${task.id}`,
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

  const messageId = payload.messageId ?? payload.channelMessageId ?? payload.sid ?? payload.id;
  return typeof messageId === "string" && messageId.trim() ? messageId : null;
}

function toWhatsAppAddress(value: string) {
  const normalized = normalizeWhatsAppRecipientAddress(value).replace(/^whatsapp:/i, "");
  return `whatsapp:${normalized}`;
}

function toPublicAttachmentUrls(paths: string[], publicBaseUrl?: string) {
  if (paths.length === 0) return [];
  if (!publicBaseUrl) {
    throw new Error("Missing OUTREACH_PUBLIC_BASE_URL for outbound media attachments.");
  }

  const baseUrl = publicBaseUrl.replace(/\/+$/, "");
  return paths.map((path) => `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`);
}
