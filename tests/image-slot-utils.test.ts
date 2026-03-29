import { describe, expect, it } from "vitest";

import { applyImagesToSlots } from "@/src/lib/image-slot-utils";

describe("image slot utils", () => {
  it("fills consecutive slots from the chosen starting slot", () => {
    expect(
      applyImagesToSlots(
        ["hero-old", "", "", "", "", ""],
        1,
        ["detail-a", "detail-b", "detail-c"],
      ),
    ).toEqual([
      "hero-old",
      "detail-a",
      "detail-b",
      "detail-c",
      "",
      "",
    ]);
  });

  it("truncates extra images when there are not enough remaining slots", () => {
    expect(
      applyImagesToSlots(
        ["hero-old", "detail-old", "", "", "", ""],
        4,
        ["slot-5", "slot-6", "slot-7"],
      ),
    ).toEqual([
      "hero-old",
      "detail-old",
      "",
      "",
      "slot-5",
      "slot-6",
    ]);
  });

  it("ignores empty values when filling slots", () => {
    expect(
      applyImagesToSlots(
        ["hero-old", "", "", "", "", ""],
        0,
        [" hero-new ", "", "detail-a"],
      ),
    ).toEqual([
      "hero-new",
      "detail-a",
      "",
      "",
      "",
      "",
    ]);
  });
});
