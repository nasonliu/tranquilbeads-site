# TranquilBeads Outreach Automation Design

## Summary

Build a first-phase outreach system for TranquilBeads that automatically sends the first WhatsApp and email outreach message to qualified leads, includes the public website link, attaches two product images, and continuously tracks replies until a human takes over.

The system must support two lead sources:

- Obsidian lead notes that already contain prioritized tasbih prospects.
- Website inquiries when they begin arriving in the future.

The system must stop automation as soon as a recipient replies and switch the lead into a human follow-up workflow.

## Goals

- Automatically send the first WhatsApp outreach message to eligible leads.
- Automatically send the first email outreach message to eligible leads.
- Include the TranquilBeads website link in every first-touch message.
- Attach two product images chosen by a predictable rule.
- Track send status, reply status, and handoff status in structured project data.
- Support Obsidian lead import now and website inquiry ingestion later.
- Generate a human follow-up task and suggested reply when a recipient responds.

## Non-Goals

- Do not auto-send second or third follow-up messages in v1.
- Do not build a full CRM in v1.
- Do not rewrite large parts of the public website before outreach is proven.
- Do not mutate Obsidian source notes as the canonical system of record for message state.
- Do not allow fully autonomous negotiation after a prospect replies.

## Users

- Primary: Nason, operating outbound wholesale outreach for TranquilBeads.
- Secondary: local agents that need reliable outreach state and handoff signals.

## Functional Requirements

### 1. Lead ingestion

- Import prioritized leads from Obsidian markdown files in `/Users/nason/Documents/Obsidian Vault/`.
- Preserve source metadata such as country file, company name, website, WhatsApp number, email when available, score, and notes.
- Accept website inquiry records as a second lead source once inquiry submissions exist.
- Normalize both lead sources into one internal lead model.

### 2. Outreach orchestration

- Create one lead record per prospect and one or more outreach tasks per channel.
- Support at least two outbound channels in v1:
  - WhatsApp
  - Email
- Allow one lead to receive both a WhatsApp first-touch and an email first-touch through separate tasks.
- Prioritize website inquiries ahead of imported cold leads once inquiry data exists.

### 3. First-touch sending

- Auto-send only the first outreach message for each channel.
- Use the approved TranquilBeads template family with Nason as sender.
- Include `https://www.tranquilbeads.com` in every first-touch message.
- Attach two product images to the first-touch message when the channel supports attachments.
- Prefer the personalized template when a trustworthy lead company name exists.
- Fall back to the generic template when company naming looks unreliable or missing.

### 4. Reply tracking and human handoff

- Continuously check for replies in both WhatsApp and email channels.
- Mark the task as replied as soon as a recipient responds.
- Immediately stop further automation for that task once a reply is detected.
- Create a human follow-up item with:
  - lead identity
  - channel
  - latest inbound reply
  - original source reference
  - suggested next reply draft
- Mark the task as `needs_human_followup`.

### 5. Suggested follow-up support

- Generate a concise suggested reply for human review after a reply arrives.
- Include the original outreach context so the human sees what was sent first.
- Preserve a conversation event history for later review.

## Data Model

Store structured outreach data inside the repository in a dedicated machine-readable area such as `src/data/outreach/`.

### Lead

- `id`
- `sourceType`
  - `obsidian`
  - `website_inquiry`
- `sourcePath`
- `company`
- `contactName`
- `country`
- `website`
- `whatsapp`
- `email`
- `score`
- `notes`
- `createdAt`
- `updatedAt`

### Outreach campaign

- `id`
- `name`
- `description`
- `channels`
- `status`
- `createdAt`

### Outreach task

- `id`
- `campaignId`
- `leadId`
- `channel`
  - `whatsapp`
  - `email`
- `variant`
  - `personalized`
  - `generic`
- `status`
  - `draft`
  - `queued`
  - `sent`
  - `replied`
  - `needs_human_followup`
  - `failed`
  - `closed`
