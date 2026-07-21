import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import type { SiteContent } from "@/src/lib/catalog-types";
import { getSiteSnapshot, updateContactSettings } from "@/src/lib/site-admin";

async function createSiteFixture() {
  const dir = await mkdtemp(join(tmpdir(), "tranquilbeads-admin-"));
  const filePath = join(dir, "site-content.json");
  const content: SiteContent = {
    siteSettings: {
      brandName: "TranquilBeads",
      tagline: {
        en: "Tagline",
        ar: "شعار",
      },
      email: "sales@tranquilbeads.com",
      whatsappHref: "https://wa.me/8618929564545",
      whatsappDisplay: "+86 189 2956 4545",
      socialProof: [],
    },
    collections: [],
    products: [],
  };

  await writeFile(filePath, JSON.stringify(content, null, 2), "utf8");

  return { filePath };
}

describe("site admin helpers", () => {
  it("returns a concise site snapshot", async () => {
    const { filePath } = await createSiteFixture();

    const snapshot = await getSiteSnapshot(filePath);

    expect(snapshot.brandName).toBe("TranquilBeads");
    expect(snapshot.contact.email).toBe("sales@tranquilbeads.com");
    expect(snapshot.counts.products).toBe(0);
  });

  it("updates contact settings only when confirm is true", async () => {
    const { filePath } = await createSiteFixture();

    const dryRun = await updateContactSettings({
      filePath,
      confirm: false,
      email: "hello@tranquilbeads.com",
      whatsappDisplay: "+86 111 2222 3333",
      whatsappHref: "https://wa.me/8611122223333",
    });

    expect(dryRun.changed).toBe(true);
    expect(dryRun.dryRun).toBe(true);

    const beforePersist = JSON.parse(await readFile(filePath, "utf8")) as SiteContent;
    expect(beforePersist.siteSettings.email).toBe("sales@tranquilbeads.com");

    const committed = await updateContactSettings({
      filePath,
      confirm: true,
      email: "hello@tranquilbeads.com",
      whatsappDisplay: "+86 111 2222 3333",
      whatsappHref: "https://wa.me/8611122223333",
    });

    expect(committed.dryRun).toBe(false);

    const saved = JSON.parse(await readFile(filePath, "utf8")) as SiteContent;
    expect(saved.siteSettings.email).toBe("hello@tranquilbeads.com");
    expect(saved.siteSettings.whatsappHref).toBe("https://wa.me/8611122223333");
  });
});
