# Outreach Automation

This workflow automates the first contact with TranquilBeads prospects, then hands any reply to a human.

## What It Does

- Imports prioritized Obsidian lead notes into structured outreach leads.
- Normalizes website inquiries into the same lead model.
- Renders localized first-touch WhatsApp and email templates with English fallback.
- Attaches a stable two-image product pair to the first touch.
- Sends only the first touch automatically.
- Tracks replies and switches the task into `needs_human_followup`.
- Builds a human handoff item with the source reference, latest reply, and suggested next reply.

## Lead Import

- Obsidian country lead notes are parsed from the `## 优先跟进` section.
- Website inquiries reuse the same normalized lead shape.
- The runtime source of truth for imported leads and tasks lives in `src/data/outreach/`.

## Templates

- WhatsApp and email templates are stored in locale-aware form.
- The runtime now infers locale from each lead's country when no explicit locale override is passed.
- Current automatic routing uses Arabic for Gulf and Arabic-market leads such as UAE, Saudi Arabia, Qatar, Bahrain, Kuwait, Oman, Jordan, Morocco, and Egypt.
- English is the fallback when a locale is missing or unsupported.
- Arabic content is included now, and the structure can extend to more languages later.
- Template variables currently support `{{lead.company}}` and `{{website_url}}`.

## First Touch

- The first touch is built from a lead, a campaign, and the selected locale.
- Each lead creates one WhatsApp task and one email task.
- Each task now stores its own `recipientAddress`, so first-touch execution does not need to re-read the lead at send time.
- The default attachment pair is centrally configured in `src/data/site-content.json`.
- The current default pair uses the Natural Kuka Wood hero image plus the first detail image.
- `npm run outreach:send` now uses configured senders by environment:
- `OUTREACH_WHATSAPP_PROVIDER=dry_run|webhook|openclaw|twilio`
- `OUTREACH_WHATSAPP_WEBHOOK_URL=...`
- `OUTREACH_WHATSAPP_WEBHOOK_TOKEN=...`
- `OUTREACH_OPENCLAW_CLI_PATH=/Users/nason/.openclaw/bin/openclaw`
- `OUTREACH_OPENCLAW_WORKSPACE=/Users/nason/.openclaw/workspace`
- `OUTREACH_OPENCLAW_DRY_RUN=true|false`
- `OUTREACH_TWILIO_ACCOUNT_SID=...`
- `OUTREACH_TWILIO_AUTH_TOKEN=...`
- `OUTREACH_TWILIO_WHATSAPP_FROM=...`
- `OUTREACH_EMAIL_PROVIDER=dry_run|webhook|resend`
- `OUTREACH_EMAIL_WEBHOOK_URL=...`
- `OUTREACH_EMAIL_WEBHOOK_TOKEN=...`
- `OUTREACH_RESEND_API_KEY=...`
- `OUTREACH_RESEND_WEBHOOK_SECRET=...`
- `OUTREACH_EMAIL_FROM=...`
- `OUTREACH_EMAIL_REPLY_TO=...`
- `OUTREACH_EMAIL_FORWARD_TO=sales@tranquilbeads.com`
- `OUTREACH_PUBLIC_BASE_URL=https://www.tranquilbeads.com`
- When no provider is configured, both channels stay in safe dry-run mode and emit deterministic synthetic message ids.
- Recommended production pairing for this repo is `OUTREACH_WHATSAPP_PROVIDER=openclaw` and `OUTREACH_EMAIL_PROVIDER=resend`.
- `openclaw` mode sends WhatsApp through the local OpenClaw CLI using `openclaw message send --channel whatsapp ...`, which matches the existing local MCP workflow already documented in the lead-factory worktree.
- `twilio` mode sends directly to Twilio's Messages API with `Body`, `To`, `From`, and one `MediaUrl` per selected product image.
- `resend` mode sends directly to Resend's Emails API with `text` content and hosted attachment URLs.

## Reply Sync

