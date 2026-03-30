import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import {
  parseObsidianLeadFile,
} from "../src/lib/obsidian-lead-import";
import {
  defaultOutreachDir,
  readOutreachStore,
  writeOutreachStore,
  type OutreachStore,
} from "../src/lib/outreach-store";
import type { OutreachLead } from "../src/lib/outreach-types";

export type ImportObsidianLeadsOptions = {
  sourcePaths: string[];
  outreachDir?: string;
  persist?: boolean;
  store?: OutreachStore;
  readMarkdown?: (filePath: string) => Promise<string>;
  readStore?: (outreachDir: string) => Promise<OutreachStore>;
  writeStore?: (store: OutreachStore, outreachDir: string) => Promise<void>;
};

export type ImportObsidianLeadsResult = {
  store: OutreachStore;
  importedLeads: OutreachLead[];
  sourcePaths: string[];
};

export async function importObsidianLeads(
  options: ImportObsidianLeadsOptions,
): Promise<ImportObsidianLeadsResult> {
  if (options.sourcePaths.length === 0) {
    throw new Error("At least one Obsidian source path is required.");
  }

  const outreachDir = options.outreachDir ?? defaultOutreachDir;
  const readMarkdown = options.readMarkdown ?? readFileText;
  const readStore = options.readStore ?? readOutreachStore;
  const writeStore = options.writeStore ?? writeOutreachStore;
  const currentStore = options.store ?? (await readStore(outreachDir));
  const importedLeads = (
    await Promise.all(
      options.sourcePaths.map(async (sourcePath) => {
        const markdown = await readMarkdown(sourcePath);
        return parseObsidianLeadFile(markdown, sourcePath);
      }),
    )
  ).flat();

  const nextStore = {
    ...currentStore,
    leads: mergeById(currentStore.leads, importedLeads),
  };

  if (options.persist ?? true) {
    await writeStore(nextStore, outreachDir);
  }

  return {
    store: nextStore,
    importedLeads,
    sourcePaths: [...options.sourcePaths],
  };
}

async function readFileText(filePath: string) {
  return readFile(filePath, "utf8");
}

function mergeById<T extends { id: string }>(current: T[], incoming: T[]) {
  const values = new Map<string, T>();

  for (const item of current) {
    values.set(item.id, item);
  }

  for (const item of incoming) {
    values.set(item.id, item);
  }

  return [...values.values()];
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  const result = await importObsidianLeads(args);
  console.log(
    JSON.stringify(
      {
        importedLeads: result.importedLeads.length,
        totalLeads: result.store.leads.length,
        sourcePaths: result.sourcePaths,
      },
      null,
      2,
    ),
  );
}

function parseCliArgs(argv: string[]): ImportObsidianLeadsOptions {
  if (argv.length === 1 && argv[0]?.trim().startsWith("{")) {
    return JSON.parse(argv[0]) as ImportObsidianLeadsOptions;
  }

  return {
    sourcePaths: argv,
  };
}

const isMain = fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  void main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
