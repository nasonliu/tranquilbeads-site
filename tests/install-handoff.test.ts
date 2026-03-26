import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import { installOpenClawHandoff } from "@/src/lib/openclaw-handoff";

describe("installOpenClawHandoff", () => {
  it("writes the skill and registers the server in mcporter config", async () => {
    const dir = await mkdtemp(join(tmpdir(), "tranquilbeads-handoff-"));
    const skillsDir = join(dir, "skills");
    const mcporterConfigPath = join(dir, "mcporter.json");

    await mkdir(skillsDir, { recursive: true });
    await writeFile(mcporterConfigPath, JSON.stringify({ mcpServers: {}, imports: [] }), "utf8");

    const result = await installOpenClawHandoff({
      projectDir: "/Volumes/新加卷/Documents/ProjectNoor",
      workspaceSkillsDir: skillsDir,
      mcporterConfigPath,
      serverCommand: "/tmp/run-tranquilbeads-mcp.sh",
    });

    const skillMarkdown = await readFile(
      join(result.skillDir, "SKILL.md"),
      "utf8",
    );
    expect(skillMarkdown).toContain("TranquilBeads");

    const mcporterConfig = JSON.parse(await readFile(mcporterConfigPath, "utf8")) as {
      mcpServers: Record<string, { command: string }>;
    };
    expect(mcporterConfig.mcpServers["tranquilbeads-ops"]?.command).toBe(
      "/tmp/run-tranquilbeads-mcp.sh",
    );
  });
});
