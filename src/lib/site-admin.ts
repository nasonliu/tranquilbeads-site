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
    },
    counts: {
      collections: content.collections.length,
      products: content.products.length,
    },
  };
}

export async function updateContactSettings(options: UpdateContactSettingsOptions) {
  const content = await readSiteContent(options.filePath);
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
    },
  };
}
