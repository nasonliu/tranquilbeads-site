# Lead Keyword Expansion Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the tasbih lead-acquisition system so it finds more relevant buyer candidates while reducing packaging and promo-gift noise.

**Architecture:** Keep the current Google Maps -> classification -> enrichment flow, but widen the keyword library into region-aware packs, strengthen negative filtering in the pipeline and enrichment guard, and expose multi-keyword search through the MCP entrypoint. This keeps the current lead-review workflow intact while improving both recall and precision at the search layer.

**Tech Stack:** TypeScript, Vitest, MCP tool handlers, Google Places REST, existing lead pipeline/domain services

---

## Chunk 1: Keyword Packs

### Task 1: Expand the keyword library into region-aware packs

**Files:**
- Modify: `.worktrees/codex/tasbih-leads/src/domain/keywordLibrary.ts`
- Modify: `.worktrees/codex/tasbih-leads/src/domain/keywordLibrary.test.ts`

- [ ] **Step 1: Write failing tests for Gulf and Southeast Asia keyword coverage**
- [ ] **Step 2: Run `npm test -- src/domain/keywordLibrary.test.ts` and confirm failure**
- [ ] **Step 3: Replace the flat keyword list with grouped keyword packs for core product, channel, and B2B discovery**
- [ ] **Step 4: Add Gulf Arabic aliases and Southeast Asia variations without removing English fallback**
- [ ] **Step 5: Re-run `npm test -- src/domain/keywordLibrary.test.ts` and confirm pass**

## Chunk 2: Noise Reduction

### Task 2: Strengthen lead pipeline negative filtering

**Files:**
- Modify: `.worktrees/codex/tasbih-leads/src/domain/leadPipeline.ts`
- Modify: `.worktrees/codex/tasbih-leads/src/domain/leadPipeline.test.ts`

- [ ] **Step 1: Write failing tests for filtering packaging, trophies, promo gifts, and event-gift noise**
- [ ] **Step 2: Run `npm test -- src/domain/leadPipeline.test.ts` and confirm failure**
- [ ] **Step 3: Expand exclusion rules and role inference to identify promo, award, and packaging suppliers more reliably**
- [ ] **Step 4: Preserve borderline gift retailers while filtering obvious non-buyers**
- [ ] **Step 5: Re-run `npm test -- src/domain/leadPipeline.test.ts` and confirm pass**

### Task 3: Tighten enrichment candidate guardrails

**Files:**
- Modify: `.worktrees/codex/tasbih-leads/src/domain/enrichmentGuard.ts`
- Create: `.worktrees/codex/tasbih-leads/src/domain/enrichmentGuard.test.ts`

- [ ] **Step 1: Write failing tests for rejecting unrelated corporate promo and packaging candidates**
- [ ] **Step 2: Run `npm test -- src/domain/enrichmentGuard.test.ts` and confirm failure**
- [ ] **Step 3: Expand unrelated-industry keywords and preserve strong domain matches for valid candidates**
- [ ] **Step 4: Re-run `npm test -- src/domain/enrichmentGuard.test.ts` and confirm pass**

## Chunk 3: Search Entry Points

### Task 4: Expose multi-keyword search through the MCP layer

**Files:**
- Modify: `.worktrees/codex/tasbih-leads/src/mcp/tools.ts`
- Modify: `.worktrees/codex/tasbih-leads/docs/openclaw-mcp-setup.md`

- [ ] **Step 1: Write a failing test or handler assertion for optional `keywords[]` input**
- [ ] **Step 2: Run the targeted MCP tool test command and confirm failure**
- [ ] **Step 3: Update the MCP schema and dependency contract to accept optional `keywords[]` while keeping `keyword` backward compatible**
- [ ] **Step 4: Document the new multi-keyword usage in the OpenClaw MCP setup doc**
- [ ] **Step 5: Re-run the targeted MCP verification and confirm pass**

## Chunk 4: Verification

### Task 5: Verify the expanded acquisition flow end to end

**Files:**
- Review: `.worktrees/codex/tasbih-leads/src/domain/keywordLibrary.ts`
- Review: `.worktrees/codex/tasbih-leads/src/domain/leadPipeline.ts`
- Review: `.worktrees/codex/tasbih-leads/src/domain/enrichmentGuard.ts`
- Review: `.worktrees/codex/tasbih-leads/src/mcp/tools.ts`

- [ ] **Step 1: Run `npm test -- src/domain/keywordLibrary.test.ts src/domain/leadPipeline.test.ts src/domain/enrichmentGuard.test.ts`**
- [ ] **Step 2: Run the MCP-related verification command for updated tool wiring**
- [ ] **Step 3: Summarize which new keyword families are now supported and which noisy categories are explicitly filtered**
