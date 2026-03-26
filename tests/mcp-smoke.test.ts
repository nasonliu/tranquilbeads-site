import { execFile as execFileCallback } from "node:child_process";
import { mkdtemp, readFile, cp } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

const execFile = promisify(execFileCallback);

describe("mcp smoke", () => {
  it("supports a snapshot read and dry-run import through mcporter stdio", async () => {
    const dir = await mkdtemp(join(tmpdir(), "tranquilbeads-mcp-"));
    const siteContentPath = join(dir, "site-content.json");
    const importFixturePath = resolve(
      process.cwd(),
      "tests/fixtures/product-import-fixture.json",
    );
    const bundledSiteContentPath = resolve(
      process.cwd(),
      "src/data/site-content.json",
    );

    await cp(bundledSiteContentPath, siteContentPath);

    const snapshotCall = await execFile("mcporter", [
      "call",
      "--stdio",
      "npm run --silent mcp:stdio",
      "get_site_snapshot",
      "--args",
      JSON.stringify({ filePath: siteContentPath }),
    ], { cwd: process.cwd() });

    expect(snapshotCall.stdout).toContain("TranquilBeads");

    const importCall = await execFile("mcporter", [
      "call",
      "--stdio",
      "npm run --silent mcp:stdio",
      "import_products",
      "--args",
      JSON.stringify({
        targetFilePath: siteContentPath,
        importFile: importFixturePath,
        confirm: false,
      }),
    ], { cwd: process.cwd() });

    expect(importCall.stdout).toContain("Dry run imported 1 products");

    const saved = await readFile(siteContentPath, "utf8");
    expect(saved).not.toContain("olive-heritage-tasbih");
  });

  it("applies imports to an explicit target file path through mcporter stdio", async () => {
    const dir = await mkdtemp(join(tmpdir(), "tranquilbeads-mcp-"));
    const siteContentPath = join(dir, "site-content.json");
    const importFixturePath = resolve(
      process.cwd(),
      "tests/fixtures/product-import-fixture.json",
    );
    const bundledSiteContentPath = resolve(
      process.cwd(),
      "src/data/site-content.json",
    );

    await cp(bundledSiteContentPath, siteContentPath);

    const importCall = await execFile("mcporter", [
      "call",
      "--stdio",
      "npm run --silent mcp:stdio",
      "import_products",
      "--args",
      JSON.stringify({
        targetFilePath: siteContentPath,
        importFile: importFixturePath,
        confirm: true,
      }),
    ], { cwd: process.cwd() });

    expect(importCall.stdout).toContain("Applied import for 1 products into");

    const saved = await readFile(siteContentPath, "utf8");
    expect(saved).toContain("olive-heritage-tasbih");
  });
});
