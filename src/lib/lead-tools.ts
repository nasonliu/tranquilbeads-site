export type InquiryLeadInput = {
  name?: string;
  company: string;
  country?: string;
  contact?: string;
  interest?: string;
  quantity?: string;
  message?: string;
};

export function normalizeInquiryLeadInput(lead: InquiryLeadInput) {
  return {
    name: lead.name ?? "",
    company: lead.company,
    country: lead.country ?? "",
    contact: lead.contact ?? "",
    interest: lead.interest ?? "",
    quantity: lead.quantity ?? "",
    message: lead.message ?? "",
  };
}

export function prepareLeadFollowUp(lead: InquiryLeadInput) {
  const normalizedLead = normalizeInquiryLeadInput(lead);
  const contactLine = normalizedLead.contact ? `Preferred contact: ${normalizedLead.contact}.` : "";
  const quantityLine = normalizedLead.quantity ? `Estimated quantity: ${normalizedLead.quantity}.` : "";
  const interestLine = normalizedLead.interest ? `Interest: ${normalizedLead.interest}.` : "";
  const greeting = normalizedLead.name ? `Hello ${normalizedLead.name},` : "Hello,";

  return {
    normalizedLead,
    humanReplyDraft: [
      greeting,
      `thank you for contacting TranquilBeads on behalf of ${normalizedLead.company}.`,
      interestLine,
      quantityLine,
      contactLine,
      "We can prepare a focused assortment recommendation and confirm MOQ, packaging, and lead time in the next reply.",
    ]
      .filter(Boolean)
      .join(" "),
    agentReplyDraft: [
      `Lead from ${normalizedLead.company}.`,
      interestLine,
      quantityLine,
      contactLine,
      normalizedLead.message ? `Original message: ${normalizedLead.message}` : "",
      "Suggested next step: send the relevant catalog section and confirm target market, MOQ, and timeline.",
    ]
      .filter(Boolean)
      .join(" "),
  };
}

export function prepareHumanHandoffReply(
  lead: InquiryLeadInput,
  latestReply: string,
) {
  const normalizedLead = normalizeInquiryLeadInput(lead);
  const greeting = normalizedLead.name ? `Hello ${normalizedLead.name},` : "Hello,";
  const replyText = latestReply.trim().toLowerCase();
  const replyNote = latestReply.trim() ? "thanks for your reply." : "thanks for getting back to us.";
  const nextStep = buildHumanHandoffNextStep(normalizedLead.company, replyText);

  return {
    normalizedLead,
    suggestedReply: [greeting, replyNote, nextStep].join(" "),
  };
}

function buildHumanHandoffNextStep(company: string, latestReply: string) {
  const suffix = company ? ` for ${company}.` : ".";

  if (latestReply.includes("catalog")) {
    return `We can send the relevant catalog section and confirm MOQ, packaging, and lead time${suffix}`;
  }

  if (latestReply.includes("price") || latestReply.includes("pricing")) {
    return `We can share pricing guidance together with MOQ, packaging, and lead time${suffix}`;
  }

  if (latestReply.includes("lead time") || latestReply.includes("delivery")) {
    return `We can confirm lead time together with MOQ, packaging, and the most relevant product options${suffix}`;
  }

  return `We can send the relevant catalog section and confirm MOQ, packaging, and lead time${suffix}`;
}
