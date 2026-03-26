# TranquilBeads OpenClaw Handoff

## Installed surfaces

- MCP server name: `tranquilbeads-ops`
- Workspace skill: `~/.openclaw/workspace/skills/tranquilbeads-ops`
- Repo server entrypoint: [scripts/tranquilbeads-ops-mcp.ts](/Volumes/新加卷/Documents/ProjectNoor/scripts/tranquilbeads-ops-mcp.ts)
- Repo installer: [scripts/install-openclaw-handoff.ts](/Volumes/新加卷/Documents/ProjectNoor/scripts/install-openclaw-handoff.ts)

## What it can do

- Read the current site snapshot
- Dry-run or apply contact info updates
- Dry-run or apply product imports from JSON
- Check public site reachability, TLS, and DNS
- Normalize inquiries into lead follow-up drafts

## Product import contract

- Sample payload: [products.sample.json](/Volumes/新加卷/Documents/ProjectNoor/src/data/imports/products.sample.json)
- Schema: [product-import.schema.json](/Volumes/新加卷/Documents/ProjectNoor/src/data/schemas/product-import.schema.json)
- Live content file: [site-content.json](/Volumes/新加卷/Documents/ProjectNoor/src/data/site-content.json)

## Smoke tests

- List the registered tools:

```bash
mcporter list tranquilbeads-ops --schema
```

- Read the current site snapshot:

```bash
mcporter call tranquilbeads-ops.get_site_snapshot --args '{"filePath":"/Volumes/新加卷/Documents/ProjectNoor/src/data/site-content.json"}'
```

- Dry-run a product import:

```bash
mcporter call tranquilbeads-ops.import_products --args '{"targetFilePath":"/Volumes/新加卷/Documents/ProjectNoor/src/data/site-content.json","importFile":"/Volumes/新加卷/Documents/ProjectNoor/src/data/imports/products.sample.json","confirm":false}'
```

- Apply a product import:

```bash
mcporter call tranquilbeads-ops.import_products --args '{"targetFilePath":"/Volumes/新加卷/Documents/ProjectNoor/src/data/site-content.json","importFile":"/Volumes/新加卷/Documents/ProjectNoor/src/data/imports/products.sample.json","confirm":true}'
```

## Verification run

- `npm run test:run -- tests/product-import.test.ts tests/site-admin.test.ts tests/ops-checks.test.ts tests/inquiry-form.test.tsx tests/site-rendering.test.tsx tests/openclaw-skill.test.ts tests/install-handoff.test.ts tests/mcp-smoke.test.ts`
- `npm run lint`
- `npm run build`
- `mcporter list --stdio "npm run --silent mcp:stdio" --schema`
- `mcporter call --stdio "npm run --silent mcp:stdio" get_site_snapshot --args '{"filePath":"/Volumes/新加卷/Documents/ProjectNoor/src/data/site-content.json"}'`
