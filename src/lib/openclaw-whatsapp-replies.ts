import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { OutreachReplySyncInput } from "@/scripts/sync-outreach-replies";
import { normalizeWhatsAppRecipientAddress } from "@/src/lib/outreach-addresses";
import type { OutreachTask } from "@/src/lib/outreach-types";

const execFileAsync = promisify(execFile);

export type OpenClawReadExecFile = typeof execFileAsync;

export async function readLatestOpenClawWhatsAppReply(
  task: Pick<OutreachTask, "recipientAddress" | "channelMessageId" | "sentAt">,
  options: {
    cliPath?: string;
    workspaceDir?: string;
    execFileImpl?: OpenClawReadExecFile;
    limit?: number;
  } = {},
): Promise<OutreachReplySyncInput | null> {
  const execImpl = options.execFileImpl ?? execFileAsync;
  const cliPath = options.cliPath ?? "/Users/nason/.openclaw/bin/openclaw";
  const workspaceDir = options.workspaceDir ?? "/Users/nason/.openclaw/workspace";
  const args = [
    "message",
    "read",
    "--channel",
    "whatsapp",
    "--target",
    task.recipientAddress,
    "--limit",
    String(options.limit ?? 10),
    "--json",
  ];

  const { stdout } = await execImpl(cliPath, args, { cwd: workspaceDir });
  return findLatestInboundReply(stdout, task);
}

function findLatestInboundReply(
  stdout: string,
  task: Pick<OutreachTask, "recipientAddress" | "channelMessageId" | "sentAt">,
): OutreachReplySyncInput | null {
  const payload = safeParseJson(stdout);
  const messages = readMessages(payload);
  const sentAtMs = task.sentAt ? Date.parse(task.sentAt) : Number.NEGATIVE_INFINITY;
  const target = normalizeAddress(task.recipientAddress);

  const inbound = messages
    .map(normalizeMessageRecord)
    .filter((message): message is NormalizedMessageRecord => Boolean(message))
    .filter((message) => message.direction === "inbound")
    .filter((message) => normalizeAddress(message.from) === target || target.length === 0)
    .filter((message) => {
      const messageMs = message.receivedAt ? Date.parse(message.receivedAt) : Number.POSITIVE_INFINITY;
      return Number.isNaN(messageMs) ? true : messageMs >= sentAtMs;
    })
    .sort((left, right) => {
      const leftMs = left.receivedAt ? Date.parse(left.receivedAt) : 0;
      const rightMs = right.receivedAt ? Date.parse(right.receivedAt) : 0;
      return rightMs - leftMs;
    })[0];

  if (!inbound) {
    return null;
  }

  return {
    channel: "whatsapp",
    channelMessageId: inbound.id ?? task.channelMessageId ?? "",
    recipientAddress: inbound.from ?? task.recipientAddress,
    body: inbound.body,
    receivedAt: inbound.receivedAt,
  };
}

type NormalizedMessageRecord = {
  id?: string;
  from?: string;
  body: string;
  direction: "inbound" | "outbound";
  receivedAt?: string;
};

function normalizeMessageRecord(value: unknown): NormalizedMessageRecord | null {
  if (!isRecord(value)) return null;

  const body =
    readString(value.text) ??
    readString(value.body) ??
    readString(value.message) ??
    readString(value.content);
  if (!body) return null;

  const rawDirection =
    readString(value.direction) ??
    readString(value.type) ??
    readString(value.kind);
  const direction = rawDirection?.toLowerCase().includes("in")
    ? "inbound"
    : rawDirection?.toLowerCase().includes("out")
      ? "outbound"
      : readBoolean(value.isInbound)
        ? "inbound"
        : "outbound";

  return {
    id: readString(value.id) ?? readString(value.messageId),
    from: stripWhatsAppPrefix(readString(value.from) ?? readString(value.author) ?? readString(value.sender)),
    body,
    direction,
    receivedAt:
      readString(value.timestamp) ??
      readString(value.createdAt) ??
      readString(value.receivedAt),
  };
}

function readMessages(payload: unknown) {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) return [];

  const messages = payload.messages;
  return Array.isArray(messages) ? messages : [];
}

function safeParseJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readBoolean(value: unknown) {
  return typeof value === "boolean" ? value : false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stripWhatsAppPrefix(value?: string) {
  return value?.replace(/^whatsapp:/i, "");
}

function normalizeAddress(value?: string) {
  return normalizeWhatsAppRecipientAddress(stripWhatsAppPrefix(value) ?? "");
}
