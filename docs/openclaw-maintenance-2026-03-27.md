# TranquilBeads Maintenance Notes

Date: 2026-03-27

## Purpose

This note records the March 27 fixes around the homepage links and the
`image-manager -> sync -> site.ts -> website` pipeline, so OpenClaw can
maintain the current behavior without reintroducing the same regressions.

## Current architecture

The active content pipeline is:

1. `app/[locale]/tools/image-manager/page.tsx`
   The editor for product text, collections, and image slots.
2. `app/data/image-manager-products.json`
   The source of truth for image-manager product records.
3. `app/api/image-manager/products/route.ts`
   CRUD API for image-manager records.
4. `app/api/image-manager/sync/route.ts`
   Runs the sync script and returns structured sync results.
5. `scripts/sync-products.py`
   Generates the `products` block in `src/data/site.ts`.
6. `src/data/site.ts`
   Runtime source for website collections, products, copy, and navigation.
7. `app/[locale]/**`
   Website pages read product and collection data from `src/data/site.ts`.

## Issues fixed in this round

### 1. Homepage product links were inconsistent

Problem:
- The homepage used a hardcoded `topProducts` list.
- The list mixed real slugs, unrelated images, and wrong collection paths.
- Product detail links were previously forced into
  `/collections/signature-tasbih/{slug}`.

Fix:
- Homepage ranked cards now derive their destination from real product data.
- Each ranked card carries its actual `collection + slug`.
- Featured collection cards now link to their own collection detail pages
  instead of the generic collections index.

Files:
- [app/[locale]/page.tsx](/Volumes/新加卷/Documents/ProjectNoor/app/[locale]/page.tsx)

### 2. Image-manager product model was inconsistent

Problem:
- The page used `collections: string[]`.
- The products API still typed records as `collection: string`.
- Legacy records could pass through without normalization.

Fix:
- The products API now normalizes all records to `collections: string[]`.
- Legacy single `collection` records are converted to a one-item array.
- Add/update operations persist the normalized array model.

Files:
- [app/api/image-manager/products/route.ts](/Volumes/新加卷/Documents/ProjectNoor/app/api/image-manager/products/route.ts)

### 3. Sync success toast expected fields the API did not return

Problem:
- The image-manager UI expected `added`, `updated`, and `total`.
- The sync API only returned `{ success, message }`.

Fix:
- The sync route now returns structured JSON from the Python sync script:
  `success`, `added`, `updated`, `total`, `message`.
- The image-manager UI now prefers the structured counters and falls back to
  `message` if needed.

Files:
- [app/api/image-manager/sync/route.ts](/Volumes/新加卷/Documents/ProjectNoor/app/api/image-manager/sync/route.ts)
- [app/[locale]/tools/image-manager/page.tsx](/Volumes/新加卷/Documents/ProjectNoor/app/[locale]/tools/image-manager/page.tsx)

### 4. Extra collection tags were dropped during sync

Problem:
- The sync script only used the first collection:
  `p.get('collections', [''])[0]`.
- This silently discarded additional collection tags selected in the editor.

Fix:
- The first collection still becomes the website `product.collection`.
- All selected collections are now preserved in generated tags.
- If a product has more than one collection tag, the script also writes a
  `Collection Tags` spec row into `src/data/site.ts`.

Files:
- [scripts/sync-products.py](/Volumes/新加卷/Documents/ProjectNoor/scripts/sync-products.py)

## Important maintenance rules

### Homepage

- If OpenClaw changes homepage ranked products, it must keep `collection` and
  `slug` aligned with real records in `src/data/site.ts`.
- Do not hardcode product detail paths with a fixed collection prefix.
- The correct pattern is:
  `/[locale]/collections/{product.collection}/{product.slug}`

### Image-manager data

- Treat `app/data/image-manager-products.json` as the editable source for
  image-manager products.
- The canonical model for that file is:
  - `slug: string`
  - `name: string`
  - `nameAr: string`
  - `material: string`
  - `collections: string[]`
  - `images: string[]`
- Legacy `collection: string` may be read, but new writes should always use
  `collections`.

### Sync behavior

- `scripts/sync-products.py` rewrites the entire `export const products` block
  in `src/data/site.ts`.
- It does not append manually edited product entries safely. Manual edits inside
  the generated `products` block can be overwritten on the next sync.
- If OpenClaw needs to preserve website-only logic, keep that logic outside the
  generated `products` array.

### Collections semantics

- `product.collection` in `src/data/site.ts` is still a single primary
  collection used for routing.
- Extra collections from image-manager are treated as metadata, not as extra
  route parents.
- If future work requires one product to appear under multiple route trees, the
  route/data model must be redesigned. Current code does not support that.

## Validation commands

### Fast regression checks

```bash
npm run test:run -- tests/image-manager-api.test.ts tests/image-manager-sync-route.test.ts tests/sync-products.test.ts tests/site-rendering.test.tsx
```

### Manual sync check

