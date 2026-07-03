import { createHash, timingSafeEqual } from "node:crypto";

import { readOutreachStore } from "@/src/lib/outreach-store";
import type { OutreachLead } from "@/src/lib/outreach-types";

export const adminInquiriesSessionCookie = "tb_admin_inquiries";

export type AdminInquiryLead = Pick<
  OutreachLead,
  | "id"
  | "company"
  | "contactName"
  | "country"
  | "email"
  | "notes"
  | "sourcePath"
  | "createdAt"
  | "updatedAt"
>;

export function getAdminInquiriesPassword() {
  return process.env.ADMIN_INQUIRIES_PASSWORD?.trim() ?? "";
}

export function isAdminInquiriesConfigured() {
  return getAdminInquiriesPassword().length >= 12;
}

export function createAdminInquiriesSessionToken(password = getAdminInquiriesPassword()) {
  if (!password) {
    return "";
  }

  return createHash("sha256").update(`tranquilbeads-admin-inquiries:${password}`).digest("hex");
}

export function isValidAdminInquiriesSession(token: string | undefined) {
  const expected = createAdminInquiriesSessionToken();

  if (!token || !expected || token.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

export function isValidAdminInquiriesPassword(password: string) {
  const configuredPassword = getAdminInquiriesPassword();

  if (!password || !configuredPassword || password.length !== configuredPassword.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(password), Buffer.from(configuredPassword));
}

export async function listWebsiteInquiryLeads(): Promise<AdminInquiryLead[]> {
  const store = await readOutreachStore();

  return store.leads
    .filter((lead) => lead.sourceType === "website_inquiry")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((lead) => ({
      id: lead.id,
      company: lead.company,
      contactName: lead.contactName,
      country: lead.country,
      email: lead.email,
      notes: lead.notes,
      sourcePath: lead.sourcePath,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
    }));
}
