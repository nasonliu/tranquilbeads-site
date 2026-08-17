import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { validateRetailImage } from "@/src/lib/retail/upload-validation";

describe("retail image sanitization", () => {
  it("re-encodes uploads without EXIF metadata", async () => {
    const original = await sharp({ create: { width: 4, height: 4, channels: 3, background: "#d4a24c" } })
      .jpeg()
      .withMetadata({ exif: { IFD0: { Artist: "private-test-metadata" } } })
      .toBuffer();
    expect((await sharp(original).metadata()).exif).toBeDefined();

    const validated = await validateRetailImage(new File([Uint8Array.from(original).buffer], "amber.jpg", { type: "image/jpeg" }));
    expect(validated.mime).toBe("image/jpeg");
    expect((await sharp(validated.bytes).metadata()).exif).toBeUndefined();
    expect(Buffer.from(validated.bytes).equals(original)).toBe(false);
  });

  it("accepts the standard .jpeg filename extension and normalizes storage to .jpg", async () => {
    const original = await sharp({ create: { width: 4, height: 4, channels: 3, background: "#d4a24c" } }).jpeg().toBuffer();
    const validated = await validateRetailImage(new File([Uint8Array.from(original).buffer], "amber.jpeg", { type: "image/jpeg" }));

    expect(validated.mime).toBe("image/jpeg");
    expect(validated.extension).toBe("jpg");
  });
});