```bash
python3 scripts/sync-products.py
```

Expected shape:

```json
{
  "success": true,
  "added": 0,
  "updated": 0,
  "total": 0,
  "message": "..."
}
```

### Build check

```bash
npm run build
```

## Known caveats

- `npm run lint` is currently noisy because the repository includes generated
  `.next` output and other worktree content that ESLint scans. Treat lint output
  cautiously until lint scope is cleaned up.
- The repo currently contains both `app/` and `src/app/`. The active App Router
  build is using `app/`. Avoid changing duplicated files in `src/app/` unless
  the project explicitly re-aligns both trees.

## 2026-03-29 follow-up: public product images did not appear on the live site

### Symptom

- Local sync looked correct.
- [src/data/site.ts](/Volumes/新加卷/Documents/ProjectNoor/src/data/site.ts)
  already referenced imported product images.
- The public product page still showed empty images.
- Direct requests for imported files on production returned `404`.

Example affected page:
- [natural-kuka-wood-tasbih](/Volumes/新加卷/Documents/ProjectNoor/src/data/site.ts#L196)

### Root cause

The content sync was not the real problem. The real problem was that Vercel
production was still serving an older deployment because newer deployments were
failing.

Why they failed:

- Local-only `image-manager` routes were pulling in filesystem- and
  office-database-related code paths during Vercel tracing.
- Vercel then reported an oversized serverless function for
  `/api/image-manager/candidates`.
- Because the new production build never became current, the public site kept
  serving the older deployment that did not include the uploaded image assets.

### Fix

1. Keep local `image-manager` behavior for development.
2. Make the candidates route load the heavy local handler only outside Vercel.
3. Add explicit tracing exclusions in
   [next.config.ts](/Volumes/新加卷/Documents/ProjectNoor/next.config.ts) for:
   - `public/images/**/*`
   - `scripts/query-image-manager-candidates.py`
   - `src/lib/local-image-manager-candidates-route.ts`
   - `app/data/**/*`
4. Push the fix and wait for a fresh Vercel production deployment to complete.
5. Re-check the direct imported image URL and then the public product page.

Files:
- [next.config.ts](/Volumes/新加卷/Documents/ProjectNoor/next.config.ts)
- [app/api/image-manager/candidates/route.ts](/Volumes/新加卷/Documents/ProjectNoor/app/api/image-manager/candidates/route.ts)
- [src/lib/local-image-manager-candidates-route.ts](/Volumes/新加卷/Documents/ProjectNoor/src/lib/local-image-manager-candidates-route.ts)
- [tests/image-manager-candidates-route.test.ts](/Volumes/新加卷/Documents/ProjectNoor/tests/image-manager-candidates-route.test.ts)
- [tests/next-config.test.ts](/Volumes/新加卷/Documents/ProjectNoor/tests/next-config.test.ts)

### Verification that closed the issue

- `npm run test:run -- tests/image-manager-candidates-route.test.ts tests/next-config.test.ts`
- `npm run build`
- Direct production image check:

```bash
curl -I https://www.tranquilbeads.com/images/imported/natural-kuka-wood-tasbih/1774763467336-kuka_1.jpg
```

Expected result after the fix:
- `HTTP/2 200`

### Maintenance rule for OpenClaw

When a live product page appears to have “unsynced” images:

1. Check the production image URL first.
2. If it is `404`, inspect deployment status before changing content.
3. Treat Vercel deployment failure as the primary suspect if local data files
   already contain the imported image paths.
4. Do not assume `sync-products.py` is broken just because the public page is
   blank.

## Files touched in this fix

- [app/[locale]/page.tsx](/Volumes/新加卷/Documents/ProjectNoor/app/[locale]/page.tsx)
- [app/[locale]/tools/image-manager/page.tsx](/Volumes/新加卷/Documents/ProjectNoor/app/[locale]/tools/image-manager/page.tsx)
- [app/api/image-manager/products/route.ts](/Volumes/新加卷/Documents/ProjectNoor/app/api/image-manager/products/route.ts)
- [app/api/image-manager/sync/route.ts](/Volumes/新加卷/Documents/ProjectNoor/app/api/image-manager/sync/route.ts)
- [src/components/site-shell.tsx](/Volumes/新加卷/Documents/ProjectNoor/src/components/site-shell.tsx)
- [scripts/sync-products.py](/Volumes/新加卷/Documents/ProjectNoor/scripts/sync-products.py)
- [tests/image-manager-api.test.ts](/Volumes/新加卷/Documents/ProjectNoor/tests/image-manager-api.test.ts)
- [tests/image-manager-sync-route.test.ts](/Volumes/新加卷/Documents/ProjectNoor/tests/image-manager-sync-route.test.ts)
- [tests/sync-products.test.ts](/Volumes/新加卷/Documents/ProjectNoor/tests/sync-products.test.ts)
- [tests/site-rendering.test.tsx](/Volumes/新加卷/Documents/ProjectNoor/tests/site-rendering.test.tsx)
