import { resolve } from "node:path";

import { installOpenClawHandoff } from "../src/lib/openclaw-handoff";

const homeDir = process.env.HOME;

if (!homeDir) {
  throw new Error("HOME is required");
}

const resolvedHomeDir = homeDir;

async function main() {
  await installOpenClawHandoff({
    projectDir: resolve(process.cwd()),
    workspaceSkillsDir: resolve(resolvedHomeDir, ".openclaw/workspace/skills"),
    mcporterConfigPath: resolve(resolvedHomeDir, ".mcporter/mcporter.json"),
  });

  console.log("Installed TranquilBeads OpenClaw handoff.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
