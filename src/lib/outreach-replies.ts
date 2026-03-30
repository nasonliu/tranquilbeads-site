import {
  applyOutreachTaskChanges,
  type OutreachStore,
} from "@/src/lib/outreach-store";
import { normalizeRecipientAddressByChannel } from "@/src/lib/outreach-addresses";
import { assertCanTransitionTaskStatus } from "@/src/lib/outreach-state";
import type {
  OutreachChannel,
  OutreachEvent,
  OutreachTask,
} from "@/src/lib/outreach-types";

export type OutreachReplyInput = {
  channelMessageId: string;
  recipientAddress?: string;
  body: string;
  receivedAt?: string;
};

export function ingestWhatsAppReply(
  store: OutreachStore,
  reply: OutreachReplyInput,
): OutreachStore {
  return ingestChannelReply(store, "whatsapp", reply);
}

export function ingestEmailReply(
  store: OutreachStore,
  reply: OutreachReplyInput,
): OutreachStore {
  return ingestChannelReply(store, "email", reply);
}

function ingestChannelReply(
  store: OutreachStore,
  channel: OutreachChannel,
  reply: OutreachReplyInput,
): OutreachStore {
  const task = findReplyTask(store.tasks, channel, reply);

  if (!task) {
    throw new Error(
      `No sent ${channel} task found for channelMessageId ${reply.channelMessageId}.`,
    );
  }

  if (task.status === "needs_human_followup") {
    return store;
  }

  if (task.status !== "sent") {
    throw new Error(
      `Expected a sent outreach task for reply ingestion, received ${task.status}.`,
    );
  }

  const receivedAt = reply.receivedAt ?? new Date().toISOString();
  const repliedTask = markTaskReplied(task, receivedAt);
  const followUpTask = markTaskNeedsHumanFollowup(repliedTask);
  const events = [
    createReplyDetectedEvent(task, reply, receivedAt),
    createHandoffCreatedEvent(task, reply, receivedAt),
  ];

  return applyOutreachTaskChanges(store, {
    tasks: [followUpTask],
    events,
  });
}

function findReplyTask(
  tasks: OutreachTask[],
  channel: OutreachChannel,
  reply: OutreachReplyInput,
) {
  const normalizedMessageId = reply.channelMessageId.trim();
  const normalizedRecipient = normalizeRecipientAddress(channel, reply.recipientAddress);

  return tasks.find(
    (task) =>
      task.channel === channel &&
      ((normalizedMessageId.length > 0 && task.channelMessageId === normalizedMessageId) ||
        (normalizedRecipient.length > 0 &&
          normalizeRecipientAddress(channel, task.recipientAddress) === normalizedRecipient)) &&
      (task.status === "sent" || task.status === "needs_human_followup"),
  );
}

function markTaskReplied(task: OutreachTask, receivedAt: string): OutreachTask {
  assertCanTransitionTaskStatus(task.status, "replied", "automatic");

  return {
    ...task,
    status: "replied",
    lastReplyAt: receivedAt,
  };
}

function markTaskNeedsHumanFollowup(task: OutreachTask): OutreachTask {
  assertCanTransitionTaskStatus(task.status, "needs_human_followup", "automatic");

  return {
    ...task,
    status: "needs_human_followup",
    needsHumanFollowup: true,
  };
}

function createReplyDetectedEvent(
  task: OutreachTask,
  reply: OutreachReplyInput,
  receivedAt: string,
): OutreachEvent {
  return {
    id: `${task.id}-reply-detected`,
    taskId: task.id,
    type: "reply_detected",
    payload: {
      channel: task.channel,
      channelMessageId: reply.channelMessageId,
      recipientAddress: reply.recipientAddress ?? task.recipientAddress,
      body: reply.body,
      receivedAt,
    },
    createdAt: receivedAt,
  };
}

function createHandoffCreatedEvent(
  task: OutreachTask,
  reply: OutreachReplyInput,
  receivedAt: string,
): OutreachEvent {
  return {
    id: `${task.id}-handoff-created`,
    taskId: task.id,
    type: "handoff_created",
    payload: {
      channel: task.channel,
      channelMessageId: reply.channelMessageId,
      recipientAddress: reply.recipientAddress ?? task.recipientAddress,
      receivedAt,
    },
    createdAt: receivedAt,
  };
}

function normalizeRecipientAddress(channel: OutreachChannel, value?: string) {
  return normalizeRecipientAddressByChannel(channel, value ?? "");
}
