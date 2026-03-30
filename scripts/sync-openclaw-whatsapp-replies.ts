import { fileURLToPath } from "node:url";

import { readLatestOpenClawWhatsAppReply, type OpenClawReadExecFile } from "../src/lib/openclaw-whatsapp-replies";
import {
  defaultOutreachDir,
  readOutreachStore,
  writeOutreachStore,
  type OutreachStore,
} from "../src/lib/outreach-store";
import { syncOutreachReplies } from "./sync-outreach-replies";

export type SyncOpenClawWhatsAppRepliesOptions = {
  outreachDir?: string;
  persist?: boolean;
  store?: OutreachStore;
  cliPath?: string;
  workspaceDir?: string;
  execFileImpl?: OpenClawReadExecFile;
  readStore?: (outreachDir: string) => Promise<OutreachStore>;
  writeStore?: (store: OutreachStore, outreachDir: string) => Promise<void>;
};

export async function syncOpenClawWhatsAppReplies(
  options: SyncOpenClawWhatsAppRepliesOptions = {},
) {
  const outreachDir = options.outreachDir ?? defaultOutreachDir;
  const readStore = options.readStore ?? readOutreachStore;
  const writeStore = options.writeStore ?? writeOutreachStore;
  const currentStore = options.store ?? (await readStore(outreachDir));
  const replies = [];

  for (const task of currentStore.tasks) {
    if (task.channel !== "whatsapp" || task.status !== "sent") continue;

    const reply = await readLatestOpenClawWhatsAppReply(task, {
      cliPath: options.cliPath,
      workspaceDir: options.workspaceDir,
      execFileImpl: options.execFileImpl,
    });

    if (reply) {
      replies.push(reply);
    }
  }

  if (replies.length === 0) {
    return {
      store: currentStore,
      handoffItems: [],
    };
  }

  const result = await syncOutreachReplies({
    outreachDir,
    persist: false,
    store: currentStore,
    replies,
  });

  if (options.persist ?? true) {
    await writeStore(result.store, outreachDir);
  }

  return result;
}

async function main() {
  const result = await syncOpenClawWhatsAppReplies(parseCliArgs(process.argv.slice(2)));
  console.log(
    JSON.stringify(
      {
        handoffItems: result.handoffItems.length,
        totalTasks: result.store.tasks.length,
      },
      null,
      2,
    ),
  );
}

function parseCliArgs(argv: string[]): SyncOpenClawWhatsAppRepliesOptions {
  if (argv.length === 1 && argv[0]?.trim().startsWith("{")) {
    return JSON.parse(argv[0]) as SyncOpenClawWhatsAppRepliesOptions;
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