- Reply ingestion is channel-aware for WhatsApp and email.
- When a reply arrives, the task moves from `sent` to `replied` and then to `needs_human_followup`.
- Reply events keep the inbound body, channel thread id, and timestamp.
- Reply matching now supports `channelMessageId` first and falls back to `recipientAddress`, which is useful for webhook providers that only send back the customer phone number or email address.
- Duplicate reply delivery is treated as a no-op once a task is already handed off.
- App Router webhook endpoints are available at `/api/outreach/webhooks/whatsapp` and `/api/outreach/webhooks/email`.
- When `OUTREACH_WEBHOOK_SECRET` is configured, inbound requests must include `x-outreach-webhook-secret: <secret>`.
- Email webhooks also support native Resend `svix-*` signature validation when `OUTREACH_RESEND_WEBHOOK_SECRET` is configured.
- Current normalized webhook payload expectations are:
- WhatsApp generic JSON: `messageId` or `channelMessageId`, `from`, `body` or `text`, optional `receivedAt`
- WhatsApp Twilio form post: `MessageSid`, `From`, `Body`
- Email generic JSON: `threadId` or `messageId`, `from`, `text` or `body`, optional `receivedAt`
- Email Resend `email.received`: nested `data.email_id`, `data.from`, `data.thread_id`; the route will fetch the received email body from Resend when `OUTREACH_RESEND_API_KEY` is configured
- When `OUTREACH_EMAIL_FORWARD_TO` is configured, inbound email replies are also forwarded to that mailbox for human processing.

## Human Handoff

- Human handoff items include the lead identity, task id, channel, source reference, latest reply, and suggested reply.
- The suggested reply adapts to the customer message in a simple way for v1.
- The system refuses to build a handoff if the task and lead ids do not match.

## Operator Commands

- `npm run outreach:import -- <obsidian-file-paths>`
- `npm run outreach:queue -- '{"websiteUrl":"https://www.tranquilbeads.com","campaign":{"id":"camp_gulf_2026","name":"Gulf outreach","description":"First-touch Gulf outreach batch","channels":["whatsapp","email"],"status":"active","createdAt":"2026-03-30T00:00:00.000Z"}}'`
- `npm run outreach:send`
- `npm run outreach:sync-replies`
- `npm run outreach:sync-openclaw-whatsapp`

## Go-Live Runbook

1. Configure production channel env:
- `OUTREACH_WHATSAPP_PROVIDER=openclaw`
- `OUTREACH_OPENCLAW_CLI_PATH=/Users/nason/.openclaw/bin/openclaw`
- `OUTREACH_OPENCLAW_WORKSPACE=/Users/nason/.openclaw/workspace`
- `OUTREACH_EMAIL_PROVIDER=resend`
- `OUTREACH_RESEND_API_KEY=...`
- `OUTREACH_RESEND_WEBHOOK_SECRET=whsec_...`
- `OUTREACH_EMAIL_FROM="Nason <sales@agent.tranquilbeads.com>"`
- `OUTREACH_EMAIL_REPLY_TO=reply@agent.tranquilbeads.com`
- `OUTREACH_EMAIL_FORWARD_TO=sales@tranquilbeads.com`
- `OUTREACH_PUBLIC_BASE_URL=https://www.tranquilbeads.com`
- `OUTREACH_WEBHOOK_SECRET=...`

2. Import and queue leads:
- `npm run outreach:import -- "/Users/nason/Documents/Obsidian Vault/United_Arab_Emirates_Tasbih_Leads_2026-03-19.md"`
- `npm run outreach:queue -- '{"websiteUrl":"https://www.tranquilbeads.com","campaign":{"id":"camp_gulf_2026","name":"Gulf outreach","description":"First-touch Gulf outreach batch","channels":["whatsapp","email"],"status":"active","createdAt":"2026-03-30T00:00:00.000Z"}}'`

3. Safety-check queued state:
- Inspect `src/data/outreach/tasks.json` and confirm only intended leads are `queued`
- Confirm `recipientAddress` is present for every queued task

4. Send first touch:
- `npm run outreach:send`

5. Sync replies:
- Email/webhook path: POST to `/api/outreach/webhooks/email`
- WhatsApp/OpenClaw path: `npm run outreach:sync-openclaw-whatsapp`
- Recommended production setup is direct Resend `email.received` webhook delivery to `/api/outreach/webhooks/email`, with `svix-*` signature validation enabled by `OUTREACH_RESEND_WEBHOOK_SECRET`

6. Work the handoff queue:
- Review tasks in `src/data/outreach/tasks.json` with `needs_human_followup: true`
- Use `src/data/outreach/events.json` plus generated handoff items to continue manually

## Verification

- `npm run test:run -- tests/outreach-v1-regression.test.ts`
- `npm run test:run -- tests/outreach-scripts.test.ts`
