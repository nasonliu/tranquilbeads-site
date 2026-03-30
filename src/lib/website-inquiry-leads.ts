import type { OutreachLead } from "@/src/lib/outreach-types";
import { normalizeInquiryLeadInput, type InquiryLeadInput } from "@/src/lib/lead-tools";

let websiteInquiryLeadSequence = 0;

export function normalizeWebsiteInquiryLead(
  lead: InquiryLeadInput,
  sourcePath: string,
): OutreachLead {
  const normalized = normalizeInquiryLeadInput(lead);
  const now = new Date().toISOString();
  websiteInquiryLeadSequence += 1;

  return {
    id: createLeadId(sourcePath, normalized.company, websiteInquiryLeadSequence),
    sourceType: "website_inquiry",
    sourcePath,
    priorityTier: "high",
    company: normalized.company,
    contactName: normalized.name,
    country: normalized.country,
    website: "",
    whatsapp: "",
    email: normalized.contact,
    score: 100,
    notes: buildNotes(normalized),
    createdAt: now,
    updatedAt: now,
  };
}

function buildNotes(lead: ReturnType<typeof normalizeInquiryLeadInput>) {
  return [
    lead.interest ? `Interest: ${lead.interest}.` : "",
    lead.quantity ? `Estimated quantity: ${lead.quantity}.` : "",
    lead.message ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

function createLeadId(sourcePath: string, company: string, sequence: number) {
  const sourceSlug = sourcePath
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const companySlug = company
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `website-inquiry-${sourceSlug || "lead"}-${companySlug || "lead"}-${sequence}`;
}
