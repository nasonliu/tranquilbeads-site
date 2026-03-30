import { fileURLToPath } from "node:url";

import { buildOutreachTaskBundle, sortOutreachLeadsForTaskCreation } from "../src/lib/outreach-task-factory";
import {
  defaultOutreachDir,
  readOutreachStore,
  writeOutreachStore,
  persistOutreachTaskBundle,
  type OutreachStore,
} from "../src/lib/outreach-store";
import type { OutreachCampaign, OutreachLead } from "../src/lib/outreach-types";

export type QueueOutreachTasksOptions = {
  outreachDir?: string;
  websiteUrl: string;
  campaign: OutreachCampaign;
  persist?: boolean;
  store?: OutreachStore;
  readStore?: (outreachDir: string) => Promise<OutreachStore>;
  writeStore?: (store: OutreachStore, outreachDir: string) => Promise<void>;
};

export type QueueOutreachTasksResult = {
  store: OutreachStore;
  queuedLeadIds: string[];
  queuedTaskIds: string[];
};

export async function queueOutreachTasks(
  options: QueueOutreachTasksOptions,
): Promise<QueueOutreachTasksResult> {
  const outreachDir = options.outreachDir ?? defaultOutreachDir;
  const readStore = options.readStore ?? readOutreachStore;
  const writeStore = options.writeStore ?? writeOutreachStore;
  const currentStore = options.store ?? (await readStore(outreachDir));
  let nextStore: OutreachStore = {
    ...currentStore,
    campaigns: upsertCampaign(currentStore.campaigns, options.campaign),
  };

  const queuedLeadIds: string[] = [];
  const queuedTaskIds: string[] = [];
  const existingTaskIds = new Set(nextStore.tasks.map((task) => task.id));

  for (const lead of sortOutreachLeadsForTaskCreation(nextStore.leads)) {
    if (!isEligibleLead(lead)) continue;

    const bundle = buildOutreachTaskBundle({
      lead,
      campaignId: options.campaign.id,
      websiteUrl: options.websiteUrl,
    });
    const newTasks = bundle.queuedTasks.filter((task) => {
      if (!options.campaign.channels.includes(task.channel)) return false;
      if (existingTaskIds.has(task.id)) return false;
      if (!task.recipientAddress.trim()) return false;
      return true;
    });

    if (newTasks.length === 0) continue;

    nextStore = persistOutreachTaskBundle(
      nextStore,
      {
        ...bundle,
        queuedTasks: newTasks,
      },
      "queued",
    );

    newTasks.forEach((task) => {
      existingTaskIds.add(task.id);
      queuedTaskIds.push(task.id);
    });
    queuedLeadIds.push(lead.id);
  }

  if (options.persist ?? true) {
    await writeStore(nextStore, outreachDir);
  }

  return {
    store: nextStore,
    queuedLeadIds,
    queuedTaskIds,
  };
}

function upsertCampaign(campaigns: OutreachCampaign[], campaign: OutreachCampaign) {
  const byId = new Map(campaigns.map((item) => [item.id, item] as const));
  byId.set(campaign.id, campaign);
  return [...byId.values()];
}

function isEligibleLead(lead: OutreachLead) {
  return Boolean(lead.whatsapp.trim() || lead.email.trim());
}

async function main() {
  const result = await queueOutreachTasks(parseCliArgs(process.argv.slice(2)));
  console.log(
    JSON.stringify(
      {
        queuedLeadIds: result.queuedLeadIds,
        queuedTaskIds: result.queuedTaskIds,
      },
      null,
      2,
    ),
  );
}

function parseCliArgs(argv: string[]): QueueOutreachTasksOptions {
  if (argv.length === 1 && argv[0]?.trim().startsWith("{")) {
    return JSON.parse(argv[0]) as QueueOutreachTasksOptions;
  }

  return {
    websiteUrl: "https://www.tranquilbeads.com",
    campaign: {
      id: `campaign-${new Date().toISOString().slice(0, 10)}`,
      name: "TranquilBeads outreach batch",
      description: "First-touch outreach batch",
      channels: ["whatsapp", "email"],
      status: "active",
      createdAt: new Date().toISOString(),
    },
  };
}

const isMain = fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  void main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
