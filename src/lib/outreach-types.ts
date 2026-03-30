export type OutreachSourceType = "obsidian" | "website_inquiry";
export type OutreachChannel = "whatsapp" | "email";
export type OutreachTemplateVariant = "personalized" | "generic";
export type OutreachTaskStatus =
  | "draft"
  | "queued"
  | "sent"
  | "replied"
  | "needs_human_followup"
  | "failed"
  | "closed";
export type OutreachCampaignStatus = "active" | "paused" | "archived";
export type OutreachEventType =
  | "task_created"
  | "sent"
  | "reply_detected"
  | "handoff_created"
  | "human_marked_done"
  | "failed";

export type OutreachLead = {
  id: string;
  sourceType: OutreachSourceType;
  sourcePath: string;
  priorityTier?: "high" | "normal";
  company: string;
  contactName: string;
  country: string;
  website: string;
  whatsapp: string;
  email: string;
  score: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type OutreachCampaign = {
  id: string;
  name: string;
  description: string;
  channels: OutreachChannel[];
  status: OutreachCampaignStatus;
  createdAt: string;
};

export type OutreachTask = {
  id: string;
  campaignId: string;
  leadId: string;
  channel: OutreachChannel;
  variant: OutreachTemplateVariant;
  status: OutreachTaskStatus;
  websiteUrl: string;
  subject: string | null;
  body: string;
  recipientAddress: string;
  attachmentImagePaths: string[];
  channelMessageId?: string | null;
  sentAt: string | null;
  lastReplyAt: string | null;
  needsHumanFollowup: boolean;
  failureReason: string | null;
};

export type OutreachTaskBundleStage = "draft" | "queued";

export type OutreachTaskBundle = {
  leadId: string;
  draftTasks: OutreachTask[];
  queuedTasks: OutreachTask[];
  events: OutreachEvent[];
};

export type OutreachEvent = {
  id: string;
  taskId: string;
  type: OutreachEventType;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type OutreachTemplate = {
  id: string;
  channel: OutreachChannel;
  variant: OutreachTemplateVariant;
  subject: string | null;
  body: string;
  attachmentImageCount: number;
};

export type OutreachStore = {
  leads: OutreachLead[];
  campaigns: OutreachCampaign[];
  tasks: OutreachTask[];
  events: OutreachEvent[];
  templates: OutreachTemplate[];
};
