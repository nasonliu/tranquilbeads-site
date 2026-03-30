# TranquilBeads Outreach Automation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first-phase TranquilBeads outreach system that imports leads, auto-sends the first WhatsApp and email outreach messages with the website link and two product images, then hands replies to a human.

**Architecture:** Keep public-site concerns separate from outbound automation. Add a small outreach domain inside the main repo with structured lead, task, and event storage, plus focused libraries for Obsidian lead import, template rendering, attachment selection, task orchestration, and reply handoff. Reuse existing lead-oriented work where helpful, but make the main repo the canonical runtime state for outreach execution.

**Tech Stack:** Next.js, TypeScript, Vitest, local JSON data files, Node libraries, existing OpenClaw/MCP-adjacent utilities

---

## Chunk 1: Outreach data foundation

### Task 1: Define the outreach storage model

**Files:**
- Create: `src/data/outreach/leads.json`
- Create: `src/data/outreach/campaigns.json`
- Create: `src/data/outreach/tasks.json`
- Create: `src/data/outreach/events.json`
- Create: `src/data/outreach/templates.json`
- Create: `src/lib/outreach-types.ts`
- Create: `src/lib/outreach-store.ts`
- Test: `tests/outreach-store.test.ts`

- [ ] **Step 1: Write failing tests for reading empty outreach datasets and writing typed records**
- [ ] **Step 2: Run `npm run test:run -- tests/outreach-store.test.ts` and confirm failure**
- [ ] **Step 3: Add typed interfaces for leads, campaigns, tasks, events, and templates in `src/lib/outreach-types.ts`**
- [ ] **Step 4: Add seed JSON files with empty arrays in `src/data/outreach/`**
- [ ] **Step 5: Implement read/write helpers in `src/lib/outreach-store.ts` for each dataset**
- [ ] **Step 6: Re-run `npm run test:run -- tests/outreach-store.test.ts` and confirm pass**

### Task 2: Add deterministic task state transitions

**Files:**
- Create: `src/lib/outreach-state.ts`
- Modify: `src/lib/outreach-types.ts`
- Test: `tests/outreach-state.test.ts`

- [ ] **Step 1: Write failing tests for allowed automatic and human state transitions**
- [ ] **Step 2: Run `npm run test:run -- tests/outreach-state.test.ts` and confirm failure**
- [ ] **Step 3: Implement transition helpers for `draft`, `queued`, `sent`, `replied`, `needs_human_followup`, `failed`, and `closed`**
- [ ] **Step 4: Add guardrails that reject automatic second-touch transitions**
- [ ] **Step 5: Re-run `npm run test:run -- tests/outreach-state.test.ts` and confirm pass**

## Chunk 2: Lead ingestion and normalization

### Task 3: Parse Obsidian tasbih lead notes into structured leads

**Files:**
- Create: `src/lib/obsidian-lead-import.ts`
- Modify: `src/lib/outreach-types.ts`
- Test: `tests/obsidian-lead-import.test.ts`
- Fixture: `tests/fixtures/obsidian-uae-leads.md`

- [ ] **Step 1: Write a fixture markdown file based on the Obsidian country lead format**
- [ ] **Step 2: Write failing tests for extracting company, website, WhatsApp, score, notes, and source path**
- [ ] **Step 3: Run `npm run test:run -- tests/obsidian-lead-import.test.ts` and confirm failure**
- [ ] **Step 4: Implement a parser that reads prioritized lead rows from country lead markdown files**
- [ ] **Step 5: Normalize imported records into the shared lead model with `sourceType: 'obsidian'`**
- [ ] **Step 6: Re-run `npm run test:run -- tests/obsidian-lead-import.test.ts` and confirm pass**

### Task 4: Normalize website inquiries into the same lead model

**Files:**
- Create: `src/lib/website-inquiry-leads.ts`
- Modify: `src/lib/lead-tools.ts`
- Modify: `src/lib/outreach-types.ts`
- Test: `tests/website-inquiry-leads.test.ts`

- [ ] **Step 1: Write failing tests for converting inquiry payloads into normalized lead records**
- [ ] **Step 2: Run `npm run test:run -- tests/website-inquiry-leads.test.ts` and confirm failure**
- [ ] **Step 3: Extract or extend shared lead-normalization helpers from `src/lib/lead-tools.ts`**
- [ ] **Step 4: Implement a converter that maps inquiry fields into the shared outreach lead shape with `sourceType: 'website_inquiry'`**
- [ ] **Step 5: Mark inquiry leads as higher-priority candidates for future orchestration**
- [ ] **Step 6: Re-run `npm run test:run -- tests/website-inquiry-leads.test.ts` and confirm pass**

