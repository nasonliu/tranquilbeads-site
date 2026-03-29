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

## Local-only vs production boundary

OpenClaw must treat the `image-manager` tooling as a local maintenance surface,
not as a production Vercel feature.

- Local-only routes:
  - [app/api/image-manager/candidates/route.ts](/Volumes/新加卷/Documents/ProjectNoor/app/api/image-manager/candidates/route.ts)
  - [app/api/image-manager/candidates/preview/route.ts](/Volumes/新加卷/Documents/ProjectNoor/app/api/image-manager/candidates/preview/route.ts)
  - [app/api/images/route.ts](/Volumes/新加卷/Documents/ProjectNoor/app/api/images/route.ts)
- Local-only helpers:
  - [src/lib/local-image-manager-candidates-route.ts](/Volumes/新加卷/Documents/ProjectNoor/src/lib/local-image-manager-candidates-route.ts)
  - [scripts/query-image-manager-candidates.py](/Volumes/新加卷/Documents/ProjectNoor/scripts/query-image-manager-candidates.py)

These routes rely on local filesystem access, mounted office assets, or Python
subprocesses. They are intended for local `npm run dev`, not for Vercel
production execution.

Production protections:

- [next.config.ts](/Volumes/新加卷/Documents/ProjectNoor/next.config.ts) uses
  `outputFileTracingExcludes` to keep `public/images/**/*` and local-only image
  manager assets out of Vercel route traces for:
  - `/api/image-manager/candidates`
  - `/api/image-manager/candidates/preview`
  - `/api/images`
- The candidates route returns a Vercel stub response in production and only
  loads the real handlers outside Vercel.

Practical rule:

- If OpenClaw is working on product images locally, it may use the
  `image-manager` routes and local office database.
- If OpenClaw is validating the public website, it should assume those local
  routes are unavailable on Vercel by design.

## When a public product page shows empty images

Use this order. Do not start by changing product data blindly.

1. Check whether the image URL itself exists on production.

```bash
curl -I https://www.tranquilbeads.com/images/imported/<slug>/<file>.jpg
```

2. If the image returns `404`, check whether the latest Git commit actually
   reached Vercel production.

3. If Vercel is still serving an older deployment, inspect the latest
   deployment result before changing content. The most common failure mode in
   this project has been oversized serverless traces from local-only routes.

4. Only after production is healthy should OpenClaw re-check:
   - [app/data/image-manager-products.json](/Volumes/新加卷/Documents/ProjectNoor/app/data/image-manager-products.json)
   - [src/data/site.ts](/Volumes/新加卷/Documents/ProjectNoor/src/data/site.ts)

5. Confirm the product HTML references the expected imported files:

```bash
curl -s https://www.tranquilbeads.com/en/collections/signature-tasbih/natural-kuka-wood-tasbih
```

Expected outcome:

- The HTML should reference `/images/imported/...` URLs for the hero image and
  detail gallery.
- The image URL should return `200`.
- The product page should show the image slots populated in the browser.
