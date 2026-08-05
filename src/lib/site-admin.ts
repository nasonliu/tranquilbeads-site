import { readSiteContent, writeSiteContent } from "@/src/lib/site-content";

type UpdateContactSettingsOptions = {
  filePath: string;
  confirm: boolean;
  email: string;
  whatsappHref: string;
  whatsappDisplay: string;
};

export async function getSiteSnapshot(filePath: string) {
  const content = await readSiteContent(filePath);

  return {
    brandName: content.siteSettings.brandName,
    contact: {
      email: content.siteSettings.email,
      whatsappHref: content.siteSettings.whatsappHref,
      whatsappDisplay: content.siteSettings.whatsappDisplay,
      whatsappContacts: content.siteSettings.whatsappContacts ?? [],
    },
    counts: {
      collections: content.collections.length,
      products: content.products.length,
    },
  };
}

export async function updateContactSettings(options: UpdateContactSettingsOptions) {
  const content = await readSiteContent(options.filePath);
  const whatsappContacts = content.siteSettings.whatsappContacts;
  const primaryContacts = whatsappContacts?.filter(
    (contact) => contact.id === "china",
  );
  if (!whatsappContacts?.length || primaryContacts?.length !== 1) {
    throw new Error("WhatsApp contacts require exactly one primary china contact");
  }
  const updatedWhatsappContacts = whatsappContacts.map((contact) =>
    contact.id === "china"
      ? {
          ...contact,
          href: options.whatsappHref,
          display: options.whatsappDisplay,
        }
      : contact,
  );
  const changed =
    content.siteSettings.email !== options.email ||
    content.siteSettings.whatsappHref !== options.whatsappHref ||
    content.siteSettings.whatsappDisplay !== options.whatsappDisplay;

  if (options.confirm && changed) {
    await writeSiteContent(
      {
        ...content,
        siteSettings: {
          ...content.siteSettings,
          email: options.email,
          whatsappHref: options.whatsappHref,
          whatsappDisplay: options.whatsappDisplay,
          whatsappContacts: updatedWhatsappContacts,
        },
      },
      options.filePath,
    );
  }

  return {
    dryRun: !options.confirm,
    changed,
    contact: {
      email: options.email,
      whatsappHref: options.whatsappHref,
      whatsappDisplay: options.whatsappDisplay,
      whatsappContacts: updatedWhatsappContacts,
    },
  };
}
