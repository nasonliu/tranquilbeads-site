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
      whatsappContacts: [
        {
          id: "china",
          label: { en: "China team", ar: "فريق الصين" },
          href: "https://wa.me/8618929564545",
          display: "+86 189 2956 4545",
        },
        {
          id: "uk",
          label: { en: "UK team", ar: "فريق المملكة المتحدة" },
          href: "https://wa.me/44784089109",
          display: "+44 7840 89109",
        },
      ],
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
    expect(snapshot.contact.whatsappContacts).toHaveLength(2);
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
    expect(saved.siteSettings.whatsappContacts?.find(({ id }) => id === "china")).toMatchObject({
      href: "https://wa.me/8611122223333",
      display: "+86 111 2222 3333",
    });
    expect(saved.siteSettings.whatsappContacts?.find(({ id }) => id === "uk")).toMatchObject({
      href: "https://wa.me/44784089109",
      display: "+44 7840 89109",
    });
  });

  it("updates the designated primary contact without relying on list order", async () => {
    const { filePath } = await createSiteFixture();
    const content = JSON.parse(await readFile(filePath, "utf8")) as SiteContent;
    content.siteSettings.whatsappContacts?.reverse();
    await writeFile(filePath, JSON.stringify(content, null, 2), "utf8");

    await updateContactSettings({
      filePath,
      confirm: true,
      email: content.siteSettings.email,
      whatsappDisplay: "+86 111 2222 3333",
      whatsappHref: "https://wa.me/8611122223333",
    });

    const saved = JSON.parse(await readFile(filePath, "utf8")) as SiteContent;
    expect(saved.siteSettings.whatsappContacts?.find(({ id }) => id === "china")).toMatchObject({
      href: "https://wa.me/8611122223333",
      display: "+86 111 2222 3333",
    });
    expect(saved.siteSettings.whatsappContacts?.find(({ id }) => id === "uk")).toMatchObject({
      href: "https://wa.me/44784089109",
      display: "+44 7840 89109",
    });
  });

  it("stops instead of overwriting another contact when the primary id is missing", async () => {
    const { filePath } = await createSiteFixture();
    const content = JSON.parse(await readFile(filePath, "utf8")) as SiteContent;
    content.siteSettings.whatsappContacts =
      content.siteSettings.whatsappContacts?.filter(({ id }) => id !== "china") ?? [];
    await writeFile(filePath, JSON.stringify(content, null, 2), "utf8");

    await expect(
      updateContactSettings({
        filePath,
        confirm: true,
        email: content.siteSettings.email,
        whatsappDisplay: "+86 111 2222 3333",
        whatsappHref: "https://wa.me/8611122223333",
      }),
    ).rejects.toThrow(/exactly one primary china contact/i);

    const saved = JSON.parse(await readFile(filePath, "utf8")) as SiteContent;
    expect(saved.siteSettings.whatsappContacts?.[0]).toMatchObject({
      id: "uk",
      href: "https://wa.me/44784089109",
    });
  });

  it.each(["missing", "empty"] as const)(
    "stops when the contacts field is %s",
    async (state) => {
      const { filePath } = await createSiteFixture();
      const content = JSON.parse(await readFile(filePath, "utf8")) as SiteContent;
      if (state === "missing") {
        delete content.siteSettings.whatsappContacts;
      } else {
        content.siteSettings.whatsappContacts = [];
      }
      await writeFile(filePath, JSON.stringify(content, null, 2), "utf8");

      await expect(
        updateContactSettings({
          filePath,
          confirm: true,
          email: content.siteSettings.email,
          whatsappDisplay: "+86 111 2222 3333",
          whatsappHref: "https://wa.me/8611122223333",
        }),
      ).rejects.toThrow(/exactly one primary china contact/i);

      const saved = JSON.parse(await readFile(filePath, "utf8")) as SiteContent;
      expect(saved.siteSettings.whatsappHref).toBe("https://wa.me/8618929564545");
    },
  );
});
