import { loadDefaultOutreachAttachmentPair } from "@/src/lib/outreach-attachments";
import { normalizeRecipientAddressByChannel } from "@/src/lib/outreach-addresses";
import {
  chooseOutreachTemplateVariant,
  loadOutreachTemplates,
  renderOutreachTemplate,
  resolveOutreachLocale,
  type OutreachLocale,
  type OutreachTemplate,
} from "@/src/lib/outreach-templates";
import type {
  OutreachChannel,
  OutreachEvent,
  OutreachLead,
  OutreachTask,
  OutreachTaskBundle,
  OutreachTemplateVariant,
} from "@/src/lib/outreach-types";

export type BuildOutreachTaskBundleInput = {
  lead: OutreachLead;
  campaignId: string;
  websiteUrl: string;
  locale?: string;
};

export function sortOutreachLeadsForTaskCreation(leads: OutreachLead[]) {
  return [...leads].sort(compareOutreachLeads);
}

export function buildOutreachTaskBundle(
  input: BuildOutreachTaskBundleInput,
): OutreachTaskBundle {
  const templates = loadOutreachTemplates();
  const variant = chooseOutreachTemplateVariant(input.lead.company);
  const attachmentImagePaths = loadDefaultOutreachAttachmentPair();
  const locale = resolveOutreachLocale({
    locale: input.locale,
    country: input.lead.country,
  });

  const draftTasks = buildTaskSet({
    lead: input.lead,
    campaignId: input.campaignId,
    websiteUrl: input.websiteUrl,
    variant,
    templates,
    attachmentImagePaths,
    locale,
    status: "draft",
  });

  const queuedTasks = draftTasks.map((task) => ({ ...task, status: "queued" as const }));
  const createdAt = new Date().toISOString();

  return {
    leadId: input.lead.id,
    draftTasks,
    queuedTasks,
    events: draftTasks.map((task) => createTaskCreatedEvent(task, createdAt)),
  };
}

function buildTaskSet(options: {
  lead: OutreachLead;
  campaignId: string;
  websiteUrl: string;
  variant: OutreachTemplateVariant;
  templates: OutreachTemplate[];
  attachmentImagePaths: string[];
  locale: OutreachLocale;
  status: "draft";
}) {
  const whatsappTemplate = pickTemplate(options.templates, "whatsapp", options.variant);
  const emailTemplate = pickTemplate(options.templates, "email", options.variant);

  return [
    buildTask({
      lead: options.lead,
      campaignId: options.campaignId,
      channel: "whatsapp",
      template: whatsappTemplate,
      websiteUrl: options.websiteUrl,
      attachmentImagePaths: options.attachmentImagePaths,
      locale: options.locale,
      status: options.status,
    }),
    buildTask({
      lead: options.lead,
      campaignId: options.campaignId,
      channel: "email",
      template: emailTemplate,
      websiteUrl: options.websiteUrl,
      attachmentImagePaths: options.attachmentImagePaths,
      locale: options.locale,
      status: options.status,
    }),
  ];
}

function buildTask(options: {
  lead: OutreachLead;
  campaignId: string;
  channel: OutreachChannel;
  template: OutreachTemplate;
  websiteUrl: string;
  attachmentImagePaths: string[];
  locale: OutreachLocale;
  status: "draft";
}): OutreachTask {
  const rendered = renderOutreachTemplate(options.template, {
    lead: { company: options.lead.company, country: options.lead.country },
    websiteUrl: options.websiteUrl,
    locale: options.locale,
  });

  const attachmentImagePaths = options.attachmentImagePaths.slice(
    0,
    rendered.attachmentImageCount,
  );
  const recipientAddress =
    options.channel === "whatsapp" ? options.lead.whatsapp : options.lead.email;

  return {
    id: createTaskId(options.campaignId, options.lead.id, options.channel),
    campaignId: options.campaignId,
    leadId: options.lead.id,
    channel: options.channel,
    variant: options.template.variant,
    status: options.status,
    websiteUrl: options.websiteUrl,
    subject: rendered.subject,
    body: rendered.body,
    recipientAddress: normalizeRecipientAddressByChannel(options.channel, recipientAddress),
    attachmentImagePaths,
    sentAt: null,
    lastReplyAt: null,
    needsHumanFollowup: false,
    failureReason: null,
  };
}

function createTaskCreatedEvent(task: OutreachTask, createdAt: string): OutreachEvent {
  return {
    id: `${task.id}-created`,
    taskId: task.id,
    type: "task_created",
    payload: {
      channel: task.channel,
      status: task.status,
      variant: task.variant,
    },
    createdAt,
  };
}

function pickTemplate(
  templates: OutreachTemplate[],
  channel: OutreachChannel,
  variant: OutreachTemplateVariant,
) {
  return (
    templates.find((template) => template.channel === channel && template.variant === variant) ??
    templates.find((template) => template.channel === channel && template.variant === "personalized") ??
    templates.find((template) => template.channel === channel)
  ) as OutreachTemplate;
}

function compareOutreachLeads(left: OutreachLead, right: OutreachLead) {
  const sourceRank = getSourceRank(left.sourceType) - getSourceRank(right.sourceType);
  if (sourceRank !== 0) return sourceRank;

  const priorityRank = getPriorityRank(left.priorityTier) - getPriorityRank(right.priorityTier);
  if (priorityRank !== 0) return priorityRank;

  const scoreRank = right.score - left.score;
  if (scoreRank !== 0) return scoreRank;

  return left.company.localeCompare(right.company);
}

function getSourceRank(sourceType: OutreachLead["sourceType"]) {
  return sourceType === "website_inquiry" ? 0 : 1;
}

function getPriorityRank(priorityTier: OutreachLead["priorityTier"]) {
  return priorityTier === "high" ? 0 : 1;
}

function createTaskId(campaignId: string, leadId: string, channel: OutreachChannel) {
  return [campaignId, leadId, channel]
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}
