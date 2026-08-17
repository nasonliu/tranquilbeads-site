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
  const primaryContactIndex =
    content.siteSettings.whatsappContacts?.findIndex(
      (contact) => contact.id === "china",
    ) ?? -1;
  if (
    content.siteSettings.whatsappContacts?.length &&
    primaryContactIndex < 0
  ) {
    throw new Error("WhatsApp contacts are missing the primary china contact");
  }
  const whatsappContacts = content.siteSettings.whatsappContacts?.length
    ? content.siteSettings.whatsappContacts.map((contact, index) =>
        index === primaryContactIndex
          ? {
              ...contact,
              href: options.whatsappHref,
              display: options.whatsappDisplay,
            }
          : contact,
      )
    : undefined;
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
          ...(whatsappContacts ? { whatsappContacts } : {}),
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
      ...(whatsappContacts ? { whatsappContacts } : {}),
    },
  };
}