- `websiteUrl`
- `subject`
- `body`
- `attachmentImagePaths`
- `sentAt`
- `lastReplyAt`
- `needsHumanFollowup`
- `failureReason`

### Conversation event

- `id`
- `taskId`
- `type`
  - `task_created`
  - `sent`
  - `reply_detected`
  - `handoff_created`
  - `human_marked_done`
  - `failed`
- `payload`
- `createdAt`

## State Flow

### Allowed automatic transitions

- `draft -> queued`
- `queued -> sent`
- `sent -> replied`
- `replied -> needs_human_followup`

### Allowed human transitions

- `needs_human_followup -> closed`
- `failed -> queued`
- `sent -> closed`

### Guardrails

- The system must not auto-send any second-touch message in v1.
- The system must not continue automation after `replied` or `needs_human_followup`.
- Channel tasks for the same lead must remain independently traceable.

## Message Templates

### WhatsApp personalized

```text
Hello, this is Nason from TranquilBeads.

We supply premium tasbih and gift-ready Islamic products for wholesale partners, gift shops, and distributors.

I came across {{lead.company}} and thought our collection may be relevant for your market. You can view our website here:
{{website_url}}

I’m also sharing two product photos for a quick reference. If this is of interest, I’d be happy to send suitable product options with MOQ, packaging, and lead time details.
```

### WhatsApp generic

```text
Hello, this is Nason from TranquilBeads.

We supply premium tasbih and gift-ready Islamic products for wholesale partners, gift shops, and distributors.

I’m reaching out to introduce our collection. You can view our website here:
{{website_url}}

I’m also sharing two product photos for a quick reference. If this is of interest, I’d be happy to send suitable product options with MOQ, packaging, and lead time details.
```

### Email personalized

Subject:

```text
Premium Tasbih Collection for {{lead.company}}
```

Body:

```text
Hello,

This is Nason from TranquilBeads.

We supply premium tasbih and gift-ready Islamic products for wholesale partners, gift shops, and distributors.

I came across {{lead.company}} and thought our collection could be a good match for your market. You can view our website here:
{{website_url}}

I’ve also attached two product images for a quick reference. If relevant for your business, I’d be happy to send suitable product options together with MOQ, packaging, and lead time details.

Best regards,
Nason
TranquilBeads
{{website_url}}
```

## Attachment Selection Rules

- Attach exactly two product images in the first-touch message when supported.
- Use one hero-style product image that clearly shows the tasbih.
- Use one secondary image that emphasizes gifting, assortment quality, or packaging value.
- Keep the default image pair centrally configured so all first-touch messages stay consistent.
- Allow future campaign-level overrides, but do not require them in v1.

## Source-Specific Rules

### Obsidian leads

- Treat Obsidian markdown as the source of raw lead discovery and prioritization.
- Import from files such as the country lead lists and global tasbih hub notes.
- Do not depend on editing markdown checkboxes as the only source of runtime status.

### Website inquiries

- Reuse the same internal lead and task model when inquiries begin arriving.
- Give inquiry-driven tasks higher send priority than cold outreach tasks.
- Preserve the original inquiry message as part of lead context.

## Safety Model

- First-touch sending is allowed automatically.
- Any second outbound message after a recipient reply must require human review.
- When reply detection is uncertain, prefer `needs_human_followup` over continued automation.
- Failures must be visible and retryable without mutating the original lead source.

## Testing Requirements

- Unit tests for Obsidian lead parsing and normalization.
- Unit tests for outreach task creation and state transitions.
- Unit tests for template rendering with personalized and generic variants.
- Unit tests for attachment selection rules.
- Integration tests for queueing one lead into WhatsApp and email first-touch tasks.
- Integration tests for reply detection causing `needs_human_followup`.
- Regression tests confirming no automatic second-touch send occurs in v1.

## Delivery Requirements

- Repository-owned spec and implementation plan.
- Structured local storage for outreach leads, tasks, and events.
- A first-touch template set for WhatsApp and email.
- A deterministic product image selection rule for attachments.
- A human handoff workflow with suggested reply output.
