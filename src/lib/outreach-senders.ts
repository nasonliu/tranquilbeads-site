import type { OutreachChannel, OutreachTask } from "@/src/lib/outreach-types";

export type OutreachSendMetadata = {
  channelMessageId?: string;
};

export type OutreachSendResult = {
  taskId: string;
  leadId: string;
  campaignId: string;
  channel: OutreachChannel;
  variant: OutreachTask["variant"];
  status: "sent";
  sentAt: string;
  attachmentImagePaths: string[];
  channelMessageId?: string;
};

export type OutreachChannelTransportResult =
  | string
  | void
  | OutreachSendMetadata
  | Promise<string | void | OutreachSendMetadata>;

export type OutreachChannelTransport = (task: OutreachTask) => OutreachChannelTransportResult;

export type OutreachSender = {
  channel: OutreachChannel;
  send(task: OutreachTask): Promise<OutreachSendResult>;
};

export function createOutreachSender(
  channel: OutreachChannel,
  transport?: OutreachChannelTransport,
): OutreachSender {
  return {
    channel,
    async send(task: OutreachTask) {
      assertQueuedTask(task);
      assertTaskHasRecipient(task);
      assertSenderMatchesTask(task, channel);

      const sentAt = new Date().toISOString();
      const transportResult = await transport?.(task);

      return buildSentOutreachResult(task, sentAt, normalizeChannelMessageId(transportResult));
    },
  };
}

export async function sendQueuedOutreachTask(
  task: OutreachTask,
  sender: OutreachSender,
): Promise<OutreachSendResult> {
  assertQueuedTask(task);
  assertTaskHasRecipient(task);
  assertSenderMatchesTask(task, sender.channel);
  return sender.send(task);
}

export function buildSentOutreachResult(
  task: OutreachTask,
  sentAt: string,
  channelMessageId?: string,
): OutreachSendResult {
  return {
    taskId: task.id,
    leadId: task.leadId,
    campaignId: task.campaignId,
    channel: task.channel,
    variant: task.variant,
    status: "sent",
    sentAt,
    attachmentImagePaths: [...task.attachmentImagePaths],
    channelMessageId,
  };
}

function assertQueuedTask(task: OutreachTask) {
  if (task.status !== "queued") {
    throw new Error(`Expected a queued outreach task, received ${task.status}.`);
  }
}

function assertSenderMatchesTask(task: OutreachTask, channel: OutreachChannel) {
  if (task.channel !== channel) {
    throw new Error(
      `Expected a ${channel} sender for task ${task.id}, received ${task.channel}.`,
    );
  }
}

function assertTaskHasRecipient(task: OutreachTask) {
  if (!task.recipientAddress.trim()) {
    throw new Error(`Expected a recipient address for task ${task.id}.`);
  }
}

function normalizeChannelMessageId(
  result: Awaited<OutreachChannelTransportResult> | undefined,
) {
  if (!result) return undefined;
  if (typeof result === "string") return result;
  return result.channelMessageId;
}