## Chunk 3: Templates and attachments

### Task 5: Store the approved first-touch templates

**Files:**
- Modify: `src/data/outreach/templates.json`
- Create: `src/lib/outreach-templates.ts`
- Test: `tests/outreach-templates.test.ts`

- [ ] **Step 1: Write failing tests for rendering the approved WhatsApp and email templates**
- [ ] **Step 2: Run `npm run test:run -- tests/outreach-templates.test.ts` and confirm failure**
- [ ] **Step 3: Add the approved template definitions for WhatsApp personalized, WhatsApp generic, and email personalized**
- [ ] **Step 4: Implement placeholder rendering for `{{lead.company}}` and `{{website_url}}`**
- [ ] **Step 5: Add a variant chooser that prefers personalized copy when company naming is trustworthy**
- [ ] **Step 6: Re-run `npm run test:run -- tests/outreach-templates.test.ts` and confirm pass**

### Task 6: Implement the two-image attachment selector

**Files:**
- Create: `src/lib/outreach-attachments.ts`
- Modify: `src/data/site-content.json`
- Test: `tests/outreach-attachments.test.ts`

- [ ] **Step 1: Inspect current product image sources and pick a stable default pairing rule**
- [ ] **Step 2: Write failing tests for selecting exactly two image paths in the intended hero-plus-secondary order**
- [ ] **Step 3: Run `npm run test:run -- tests/outreach-attachments.test.ts` and confirm failure**
- [ ] **Step 4: Implement a selector that returns one clear hero image and one secondary value image**
- [ ] **Step 5: Keep the selected default pair centrally configurable instead of hardcoding values in templates**
- [ ] **Step 6: Re-run `npm run test:run -- tests/outreach-attachments.test.ts` and confirm pass**

## Chunk 4: Task creation and first-touch orchestration

### Task 7: Create outreach tasks from normalized leads

**Files:**
- Create: `src/lib/outreach-task-factory.ts`
- Modify: `src/lib/outreach-store.ts`
- Modify: `src/lib/outreach-types.ts`
- Test: `tests/outreach-task-factory.test.ts`

- [ ] **Step 1: Write failing tests for building WhatsApp and email tasks from one lead without duplicating task ids**
- [ ] **Step 2: Run `npm run test:run -- tests/outreach-task-factory.test.ts` and confirm failure**
- [ ] **Step 3: Implement task creation helpers that bind lead, channel, rendered copy, and attachment paths**
- [ ] **Step 4: Ensure website inquiry leads sort ahead of Obsidian cold leads once both exist**
- [ ] **Step 5: Persist initial `draft` and `queued` task records with matching event entries**
- [ ] **Step 6: Re-run `npm run test:run -- tests/outreach-task-factory.test.ts` and confirm pass**

### Task 8: Add first-touch sender interfaces for WhatsApp and email

**Files:**
- Create: `src/lib/outreach-senders.ts`
- Create: `src/lib/whatsapp-outreach.ts`
- Create: `src/lib/email-outreach.ts`
- Test: `tests/outreach-senders.test.ts`

- [ ] **Step 1: Write failing tests for a sender interface that accepts one queued task and returns sent metadata**
- [ ] **Step 2: Run `npm run test:run -- tests/outreach-senders.test.ts` and confirm failure**
- [ ] **Step 3: Define focused sender contracts for WhatsApp and email first-touch execution**
- [ ] **Step 4: Implement minimal adapters that can be wired to the real channel integrations later without changing domain logic**
- [ ] **Step 5: Update send results to include `sentAt`, attachment paths, and a channel message id when available**
- [ ] **Step 6: Re-run `npm run test:run -- tests/outreach-senders.test.ts` and confirm pass**

### Task 9: Build the first-touch orchestration service

**Files:**
- Create: `src/lib/outreach-orchestrator.ts`
- Modify: `src/lib/outreach-store.ts`
- Modify: `src/lib/outreach-state.ts`
- Test: `tests/outreach-orchestrator.test.ts`

- [ ] **Step 1: Write failing tests for moving queued tasks to sent tasks through the sender interfaces**
- [ ] **Step 2: Run `npm run test:run -- tests/outreach-orchestrator.test.ts` and confirm failure**
- [ ] **Step 3: Implement orchestration logic that pulls queued tasks, dispatches the proper sender, and records events**
- [ ] **Step 4: Mark failed sends with `failed` status and an explicit failure reason**
- [ ] **Step 5: Confirm the orchestrator never schedules a second outbound touch in v1**
- [ ] **Step 6: Re-run `npm run test:run -- tests/outreach-orchestrator.test.ts` and confirm pass**

