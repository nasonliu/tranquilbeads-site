import { fileURLToPath } from "node:url";

import { createConfiguredEmailOutreachSender } from "../src/lib/email-outreach";
import { filterQueuedEmailTasksForDelivery } from "../src/lib/outreach-guardrails";
import { processQueuedOutreachTasks, type OutreachSenderRegistry } from "../src/lib/outreach-orchestrator";
import {
  defaultOutreachDir,
  readOutreachStore,
  writeOutreachStore,
  type OutreachStore,
} from "../src/lib/outreach-store";
import { createConfiguredWhatsAppOutreachSender } from "../src/lib/whatsapp-outreach";

export type RunOutreachFirstTouchOptions = {
  outreachDir?: string;
  persist?: boolean;
  store?: OutreachStore;
  senders?: OutreachSenderRegistry;
  fetchImpl?: typeof fetch;
  execFileImpl?: Parameters<typeof createConfiguredWhatsAppOutreachSender>[0]["execFileImpl"];
  readStore?: (outreachDir: string) => Promise<OutreachStore>;
  writeStore?: (store: OutreachStore, outreachDir: string) => Promise<void>;
};

export type RunOutreachFirstTouchResult = Awaited<ReturnType<typeof processQueuedOutreachTasks>>;

export async function runOutreachFirstTouch(
  options: RunOutreachFirstTouchOptions = {},
): Promise<RunOutreachFirstTouchResult> {
  const outreachDir = options.outreachDir ?? defaultOutreachDir;
  const readStore = options.readStore ?? readOutreachStore;
  const writeStore = options.writeStore ?? writeOutreachStore;
  const currentStore = options.store ?? (await readStore(outreachDir));
  const guardedStore = applyEmailGuardrails(currentStore);
  const senders = options.senders ?? createDefaultSenders(options);
  const result = await processQueuedOutreachTasks(guardedStore, senders);

  if (options.persist ?? true) {
    await writeStore(mergeGuardedResult(currentStore, result.store), outreachDir);
  }

  return {
    ...result,
    store: mergeGuardedResult(currentStore, result.store),
  };
}

function createDefaultSenders(
  options: Pick<RunOutreachFirstTouchOptions, "fetchImpl" | "execFileImpl">,
): OutreachSenderRegistry {
  return {
    whatsapp: createConfiguredWhatsAppOutreachSender({
      fetchImpl: options.fetchImpl,
      execFileImpl: options.execFileImpl,
    }),
    email: createConfiguredEmailOutreachSender({
      fetchImpl: options.fetchImpl,
    }),
  };
}

function applyEmailGuardrails(store: OutreachStore) {
  const maxPerDay = readDailyEmailLimit(process.env);
  const { allowedTasks } = filterQueuedEmailTasksForDelivery(store, {
    suppressions: store.suppressions,
    maxPerDay,
  });
  const allowedTaskIds = new Set(allowedTasks.map((task) => task.id));

  return {
    ...store,
    tasks: store.tasks.map((task) =>
      task.channel === "email" && task.status === "queued" && !allowedTaskIds.has(task.id)
        ? { ...task, status: "draft" as const }
        : task,
    ),
  };
}

function mergeGuardedResult(originalStore: OutreachStore, guardedResultStore: OutreachStore) {
  const resultTasksById = new Map(guardedResultStore.tasks.map((task) => [task.id, task] as const));

  return {
    ...guardedResultStore,
    tasks: originalStore.tasks.map((task) => {
      const updatedTask = resultTasksById.get(task.id);

      if (!updatedTask) {
        return task;
      }

      if (
        task.channel === "email" &&
        task.status === "queued" &&
        updatedTask.status === "draft"
      ) {
        return task;
      }

      return updatedTask;
    }),
  };
}

function readDailyEmailLimit(env: NodeJS.ProcessEnv) {
  const parsed = Number.parseInt(env.OUTREACH_EMAIL_DAILY_LIMIT ?? "20", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 20;
}

async function main() {
  const result = await runOutreachFirstTouch(parseCliArgs(process.argv.slice(2)));
  console.log(
    JSON.stringify(
      {
        sentResults: result.sentResults.length,
        failedTaskIds: result.failedTaskIds,
        totalTasks: result.store.tasks.length,
      },
      null,
      2,
    ),
  );
}

function parseCliArgs(argv: string[]): RunOutreachFirstTouchOptions {
  if (argv.length === 1 && argv[0]?.trim().startsWith("{")) {
    return JSON.parse(argv[0]) as RunOutreachFirstTouchOptions;
  }

  return {};
}

const isMain = fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  void main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
