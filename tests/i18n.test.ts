import { describe, expect, it } from "vitest";

import { defaultLocale, getDir, getLocaleLabel, isLocale, locales } from "@/src/lib/i18n";

describe("i18n helpers", () => {
  it("exposes the supported locales in launch order", () => {
    expect(locales).toEqual(["en", "ar"]);
    expect(defaultLocale).toBe("en");
  });

  it("recognizes supported locales only", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("ar")).toBe(true);
    expect(isLocale("fr")).toBe(false);
  });

  it("returns direction and human label for each locale", () => {
    expect(getDir("en")).toBe("ltr");
    expect(getDir("ar")).toBe("rtl");
    expect(getLocaleLabel("en")).toBe("English");
    expect(getLocaleLabel("ar")).toBe("العربية");
  });
});
