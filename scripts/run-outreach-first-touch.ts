import { fileURLToPath } from "node:url";

import { createConfiguredEmailOutreachSender } from "../src/lib/email-outreach";
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
  const senders = options.senders ?? createDefaultSenders(options);
  const result = await processQueuedOutreachTasks(currentStore, senders);

  if (options.persist ?? true) {
    await writeStore(result.store, outreachDir);
  }

  return result;
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
