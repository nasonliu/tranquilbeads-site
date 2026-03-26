import { describe, expect, it } from "vitest";

import { renderSkillAssets } from "@/src/lib/openclaw-handoff";

describe("renderSkillAssets", () => {
  it("references the tranquilbeads mcp server and wrapper script", () => {
    const assets = renderSkillAssets("/Volumes/新加卷/Documents/ProjectNoor");

    expect(assets["SKILL.md"]).toContain("tranquilbeads-ops");
    expect(assets["SKILL.md"]).toContain("import_products");
    expect(assets["scripts/tranquilbeads-ops.sh"]).toContain(
      'mcporter call "tranquilbeads-ops.$TOOL"',
    );
  });
});
