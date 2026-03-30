import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";

import { normalizeWhatsAppRecipientAddress } from "@/src/lib/outreach-addresses";
import { createOutreachSender, type OutreachChannelTransport } from "@/src/lib/outreach-senders";
import type { OutreachTask } from "@/src/lib/outreach-types";

const execFileAsync = promisify(execFile);

export type OpenClawExecFile = typeof execFileAsync;

export type ConfiguredOpenClawWhatsAppSenderOptions = {
  env?: Record<string, string | undefined>;
  execFileImpl?: OpenClawExecFile;
};

export function createOpenClawWhatsAppSender(transport?: OutreachChannelTransport) {
  return createOutreachSender("whatsapp", transport);
}

export function createConfiguredOpenClawWhatsAppSender(
  options: ConfiguredOpenClawWhatsAppSenderOptions = {},
) {
  const env = options.env ?? process.env;
  const execImpl = options.execFileImpl ?? execFileAsync;

  return createOpenClawWhatsAppSender(async (task) =>
    sendWhatsAppMessageViaOpenClaw(task, {
      cliPath:
        env.OUTREACH_OPENCLAW_CLI_PATH ?? "/Users/nason/.openclaw/bin/openclaw",
      workspaceDir:
        env.OUTREACH_OPENCLAW_WORKSPACE ?? "/Users/nason/.openclaw/workspace",
      execFileImpl: execImpl,
      dryRun: env.OUTREACH_OPENCLAW_DRY_RUN === "true",
    }),
  );
}

async function sendWhatsAppMessageViaOpenClaw(
  task: OutreachTask,
  options: {
    cliPath: string;
    workspaceDir: string;
    execFileImpl: OpenClawExecFile;
    dryRun: boolean;
  },
) {
  const args = [
    "message",
    "send",
    "--channel",
    "whatsapp",
    "--target",
    normalizeWhatsAppRecipientAddress(task.recipientAddress),
    "--message",
    task.body,
    "--json",
  ];

  if (options.dryRun) {
    args.push("--dry-run");
  }

  for (const mediaPath of toOpenClawMediaPaths(task.attachmentImagePaths)) {
    args.push("--media", mediaPath);
  }

  const { stdout } = await options.execFileImpl(options.cliPath, args, {
    cwd: options.workspaceDir,
  });
  const parsed = safeParseJson(stdout);

  return {
    channelMessageId: readMessageId(parsed) ?? `openclaw:${task.id}`,
  };
}

function safeParseJson(stdout: string) {
  try {
    return JSON.parse(stdout) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readMessageId(payload: Record<string, unknown> | null) {
  if (!payload) return null;

  const messageId = payload.messageId ?? payload.channelMessageId ?? payload.id;
  return typeof messageId === "string" && messageId.trim() ? messageId : null;
}

function toOpenClawMediaPaths(paths: string[]) {
  return paths.map((path) =>
    resolve(process.cwd(), "public", path.replace(/^\/+/, "")),
  );
}
