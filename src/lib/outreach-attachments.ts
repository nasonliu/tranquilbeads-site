import siteContentJson from "@/src/data/site-content.json";

type OutreachAttachmentDefaults = {
  defaultPair?: {
    heroImage?: string;
    secondaryImage?: string;
  };
};

type OutreachProductSource = {
  image?: string;
  gallery?: Array<{
    image?: string;
  }>;
};

type OutreachSiteContent = {
  outreachAttachmentDefaults?: OutreachAttachmentDefaults;
  products?: OutreachProductSource[];
};

export type OutreachAttachmentPair = [string, string];

const typedSiteContent = siteContentJson as OutreachSiteContent;

export function loadDefaultOutreachAttachmentPair(): OutreachAttachmentPair {
  return selectOutreachAttachmentPair(typedSiteContent);
}

export function selectOutreachAttachmentPair(
  content: OutreachSiteContent = typedSiteContent,
): OutreachAttachmentPair {
  const configuredPair = content.outreachAttachmentDefaults?.defaultPair;

  if (configuredPair?.heroImage && configuredPair.secondaryImage) {
    return [configuredPair.heroImage, configuredPair.secondaryImage];
  }

  const fallbackPair = findFirstProductPair(content.products ?? []);
  if (fallbackPair) {
    return fallbackPair;
  }

  throw new Error("No outreach attachment pair could be resolved.");
}

function findFirstProductPair(products: OutreachProductSource[]): OutreachAttachmentPair | null {
  for (const product of products) {
    if (!product.image) continue;

    const secondaryImage = product.gallery?.find((item) => item.image)?.image;
    if (!secondaryImage) continue;

    return [product.image, secondaryImage];
  }

  return null;
}
