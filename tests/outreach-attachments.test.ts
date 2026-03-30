import { describe, expect, it } from "vitest";

import {
  loadDefaultOutreachAttachmentPair,
  selectOutreachAttachmentPair,
} from "@/src/lib/outreach-attachments";

describe("outreach attachments", () => {
  it("loads the centrally configured hero-plus-secondary attachment pair", () => {
    expect(loadDefaultOutreachAttachmentPair()).toEqual([
      "/images/real-products/natural-kuka-wood/hero.jpeg",
      "/images/real-products/natural-kuka-wood/detail-1.jpeg",
    ]);
  });

  it("always returns exactly two image paths in hero-plus-secondary order", () => {
    const pair = selectOutreachAttachmentPair();

    expect(pair).toHaveLength(2);
    expect(pair[0]).toBe("/images/real-products/natural-kuka-wood/hero.jpeg");
    expect(pair[1]).toBe("/images/real-products/natural-kuka-wood/detail-1.jpeg");
  });

  it("falls back to the first product hero and first gallery image when no config is present", () => {
    expect(
      selectOutreachAttachmentPair({
        products: [
          {
            image: "/images/example/hero.jpeg",
            gallery: [
              { image: "/images/example/detail-1.jpeg" },
              { image: "/images/example/detail-2.jpeg" },
            ],
          },
        ],
      }),
    ).toEqual(["/images/example/hero.jpeg", "/images/example/detail-1.jpeg"]);
  });
});
