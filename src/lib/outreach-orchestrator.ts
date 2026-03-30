import {
  applyOutreachTaskChanges,
  type OutreachStore,
} from "@/src/lib/outreach-store";
import {
  assertCanTransitionTaskStatus,
} from "@/src/lib/outreach-state";
import type {
  OutreachChannel,
  OutreachEvent,
  OutreachTask,
} from "@/src/lib/outreach-types";
import {
  sendQueuedOutreachTask,
  type OutreachSendResult,
  type OutreachSender,
} from "@/src/lib/outreach-senders";

export type OutreachSenderRegistry = Partial<Record<OutreachChannel, OutreachSender>>;

export type ProcessQueuedOutreachTasksResult = {
  store: OutreachStore;
  sentResults: OutreachSendResult[];
  failedTaskIds: string[];
};

export async function processQueuedOutreachTasks(
  store: OutreachStore,
  senders: OutreachSenderRegistry,
): Promise<ProcessQueuedOutreachTasksResult> {
  const queuedTasks = store.tasks.filter((task) => task.status === "queued");
  let nextStore = store;
  const sentResults: OutreachSendResult[] = [];
  const failedTaskIds: string[] = [];
  const events: OutreachEvent[] = [];

  for (const task of queuedTasks) {
    const sender = senders[task.channel];

    if (!sender) {
      const reason = `No sender registered for ${task.channel}.`;
      const failedTask = markTaskFailed(task, reason);
      nextStore = applyOutreachTaskChanges(nextStore, {
        tasks: [failedTask],
      });
      failedTaskIds.push(task.id);
      events.push(createFailedTaskEvent(task, reason));
      continue;
    }

    try {
      const result = await sendQueuedOutreachTask(task, sender);
      const sentTask = markTaskSent(task, result.sentAt, result.channelMessageId);
      nextStore = applyOutreachTaskChanges(nextStore, {
        tasks: [sentTask],
      });
      sentResults.push(result);
      events.push(createSentTaskEvent(task, result));
    } catch (error) {
      const reason = getFailureReason(error);
      const failedTask = markTaskFailed(task, reason);
      nextStore = applyOutreachTaskChanges(nextStore, {
        tasks: [failedTask],
      });
      failedTaskIds.push(task.id);
      events.push(createFailedTaskEvent(task, reason));
    }
  }

  if (events.length > 0) {
    nextStore = applyOutreachTaskChanges(nextStore, {
      events,
    });
  }

  return {
    store: nextStore,
    sentResults,
    failedTaskIds,
  };
}

function markTaskSent(
  task: OutreachTask,
  sentAt: string,
  channelMessageId?: string,
): OutreachTask {
  assertCanTransitionTaskStatus(task.status, "sent", "automatic");

  return {
    ...task,
    status: "sent",
    channelMessageId: channelMessageId ?? null,
    sentAt,
    failureReason: null,
  };
}

function markTaskFailed(task: OutreachTask, failureReason: string): OutreachTask {
  assertCanTransitionTaskStatus(task.status, "failed", "automatic");

  return {
    ...task,
    status: "failed",
    failureReason,
  };
}

function createSentTaskEvent(task: OutreachTask, result: OutreachSendResult): OutreachEvent {
  return {
    id: `${task.id}-sent`,
    taskId: task.id,
    type: "sent",
    payload: {
      channel: task.channel,
      sentAt: result.sentAt,
      channelMessageId: result.channelMessageId ?? null,
    },
    createdAt: result.sentAt,
  };
}

function createFailedTaskEvent(task: OutreachTask, reason: string): OutreachEvent {
  const createdAt = new Date().toISOString();

  return {
    id: `${task.id}-failed`,
    taskId: task.id,
    type: "failed",
    payload: {
      channel: task.channel,
      reason,
    },
    createdAt,
  };
}

function getFailureReason(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Unknown outreach send failure.";
}
