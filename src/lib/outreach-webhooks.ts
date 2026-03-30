import { Webhook } from "svix";

import type { OutreachReplySyncInput } from "@/scripts/sync-outreach-replies";

export function assertOutreachWebhookAuthorized(
  request: Request,
  options: {
    secret?: string;
    resendSigningSecret?: string;
    rawBody?: string;
  } = {},
) {
  const secret = options.secret ?? process.env.OUTREACH_WEBHOOK_SECRET;
  const resendSigningSecret =
    options.resendSigningSecret ?? process.env.OUTREACH_RESEND_WEBHOOK_SECRET;
  const provided = request.headers.get("x-outreach-webhook-secret") ?? "";

  if (secret && provided === secret) {
    return;
  }

  if (options.rawBody && resendSigningSecret && hasSvixSignatureHeaders(request)) {
    new Webhook(resendSigningSecret).verify(options.rawBody, {
      "svix-id": request.headers.get("svix-id") ?? "",
      "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
      "svix-signature": request.headers.get("svix-signature") ?? "",
    });
    return;
  }

  if (!secret && !resendSigningSecret) {
    return;
  }

  if (provided !== secret) {
    throw new Error("Unauthorized webhook request");
  }
}

export async function parseWhatsAppWebhookRequest(request: Request): Promise<OutreachReplySyncInput> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const form = await request.formData();

    return {
      channel: "whatsapp",
      channelMessageId: readString(form.get("MessageSid")) ?? readString(form.get("SmsMessageSid")) ?? "",
      recipientAddress: normalizeWhatsAppAddress(
        readString(form.get("From")) ?? readString(form.get("WaId")),
      ),
      body: readString(form.get("Body")) ?? "",
      receivedAt: undefined,
    };
  }

  const payload = (await request.json()) as Record<string, unknown>;

  return {
    channel: "whatsapp",
    channelMessageId: readString(payload.messageId) ?? readString(payload.channelMessageId) ?? "",
    recipientAddress: readString(payload.from) ?? readString(payload.recipientAddress),
    body: readString(payload.body) ?? readString(payload.text) ?? "",
    receivedAt: readString(payload.receivedAt),
  };
}

export async function parseEmailWebhookRequest(
  request: Request | string,
  options: {
    resendApiKey?: string;
    fetchImpl?: typeof fetch;
  } = {},
): Promise<OutreachReplySyncInput> {
  const payload = (
    typeof request === "string" ? JSON.parse(request) : await request.json()
  ) as Record<string, unknown>;
  const resendReply = await maybeParseResendReceivedEmail(payload, {
    resendApiKey: options.resendApiKey,
    fetchImpl: options.fetchImpl ?? fetch,
  });

  if (resendReply) {
    return resendReply;
  }

  return {
    channel: "email",
    channelMessageId:
      readString(payload.threadId) ?? readString(payload.messageId) ?? readString(payload.channelMessageId) ?? "",
    recipientAddress: readString(payload.from) ?? readString(payload.recipientAddress),
    body: readString(payload.text) ?? readString(payload.body) ?? "",
    receivedAt: readString(payload.receivedAt),
  };
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readNestedString(record: Record<string, unknown>, key: string) {
  return readString(record[key]);
}

function normalizeWhatsAppAddress(value?: string) {
  if (!value) return undefined;
  return value.replace(/^whatsapp:/i, "");
}

function hasSvixSignatureHeaders(request: Request) {
  return Boolean(
    request.headers.get("svix-id")
      && request.headers.get("svix-timestamp")
      && request.headers.get("svix-signature"),
  );
}

async function maybeParseResendReceivedEmail(
  payload: Record<string, unknown>,
  options: {
    resendApiKey?: string;
    fetchImpl: typeof fetch;
  },
): Promise<OutreachReplySyncInput | null> {
  if (readString(payload.type) !== "email.received") {
    return null;
  }

  const data = isRecord(payload.data) ? payload.data : null;
  if (!data) {
    return null;
  }

  const emailId = readNestedString(data, "email_id");
  const recipientAddress = readNestedString(data, "from");
  const channelMessageId =
    readNestedString(data, "thread_id") ?? readNestedString(data, "message_id") ?? "";
  const receivedAt = readNestedString(data, "created_at");
  const inlineBody =
    readNestedString(data, "text") ?? readNestedString(data, "body");
  const fetchedBody = emailId
    ? await fetchResendReceivedEmailText(emailId, options)
    : undefined;

  return {
    channel: "email",
    channelMessageId,
    recipientAddress,
    body: inlineBody ?? fetchedBody ?? "",
    receivedAt,
  };
}

async function fetchResendReceivedEmailText(
  emailId: string,
  options: {
    resendApiKey?: string;
    fetchImpl: typeof fetch;
  },
) {
  if (!options.resendApiKey) {
    return undefined;
  }

  const response = await options.fetchImpl(`https://api.resend.com/emails/${emailId}`, {
    headers: {
      authorization: `Bearer ${options.resendApiKey}`,
    },
  });

  if (!response.ok) {
    return undefined;
  }

  const payload = (await response.json()) as Record<string, unknown>;
  return readString(payload.text) ?? readString(payload.body);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
