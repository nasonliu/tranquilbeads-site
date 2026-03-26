# TranquilBeads OpenClaw Handoff Spec

## Summary

Create a local handoff package so the user's OpenClaw installation can operate the TranquilBeads business site in a semi-automatic mode. The package must cover content updates, product import, site operations checks, deployment checks, and lead-handling helpers without requiring the user to remember repo internals.

## Goals

- Expose the TranquilBeads operating surface as a local MCP service.
- Wrap the MCP service with an OpenClaw workspace skill that follows the user's existing OpenClaw conventions.
- Support product import from structured JSON and from the user's downloaded goods spreadsheet after a cleaning step.
- Support site operations checks for Vercel deployment, domain, email, WhatsApp, and contact configuration.
- Support lead-handling helpers that prepare inquiry records and canned replies without directly sending messages.
- Keep the system semi-automatic: high-risk actions should require an explicit confirmation flag in the tool input, not an extra user question from the assistant.

## Non-Goals

- Do not implement a new payment stack.
- Do not take ownership of live WhatsApp or Gmail message sending.
- Do not attempt direct billing, registrar, or identity-provider mutations from the MCP service.

## Users

- Primary: the business owner using OpenClaw locally on macOS.
- Secondary: future local agents that need stable tools and predictable content files.

## Functional Requirements

### 1. Content management

- Read site settings, collections, products, and inquiry content from a stable local data model.
- Update public contact settings such as business email and WhatsApp link.
- Add or update collections and products.
- Preserve bilingual content support for English and Arabic.

### 2. Product import

- Define a stable JSON schema for product import.
- Provide a tool that validates incoming products, normalizes slugs, maps them into the site data model, and writes the site content file.
- Support a dry-run mode that returns a change summary without mutating files.
- Support import from a pre-cleaned JSON file generated from the downloaded spreadsheet.

### 3. Operational checks

- Report the current site contact configuration.
- Check that key site pages build and render.
- Check that the public domain resolves and TLS is valid.
- Check that the human mailbox target and agent mailbox subdomain settings are present in DNS.
- Check that the current Vercel deployment is reachable.

### 4. Lead handling helpers

- Convert a website inquiry payload into a normalized lead record.
- Generate a short follow-up suggestion for human reply and agent reply drafts.
- Keep this advisory only; no automatic outbound send in v1.

### 5. OpenClaw handoff

- Install a workspace skill under `~/.openclaw/workspace/skills`.
- Register a local MCP server in `~/.mcporter/mcporter.json`.
- Provide wrapper scripts so OpenClaw can call the MCP tools through `mcporter`.

## Safety Model

- Any tool that writes site data or mutates deployment-facing files must accept `confirm: true`.
- The skill should default to read-only or dry-run behavior unless the instruction clearly requests execution.
- DNS, Vercel, Google Workspace, and Resend should be checked, not directly edited, in this handoff package.

## Data Model

- Keep the public site data in repository-owned files under `src/data/`.
- Add machine-oriented import files under `src/data/imports/`.
- Keep a JSON schema for import payloads under `src/data/schemas/`.

## Testing Requirements

- Unit tests for product import normalization and validation.
- Unit tests for operations checks that do not require remote secrets.
- End-to-end local tests that run the import flow against a fixture and confirm the site data updates.
- End-to-end local tests that call the MCP server through the wrapper script for at least one read tool and one write tool in dry-run mode.

## Delivery Requirements

- Repository code for the MCP service and tests.
- Installed OpenClaw skill and mcporter registration on this machine.
- A short handoff document that tells the user what the skill does, what files it touches, and how to run a smoke test.
