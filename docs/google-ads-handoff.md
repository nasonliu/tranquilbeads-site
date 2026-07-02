# Google Ads Ops Handoff

Last updated: 2026-07-02

This branch contains the Google Ads API helper code, Google Ads/GTM tracking integration, Noon tracking links, campaign launch notes, and tests needed to continue TranquilBeads ad operations from another machine.

## What Is In Git

- `src/lib/google-ads-api.ts` - Google Ads OAuth, searchStream, conversion action helpers.
- `scripts/google-ads-api.ts` - CLI for auth URL, token exchange, customer listing, and conversion listing.
- `scripts/create-google-ads-cold-start.ts` - Creates the paused cold-start Search campaign structure. The current campaigns have already been created and enabled.
- `scripts/tranquilbeads-ops-mcp.ts` - MCP tools for Google Ads auth URL, customer listing, conversion listing, and dry-run conversion action planning.
- `app/layout.tsx` - GTM and Google Ads outbound retail conversion tracking.
- `src/data/noon-products.ts` - Noon UAE tracking links for the first three tracked products.
- `.env.local.example` - Environment variable template only. It intentionally contains no secrets.
- `docs/google-ads-api-setup.md` - API setup and token-generation notes.
- `docs/google-ads-launch-plan.md` - Launch plan, campaign IDs, budgets, tracking status, and optimization cadence.

## What Is Not In Git

Real secrets are not committed:

- `GOOGLE_ADS_DEVELOPER_TOKEN`
- `GOOGLE_ADS_CLIENT_SECRET`
- `GOOGLE_ADS_REFRESH_TOKEN`
- any real `.env.local` file

On this machine, a local transfer bundle was created in:

```text
handoff-private/
```

That directory is ignored by git.

## Secret Transfer Files

The local handoff directory contains:

```text
handoff-private/google-ads.env.local
handoff-private/google-ads.env.local.enc
handoff-private/google-ads-env.passphrase.txt
```

Use one of these approaches:

1. Preferred for direct machine transfer: copy `google-ads.env.local` to the other computer and rename it to `.env.local` in the project root.
2. Preferred for cloud or less-trusted transfer: copy `google-ads.env.local.enc` and transmit the passphrase separately. Decrypt on the other computer:

```bash
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
  -in google-ads.env.local.enc \
  -out .env.local \
  -pass file:google-ads-env.passphrase.txt
```

After placing `.env.local`, restrict permissions:

```bash
chmod 600 .env.local
```

## Setup On Another Computer

Clone and switch to this branch:

```bash
git clone https://github.com/nasonliu/tranquilbeads-site.git
cd tranquilbeads-site
git switch codex/google-ads-ops-handoff
```

Install dependencies:

```bash
npm install
```

Copy the real env file into the project root:

```bash
cp /path/to/google-ads.env.local .env.local
chmod 600 .env.local
```

Verify Google Ads API access:

```bash
npm run google-ads:api -- list-customers
npm run google-ads:api -- list-conversions 7091121019
```

Expected accessible customers include:

```text
customers/7091121019
customers/8010459176
```

## Current Google Ads State

Customer account:

```text
709-112-1019
```

Manager account:

```text
801-045-9176
```

Cold-start campaigns created and enabled on 2026-07-02:

```text
TB Search AE Cold Start 20260702-0620  ID 23997958969  USD 5/day
TB Search SA Cold Start 20260702-0620  ID 23988469083  USD 2/day
TB Search DE Cold Start 20260702-0620  ID 23988468408  USD 2/day
```

At the last API check, all three campaigns were `ENABLED`, serving status was `SERVING`, and ads were still under review.

## Checks

Run targeted tests:

```bash
npm run test:run -- tests/google-ads-api.test.ts tests/google-ads-mcp.test.ts tests/mcp-smoke.test.ts
```

Run a production build:

```bash
npm run build
```

## Operating Notes

- Keep `GOOGLE_ADS_LOGIN_CUSTOMER_ID` empty for the current setup. Setting it to `8010459176` caused `USER_PERMISSION_DENIED` for customer `7091121019`.
- The `create-google-ads-cold-start` script should not be run with `--create` again unless you intentionally want another set of campaigns. It blocks duplicate cold-start campaign creation unless `--force` is used.
- The current first-week budget cap is USD 9/day across AE, SA, and DE.
- Review search terms daily after impressions begin. Add negatives before raising budgets.
