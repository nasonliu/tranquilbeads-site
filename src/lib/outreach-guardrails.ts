import type { OutreachChannel, OutreachStore, OutreachTask, SuppressionEntry } from "@/src/lib/outreach-types";

export type FilterQueuedEmailTasksOptions = {
  suppressions: SuppressionEntry[];
  maxPerDay: number;
  now?: string;
};

export function applyComplianceFooter(
  channel: OutreachChannel,
  body: string,
  locale: "en" | "ar",
) {
  if (channel !== "email") {
    return body;
  }

  const footer =
    locale === "ar"
      ? "إذا كنتم لا ترغبون في تلقي رسائل أخرى منا، يرجى الرد بكلمة unsubscribe وسنقوم بإزالتكم من المتابعات القادمة."
      : "If you prefer not to receive further emails from us, please reply with unsubscribe and we will remove you from future outreach.";

  return `${body}\n\n${footer}`;
}

export function countEmailSendsOnDate(store: OutreachStore, now: string) {
  const dateKey = now.slice(0, 10);

  return store.tasks.filter(
    (task) =>
      task.channel === "email" &&
      task.status === "sent" &&
      task.sentAt?.startsWith(dateKey),
  ).length;
}

export function filterQueuedEmailTasksForDelivery(
  store: OutreachStore,
  options: FilterQueuedEmailTasksOptions,
) {
  const now = options.now ?? new Date().toISOString();
  const suppressedAddresses = new Set(
    options.suppressions
      .filter((entry) => entry.channel === "email")
      .map((entry) => normalizeAddress(entry.address)),
  );
  let remaining = Math.max(options.maxPerDay - countEmailSendsOnDate(store, now), 0);
  const blockedTasks: Array<{ taskId: string; reason: string }> = [];
  const allowedTasks: OutreachTask[] = [];

  for (const task of store.tasks) {
    if (task.channel !== "email" || task.status !== "queued") {
      continue;
    }

    if (suppressedAddresses.has(normalizeAddress(task.recipientAddress))) {
      blockedTasks.push({
        taskId: task.id,
        reason: "Blocked by email suppression list.",
      });
      continue;
    }

    if (remaining <= 0) {
      blockedTasks.push({
        taskId: task.id,
        reason: "Blocked by daily email cap.",
      });
      continue;
    }

    allowedTasks.push(task);
    remaining -= 1;
  }

  return {
    allowedTasks,
    blockedTasks,
  };
}

function normalizeAddress(value: string) {
  return value.trim().toLowerCase();
}
