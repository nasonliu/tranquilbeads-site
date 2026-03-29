import { describe, expect, it } from "vitest";

import {
  buildCandidateQuerySql,
  mapDatabasePathToMountedPath,
  rankCandidateImages,
  type CandidateImageRecord,
} from "@/src/lib/image-manager-candidates";

describe("image manager candidate ranking", () => {
  it("prioritizes candidates whose material best matches the current product", () => {
    const candidates: CandidateImageRecord[] = [
      {
        id: 1,
        product_group: "GP-WOOD",
        material: "木",
        bead_count: "33",
        product_type: "",
        shot_type: "overview",
        source_folder: "1号店",
        filename_pattern: "main",
        original_path: "/vol1/1000/office/products/Pic/upload/wood/main.jpg",
      },
      {
        id: 2,
        product_group: "GP-AMBER",
        material: "琥珀",
        bead_count: "33",
        product_type: "",
        shot_type: "overview",
        source_folder: "1号店",
        filename_pattern: "main",
        original_path: "/vol1/1000/office/products/Pic/upload/amber/main.jpg",
      },
    ];

    const ranked = rankCandidateImages(candidates, {
      material: "Amber-look bead set with gift box",
      name: "Baltic Amber Gift Set",
      limit: 10,
    });

    expect(ranked[0]?.id).toBe(2);
    expect(ranked[0]?.reasons.join(" ")).toMatch(/材质|material/i);
  });

  it("maps database office paths onto the local mounted volume", () => {
    expect(
      mapDatabasePathToMountedPath(
        "/vol1/1000/office/products/Pic/upload/0417/1号店/main.jpg",
      ),
    ).toBe("/Volumes/office/products/Pic/upload/0417/1号店/main.jpg");
  });

  it("builds a material-aware SQL query instead of truncating the first 5000 rows", () => {
    const sql = buildCandidateQuerySql({
      material: "Amber-look bead set with gift box",
      name: "Baltic Amber Gift Set",
      limit: 80,
    });

    expect(sql).toContain("material like '%琥珀%'");
    expect(sql.toLowerCase()).toContain("material like '%amber%'");
    expect(sql).not.toContain("limit 5000");
  });

  it("can rank tiger-eye candidates using folder and original path clues even when material is generic", () => {
    const ranked = rankCandidateImages(
      [
        {
          id: 10,
          product_group: "GP-TIGER",
          material: "其他",
          bead_count: "33",
          product_type: null,
          shot_type: "overview",
          source_folder: "虎眼石",
          filename_pattern: "main",
          original_path: "/vol1/1000/office/products/Pic/upload/tasbih/0225/虎眼石 33/main.jpg",
        },
        {
          id: 11,
          product_group: "GP-OTHER",
          material: "其他",
          bead_count: "33",
          product_type: null,
          shot_type: "overview",
          source_folder: "黑曜石",
          filename_pattern: "main",
          original_path: "/vol1/1000/office/products/Pic/upload/tasbih/0225/黑曜石 33/main.jpg",
        },
      ],
      {
        material: "Blue Tiger's Eye (Hawk's Eye) with gold-plated brass accents",
        name: "Blue Tiger's Eye Tasbih",
        limit: 10,
      },
    );

    expect(ranked[0]?.id).toBe(10);
    expect(ranked[0]?.reasons.join(" ")).toMatch(/tiger-eye|材质匹配/i);
  });
});
