import { NextResponse } from "next/server";

import { readOutreachStore, writeOutreachStore } from "@/src/lib/outreach-store";
import type { InquiryLeadInput } from "@/src/lib/lead-tools";
import { normalizeWebsiteInquiryLead } from "@/src/lib/website-inquiry-leads";

export const runtime = "nodejs";

type FieldName = keyof InquiryLeadInput;

const requiredFields: FieldName[] = [
  "name",
  "company",
  "country",
  "contact",
  "interest",
  "quantity",
  "message",
];

const maxLengths: Record<FieldName, number> = {
  name: 120,
  company: 160,
  country: 120,
  contact: 180,
  interest: 160,
  quantity: 120,
  message: 2000,
};

export async function POST(request: Request) {
  try {
    const rawPayload = await readPayload(request);
    const { lead, errors } = validateInquiryPayload(rawPayload);

    if (!lead) {
      return NextResponse.json({ ok: false, errors }, { status: 400 });
    }

    const sourcePath = getSourcePath(rawPayload, request);
    const now = new Date().toISOString();
    const normalizedLead = normalizeWebsiteInquiryLead(lead, sourcePath);
    const storedLead = {
      ...normalizedLead,
      id: createInquiryLeadId(),
      createdAt: now,
      updatedAt: now,
    };

    const store = await readOutreachStore();
    await writeOutreachStore({
      ...store,
      leads: [...store.leads, storedLead],
    });

    return NextResponse.json(
      {
        ok: true,
        leadId: storedLead.id,
      },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to submit inquiry.";

    console.error("[inquiries:submit]", message);

    return NextResponse.json(
      {
        ok: false,
        error: "We could not submit the inquiry right now.",
      },
      { status: 500 },
    );
  }
}

async function readPayload(request: Request) {
  try {
    return await request.json() as Record<string, unknown>;
  } catch {
    return {};
  }
}

function validateInquiryPayload(payload: Record<string, unknown>) {
  const errors: Partial<Record<FieldName, string>> = {};
  const lead: InquiryLeadInput = {
    company: "",
  };

  for (const field of requiredFields) {
    const value = readString(payload[field]).trim();

    if (!value) {
      errors[field] = "required";
      continue;
    }

    if (value.length > maxLengths[field]) {
      errors[field] = "too_long";
      continue;
    }

    lead[field] = value;
  }

  if (Object.keys(errors).length > 0) {
    return { lead: null, errors };
  }

  return { lead, errors: {} };
}

function getSourcePath(payload: Record<string, unknown>, request: Request) {
  const sourcePath = readString(payload.sourcePath).trim();

  if (sourcePath.startsWith("/")) {
    return sourcePath.slice(0, 240);
  }

  const referer = request.headers.get("referer");

  if (referer) {
    try {
      return new URL(referer).pathname.slice(0, 240);
    } catch {
      return "/contact";
    }
  }

  return "/contact";
}

function createInquiryLeadId() {
  const uniquePart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);

  return `website-inquiry-${Date.now().toString(36)}-${uniquePart}`;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}
