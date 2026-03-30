import { fileURLToPath } from "node:url";

import { buildHumanHandoffItem } from "../src/lib/outreach-handoff";
import { ingestEmailReply, ingestWhatsAppReply, type OutreachReplyInput } from "../src/lib/outreach-replies";
import {
  defaultOutreachDir,
  readOutreachStore,
  writeOutreachStore,
  type OutreachStore,
} from "../src/lib/outreach-store";
import type { OutreachChannel, OutreachLead } from "../src/lib/outreach-types";

export type OutreachReplySyncInput = OutreachReplyInput & {
  channel: OutreachChannel;
};

export type SyncOutreachRepliesOptions = {
  replies: OutreachReplySyncInput[];
  outreachDir?: string;
  persist?: boolean;
  store?: OutreachStore;
  readStore?: (outreachDir: string) => Promise<OutreachStore>;
  writeStore?: (store: OutreachStore, outreachDir: string) => Promise<void>;
};

export type SyncOutreachRepliesResult = {
  store: OutreachStore;
  handoffItems: ReturnType<typeof buildHumanHandoffItem>[];
};

export async function syncOutreachReplies(
  options: SyncOutreachRepliesOptions,
): Promise<SyncOutreachRepliesResult> {
  const outreachDir = options.outreachDir ?? defaultOutreachDir;
  const readStore = options.readStore ?? readOutreachStore;
  const writeStore = options.writeStore ?? writeOutreachStore;
  let currentStore = options.store ?? (await readStore(outreachDir));
  const handoffItems: ReturnType<typeof buildHumanHandoffItem>[] = [];

  for (const reply of options.replies) {
    const existingTask = findReplyTask(currentStore, reply);

    if (!existingTask) {
      throw new Error(
        `No sent ${reply.channel} task found for channelMessageId ${reply.channelMessageId}.`,
      );
    }

    if (existingTask.status === "needs_human_followup") {
      continue;
    }

    const nextStore = ingestReply(currentStore, reply);
    const updatedTask = findReplyTask(nextStore, reply);
    const lead = findLeadById(nextStore, updatedTask.leadId);

    handoffItems.push(
      buildHumanHandoffItem({
        lead,
        task: updatedTask,
        latestReply: {
          body: reply.body,
          receivedAt: reply.receivedAt ?? updatedTask.lastReplyAt ?? new Date().toISOString(),
          channelMessageId: reply.channelMessageId,
        },
      }),
    );

    currentStore = nextStore;
  }

  if (options.persist ?? true) {
    await writeStore(currentStore, outreachDir);
  }

  return {
    store: currentStore,
    handoffItems,
  };
}

function ingestReply(store: OutreachStore, reply: OutreachReplySyncInput): OutreachStore {
  if (reply.channel === "whatsapp") {
    return ingestWhatsAppReply(store, reply);
  }

  return ingestEmailReply(store, reply);
}

function findReplyTask(store: OutreachStore, reply: OutreachReplySyncInput) {
  const normalizedMessageId = reply.channelMessageId.trim();
  const normalizedRecipient = (reply.recipientAddress ?? "").trim().toLowerCase();

  return store.tasks.find(
    (task) =>
      task.channel === reply.channel &&
      ((normalizedMessageId.length > 0 && task.channelMessageId === normalizedMessageId) ||
        (normalizedRecipient.length > 0 &&
          task.recipientAddress.trim().toLowerCase() === normalizedRecipient)) &&
      task.status !== "failed",
  );
}

function findLeadById(store: OutreachStore, leadId: string): Pick<
  OutreachLead,
  "id" | "sourceType" | "sourcePath" | "company" | "contactName" | "country"
> {
  const lead = store.leads.find((item) => item.id === leadId);

  if (!lead) {
    throw new Error(`No lead found for reply task leadId ${leadId}.`);
  }

  return lead;
}

async function main() {
  const result = await syncOutreachReplies(parseCliArgs(process.argv.slice(2)));
  console.log(
    JSON.stringify(
      {
        handoffItems: result.handoffItems.length,
        totalTasks: result.store.tasks.length,
        totalEvents: result.store.events.length,
      },
      null,
      2,
    ),
  );
}

function parseCliArgs(argv: string[]): SyncOutreachRepliesOptions {
  if (argv.length === 1 && argv[0]?.trim().startsWith("{")) {
    return JSON.parse(argv[0]) as SyncOutreachRepliesOptions;
  }

  return {
    replies: [],
  };
}

const isMain = fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  void main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