## Chunk 5: Reply tracking and human handoff

### Task 10: Detect replies and transition tasks into human follow-up

**Files:**
- Create: `src/lib/outreach-replies.ts`
- Modify: `src/lib/outreach-state.ts`
- Modify: `src/lib/outreach-store.ts`
- Test: `tests/outreach-replies.test.ts`

- [ ] **Step 1: Write failing tests for a reply signal moving a sent task into `replied` and then `needs_human_followup`**
- [ ] **Step 2: Run `npm run test:run -- tests/outreach-replies.test.ts` and confirm failure**
- [ ] **Step 3: Implement reply ingestion helpers for WhatsApp and email channel events**
- [ ] **Step 4: Record inbound reply content and timestamps as conversation events**
- [ ] **Step 5: Enforce a stop on further automation once reply detection succeeds**
- [ ] **Step 6: Re-run `npm run test:run -- tests/outreach-replies.test.ts` and confirm pass**

### Task 11: Generate human handoff items and suggested replies

**Files:**
- Create: `src/lib/outreach-handoff.ts`
- Modify: `src/lib/lead-tools.ts`
- Test: `tests/outreach-handoff.test.ts`

- [ ] **Step 1: Write failing tests for building a human handoff item from the original task and latest reply**
- [ ] **Step 2: Run `npm run test:run -- tests/outreach-handoff.test.ts` and confirm failure**
- [ ] **Step 3: Reuse or extend existing lead reply helpers to generate a concise next-step draft**
- [ ] **Step 4: Include lead identity, channel, inbound reply, source reference, and suggested reply in the handoff output**
- [ ] **Step 5: Re-run `npm run test:run -- tests/outreach-handoff.test.ts` and confirm pass**

## Chunk 6: Entrypoints, docs, and verification

### Task 12: Add operator entrypoints for import, send, and reply sync

**Files:**
- Create: `scripts/import-obsidian-leads.ts`
- Create: `scripts/run-outreach-first-touch.ts`
- Create: `scripts/sync-outreach-replies.ts`
- Modify: `package.json`
- Test: `tests/outreach-scripts.test.ts`

- [ ] **Step 1: Write failing tests for script-level orchestration around import, send, and reply sync commands**
- [ ] **Step 2: Run `npm run test:run -- tests/outreach-scripts.test.ts` and confirm failure**
- [ ] **Step 3: Implement the import script for Obsidian lead markdown files**
- [ ] **Step 4: Implement the first-touch send script for queued tasks**
- [ ] **Step 5: Implement the reply sync script that creates human follow-up items**
- [ ] **Step 6: Add `package.json` script entries for the three operator commands**
- [ ] **Step 7: Re-run `npm run test:run -- tests/outreach-scripts.test.ts` and confirm pass**

### Task 13: Document the outreach workflow and verify the v1 guardrails

**Files:**
- Create: `docs/outreach-automation.md`
- Modify: `README.md`
- Test: `tests/outreach-v1-regression.test.ts`

- [ ] **Step 1: Write a failing regression test that proves the system does not auto-send a second-touch message**
- [ ] **Step 2: Run `npm run test:run -- tests/outreach-v1-regression.test.ts` and confirm failure**
- [ ] **Step 3: Document lead import, template behavior, first-touch sending, reply sync, and human handoff in `docs/outreach-automation.md`**
- [ ] **Step 4: Add a short README section linking to the outreach workflow**
- [ ] **Step 5: Re-run `npm run test:run -- tests/outreach-v1-regression.test.ts` and confirm pass**
- [ ] **Step 6: Run the focused verification set: `npm run test:run -- tests/outreach-store.test.ts tests/outreach-state.test.ts tests/obsidian-lead-import.test.ts tests/website-inquiry-leads.test.ts tests/outreach-templates.test.ts tests/outreach-attachments.test.ts tests/outreach-task-factory.test.ts tests/outreach-senders.test.ts tests/outreach-orchestrator.test.ts tests/outreach-replies.test.ts tests/outreach-handoff.test.ts tests/outreach-scripts.test.ts tests/outreach-v1-regression.test.ts`**
- [ ] **Step 7: Run `npm run build` and record any blockers or warnings that affect rollout**
