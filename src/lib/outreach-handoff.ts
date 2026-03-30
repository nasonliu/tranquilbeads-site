import { prepareHumanHandoffReply, type InquiryLeadInput } from "@/src/lib/lead-tools";
import type { OutreachChannel, OutreachLead, OutreachTask } from "@/src/lib/outreach-types";

export type LatestReplyInput = {
  body: string;
  receivedAt: string;
  channelMessageId: string;
};

export type BuildHumanHandoffItemInput = {
  lead: Pick<OutreachLead, "id" | "sourceType" | "sourcePath" | "company" | "contactName" | "country">;
  task: Pick<OutreachTask, "id" | "leadId" | "channel">;
  latestReply: LatestReplyInput;
};

export type HumanHandoffItem = {
  taskId: string;
  leadId: string;
  channel: OutreachChannel;
  sourceReference: string;
  leadIdentity: {
    company: string;
    contactName: string;
    country: string;
    sourceType: OutreachLead["sourceType"];
  };
  latestReply: LatestReplyInput;
  suggestedReply: string;
};

export function buildHumanHandoffItem(input: BuildHumanHandoffItemInput): HumanHandoffItem {
  if (input.task.leadId !== input.lead.id) {
    throw new Error(
      `Expected task ${input.task.id} to belong to lead ${input.lead.id}, received ${input.task.leadId}.`,
    );
  }

  const replyDraft = prepareHumanHandoffReply(toInquiryLeadInput(input.lead), input.latestReply.body);

  return {
    taskId: input.task.id,
    leadId: input.lead.id,
    channel: input.task.channel,
    sourceReference: input.lead.sourcePath,
    leadIdentity: {
      company: input.lead.company,
      contactName: input.lead.contactName,
      country: input.lead.country,
      sourceType: input.lead.sourceType,
    },
    latestReply: input.latestReply,
    suggestedReply: replyDraft.suggestedReply,
  };
}

function toInquiryLeadInput(
  lead: Pick<OutreachLead, "company" | "contactName" | "country">,
): InquiryLeadInput {
  return {
    name: lead.contactName,
    company: lead.company,
    country: lead.country,
  };
}
