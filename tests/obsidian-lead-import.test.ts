import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { parseObsidianLeadFile } from "@/src/lib/obsidian-lead-import";

const fixturePath = join(
  process.cwd(),
  "tests/fixtures/obsidian-uae-leads.md",
);

describe("obsidian lead import", () => {
  it("parses prioritized Obsidian lead rows into normalized leads", async () => {
    const markdown = await readFile(fixturePath, "utf8");

    const leads = parseObsidianLeadFile(markdown, fixturePath);

    expect(leads).toHaveLength(3);
    expect(leads[0]).toMatchObject({
      sourceType: "obsidian",
      sourcePath: fixturePath,
      company: "Beads Elegant Gift Trading LLC",
      website: "https://www.beadselegant.com/",
      whatsapp: "+971 55 905 1926",
      score: 100,
      notes:
        "Good match for premium Ramadan and gift-channel selling. Lead angle: stable fact",
    });
  });

  it("keeps only the prioritized rows and ignores the other leads section", async () => {
    const markdown = await readFile(fixturePath, "utf8");

    const leads = parseObsidianLeadFile(markdown, fixturePath);

    expect(leads.map((lead) => lead.company)).not.toContain(
      "GiftBoxes LLC / Corporate Gifts & Promotional Item Suppliers - Dubai",
    );
  });
});
