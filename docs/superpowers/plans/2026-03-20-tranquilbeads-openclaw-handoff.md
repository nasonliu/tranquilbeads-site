# TranquilBeads OpenClaw Handoff Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local MCP + OpenClaw skill handoff so OpenClaw can manage TranquilBeads site content, product import, ops checks, and lead preparation in a semi-automatic way.

**Architecture:** Keep the public Next.js site reading a typed local data file. Add a small Node-based MCP server plus library modules for content IO, product import, ops checks, and lead normalization. Expose those capabilities through `mcporter`, then wrap the operational workflows in a workspace skill installed into the user's local OpenClaw workspace.

**Tech Stack:** Next.js, TypeScript, Vitest, Node stdio MCP server, mcporter, OpenClaw workspace skills

---

## Chunk 1: Data and import foundation

### Task 1: Define the import file structure

**Files:**
- Create: `src/data/imports/products.sample.json`
- Create: `src/data/schemas/product-import.schema.json`
- Modify: `src/data/site.ts`
- Test: `tests/product-import.test.ts`

- [ ] **Step 1: Write the failing import validation tests**
- [ ] **Step 2: Run `npm run test:run -- tests/product-import.test.ts` and confirm failure**
- [ ] **Step 3: Add the product import schema and sample payload**
- [ ] **Step 4: Add typed helpers in site data so imported products can be written safely**
- [ ] **Step 5: Re-run `npm run test:run -- tests/product-import.test.ts` and confirm pass**

### Task 2: Build import normalization helpers

**Files:**
- Create: `src/lib/catalog-types.ts`
- Create: `src/lib/product-import.ts`
- Modify: `src/data/site.ts`
- Test: `tests/product-import.test.ts`

- [ ] **Step 1: Extend tests to cover slug normalization, bilingual fallback, and dry-run output**
- [ ] **Step 2: Run the product import tests and confirm failure**
- [ ] **Step 3: Implement normalization and merge helpers in focused library files**
- [ ] **Step 4: Re-run the product import tests and confirm pass**

## Chunk 2: MCP tools and local workflows

### Task 3: Build the MCP tool library

**Files:**
- Create: `src/lib/site-admin.ts`
- Create: `src/lib/ops-checks.ts`
- Create: `src/lib/lead-tools.ts`
- Test: `tests/site-admin.test.ts`
- Test: `tests/ops-checks.test.ts`

- [ ] **Step 1: Write failing tests for content reads, contact updates, and ops summaries**
- [ ] **Step 2: Run the targeted tests and confirm failure**
- [ ] **Step 3: Implement pure library functions that power the future MCP tools**
- [ ] **Step 4: Re-run the targeted tests and confirm pass**

### Task 4: Expose the library through a local MCP server

**Files:**
- Create: `scripts/tranquilbeads-ops-mcp.mjs`
- Create: `scripts/run-tranquilbeads-mcp.sh`
- Test: `tests/mcp-smoke.test.ts`

- [ ] **Step 1: Write a smoke test that calls the wrapper script in read-only mode**
- [ ] **Step 2: Run the smoke test and confirm failure**
- [ ] **Step 3: Implement the stdio MCP server and wrapper shell script**
- [ ] **Step 4: Re-run the smoke test and confirm pass**

## Chunk 3: OpenClaw handoff and machine install

### Task 5: Create the OpenClaw workspace skill

**Files:**
- Create: `openclaw/skills/tranquilbeads-ops/SKILL.md`
- Create: `openclaw/skills/tranquilbeads-ops/scripts/tranquilbeads-ops.sh`
- Modify: `~/.openclaw/workspace/skills/tranquilbeads-ops/...` during installation
- Test: `tests/openclaw-skill.test.ts`

- [ ] **Step 1: Write a test that asserts the skill assets render the right server and tool names**
- [ ] **Step 2: Run `npm run test:run -- tests/openclaw-skill.test.ts` and confirm failure**
- [ ] **Step 3: Create the skill assets and shell wrapper**
- [ ] **Step 4: Re-run the skill test and confirm pass**

### Task 6: Install and register the handoff locally

**Files:**
- Create: `scripts/install-openclaw-handoff.mjs`
- Modify: `/Users/nason/.mcporter/mcporter.json`
- Modify: `/Users/nason/.openclaw/workspace/skills/tranquilbeads-ops/...`
- Test: `tests/install-handoff.test.ts`

- [ ] **Step 1: Write an installation test against temp directories**
- [ ] **Step 2: Run the installation test and confirm failure**
- [ ] **Step 3: Implement the installer and run it against the real local OpenClaw directories**
- [ ] **Step 4: Re-run the installation test and confirm pass**

## Chunk 4: Verification and handoff docs

### Task 7: Add fixtures and end-to-end import verification

**Files:**
- Create: `tests/fixtures/product-import-fixture.json`
- Modify: `tests/mcp-smoke.test.ts`
- Modify: `tests/site-rendering.test.tsx`

- [ ] **Step 1: Add a fixture-based import test that writes a sample product set**
- [ ] **Step 2: Run the end-to-end tests and confirm any missing pieces**
- [ ] **Step 3: Implement the final glue needed for import-to-site visibility**
- [ ] **Step 4: Re-run the end-to-end tests and confirm pass**

### Task 8: Document the operational handoff

**Files:**
- Create: `docs/openclaw-handoff.md`
- Modify: `README.md`

- [ ] **Step 1: Document the installed skill, the MCP server name, and the smoke-test commands**
- [ ] **Step 2: Run the full verification set: `npm run test:run`, `npm run lint`, `npm run build`**
- [ ] **Step 3: Manually smoke-test one mcporter read call and one dry-run import call**
- [ ] **Step 4: Record the exact verification commands and outcomes in the handoff doc**
