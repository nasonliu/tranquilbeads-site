import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import type {
  OutreachCampaign,
  OutreachEvent,
  OutreachLead,
  OutreachStore,
  SuppressionEntry,
  OutreachTask,
  OutreachTaskBundle,
  OutreachTaskBundleStage,
  OutreachTemplate,
} from "@/src/lib/outreach-types";

export const defaultOutreachDir = resolve(process.cwd(), "src/data/outreach");

function getDatasetPath(baseDir: string, fileName: string) {
  return resolve(baseDir, fileName);
}

async function readArray<T>(filePath: string): Promise<T[]> {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as T[];
}

async function writeArray<T>(filePath: string, value: T[]) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function createEmptyOutreachStore(): OutreachStore {
  return {
    leads: [],
    campaigns: [],
    tasks: [],
    events: [],
    templates: [],
    suppressions: [],
  };
}

export async function readOutreachStore(baseDir = defaultOutreachDir): Promise<OutreachStore> {
  return {
    leads: await readArray<OutreachLead>(getDatasetPath(baseDir, "leads.json")),
    campaigns: await readArray<OutreachCampaign>(getDatasetPath(baseDir, "campaigns.json")),
    tasks: await readArray<OutreachTask>(getDatasetPath(baseDir, "tasks.json")),
    events: await readArray<OutreachEvent>(getDatasetPath(baseDir, "events.json")),
    templates: await readArray<OutreachTemplate>(getDatasetPath(baseDir, "templates.json")),
    suppressions: await readOptionalArray<SuppressionEntry>(getDatasetPath(baseDir, "suppressions.json")),
  };
}

export async function writeOutreachStore(
  store: OutreachStore,
  baseDir = defaultOutreachDir,
) {
  await mkdir(baseDir, { recursive: true });

  await Promise.all([
    writeArray(getDatasetPath(baseDir, "leads.json"), store.leads),
    writeArray(getDatasetPath(baseDir, "campaigns.json"), store.campaigns),
    writeArray(getDatasetPath(baseDir, "tasks.json"), store.tasks),
    writeArray(getDatasetPath(baseDir, "events.json"), store.events),
    writeArray(getDatasetPath(baseDir, "templates.json"), store.templates),
    writeArray(getDatasetPath(baseDir, "suppressions.json"), store.suppressions),
  ]);
}

async function readOptionalArray<T>(filePath: string): Promise<T[]> {
  try {
    return await readArray<T>(filePath);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

export function persistOutreachTaskBundle(
  store: OutreachStore,
  bundle: OutreachTaskBundle,
  stage: OutreachTaskBundleStage,
): OutreachStore {
  const stageTasks = stage === "draft" ? bundle.draftTasks : bundle.queuedTasks;
  return applyOutreachTaskChanges(store, {
    tasks: stageTasks,
    events: stage === "draft" ? bundle.events : [],
  });
}

export function upsertOutreachTasks(store: OutreachStore, tasks: OutreachTask[]): OutreachStore {
  return {
    ...store,
    tasks: upsertTasksById(store.tasks, tasks),
  };
}

export function appendOutreachEvents(store: OutreachStore, events: OutreachEvent[]): OutreachStore {
  return {
    ...store,
    events: [...store.events, ...events],
  };
}

export function applyOutreachTaskChanges(
  store: OutreachStore,
  changes: {
    tasks?: OutreachTask[];
    events?: OutreachEvent[];
  },
): OutreachStore {
  const nextStore = changes.tasks?.length ? upsertOutreachTasks(store, changes.tasks) : store;
  return changes.events?.length ? appendOutreachEvents(nextStore, changes.events) : nextStore;
}

function upsertTasksById(currentTasks: OutreachTask[], nextTasks: OutreachTask[]) {
  const tasksById = new Map(currentTasks.map((task) => [task.id, task] as const));

  for (const task of nextTasks) {
    tasksById.set(task.id, task);
  }

  return [...tasksById.values()];
}
