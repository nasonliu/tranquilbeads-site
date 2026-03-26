type InquiryLead = {
  name?: string;
  company: string;
  country?: string;
  contact?: string;
  interest?: string;
  quantity?: string;
  message?: string;
};

export function prepareLeadFollowUp(lead: InquiryLead) {
  const contactLine = lead.contact ? `Preferred contact: ${lead.contact}.` : "";
  const quantityLine = lead.quantity ? `Estimated quantity: ${lead.quantity}.` : "";
  const interestLine = lead.interest ? `Interest: ${lead.interest}.` : "";
  const greeting = lead.name ? `Hello ${lead.name},` : "Hello,";

  return {
    normalizedLead: {
      name: lead.name ?? "",
      company: lead.company,
      country: lead.country ?? "",
      contact: lead.contact ?? "",
      interest: lead.interest ?? "",
      quantity: lead.quantity ?? "",
      message: lead.message ?? "",
    },
    humanReplyDraft: [
      greeting,
      `thank you for contacting TranquilBeads on behalf of ${lead.company}.`,
      interestLine,
      quantityLine,
      contactLine,
      "We can prepare a focused assortment recommendation and confirm MOQ, packaging, and lead time in the next reply.",
    ]
      .filter(Boolean)
      .join(" "),
    agentReplyDraft: [
      `Lead from ${lead.company}.`,
      interestLine,
      quantityLine,
      contactLine,
      lead.message ? `Original message: ${lead.message}` : "",
      "Suggested next step: send the relevant catalog section and confirm target market, MOQ, and timeline.",
    ]
      .filter(Boolean)
      .join(" "),
  };
}
