import templatesData from "@/src/data/outreach/templates.json";
import { defaultLocale, isLocale } from "@/src/lib/i18n";
import type {
  OutreachChannel,
  OutreachTemplateVariant,
} from "@/src/lib/outreach-types";
import type { InquiryLeadInput } from "@/src/lib/lead-tools";

export type OutreachLocale = "en" | "ar";

export type OutreachTemplateLocaleContent = {
  subject: string | null;
  body: string;
};

export type OutreachTemplate = {
  id: string;
  channel: OutreachChannel;
  variant: OutreachTemplateVariant;
  attachmentImageCount: number;
  content: Partial<Record<OutreachLocale, OutreachTemplateLocaleContent>>;
};

export type RenderedOutreachTemplate = {
  subject: string | null;
  body: string;
  attachmentImageCount: number;
};

export type RenderOutreachTemplateOptions = {
  lead: Pick<InquiryLeadInput, "company"> & Partial<Pick<InquiryLeadInput, "country">>;
  websiteUrl: string;
  locale?: string;
};

const fallbackLocale: OutreachLocale = defaultLocale;
const arabicMarketCountries = new Set([
  "uae",
  "u.a.e",
  "united arab emirates",
  "saudi arabia",
  "ksa",
  "kingdom of saudi arabia",
  "qatar",
  "bahrain",
  "kuwait",
  "oman",
  "jordan",
  "morocco",
  "egypt",
]);

export function loadOutreachTemplates(): OutreachTemplate[] {
  return templatesData as OutreachTemplate[];
}

export function renderOutreachTemplate(
  template: OutreachTemplate,
  options: RenderOutreachTemplateOptions,
): RenderedOutreachTemplate {
  const locale = resolveOutreachLocale({
    locale: options.locale,
    country: options.lead.country,
  });
  const localizedContent =
    template.content[locale] ?? template.content[fallbackLocale] ?? firstAvailableContent(template);

  if (!localizedContent) {
    throw new Error(`Template ${template.id} does not define any localized content.`);
  }

  return {
    subject: renderTemplateText(localizedContent.subject, options),
    body: renderTemplateText(localizedContent.body, options),
    attachmentImageCount: template.attachmentImageCount,
  };
}

export function chooseOutreachTemplateVariant(companyName: string) {
  return isTrustworthyCompanyName(companyName) ? "personalized" : "generic";
}

export function resolveOutreachLocale(input: {
  locale?: string;
  country?: string;
}): OutreachLocale {
  const normalizedExplicitLocale = normalizeLocale(input.locale);
  if (normalizedExplicitLocale) {
    return normalizedExplicitLocale;
  }

  return isArabicMarketCountry(input.country) ? "ar" : fallbackLocale;
}

function renderTemplateText(
  value: string | null,
  options: RenderOutreachTemplateOptions,
) {
  if (value === null) return null;

  return value
    .replaceAll("{{lead.company}}", options.lead.company)
    .replaceAll("{{website_url}}", options.websiteUrl);
}

function normalizeLocale(locale?: string): OutreachLocale | null {
  if (!locale) return null;
  return isLocale(locale) ? locale : null;
}

function firstAvailableContent(template: OutreachTemplate) {
  return template.content.en ?? template.content.ar ?? null;
}

function isArabicMarketCountry(country?: string) {
  const normalized = country?.trim().toLowerCase();
  if (!normalized) return false;

  return arabicMarketCountries.has(normalized);
}

function isTrustworthyCompanyName(companyName: string) {
  const normalized = companyName.trim().toLowerCase();
  if (!normalized) return false;

  const suspiciousTerms = ["sample", "test", "demo", "placeholder", "unknown", "temp"];
  if (suspiciousTerms.some((term) => normalized.includes(term))) {
    return false;
  }

  const trustworthySuffixes = [
    "llc",
    "l.l.c.",
    "ltd",
    "limited",
    "company",
    "co",
    "co.",
    "group",
    "trading",
    "wholesale",
    "retail",
    "gift",
    "gifts",
    "store",
    "stores",
    "distribution",
    "distributing",
    "imports",
    "import",
  ];

  if (trustworthySuffixes.some((suffix) => normalized.includes(suffix))) {
    return true;
  }

  return normalized.split(/\s+/).filter(Boolean).length >= 2 && normalized.length >= 10;
}
