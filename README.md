This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Outreach Workflow

The first-touch outreach flow for TranquilBeads is documented in [docs/outreach-automation.md](/Volumes/新加卷/Documents/ProjectNoor/docs/outreach-automation.md). It covers lead import, localized templates, first-touch sending, reply sync, and human handoff.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Direct retail checkout

`/[locale]/shop` is an independent direct-retail shop. It reads only retail back-office tables (retail products, current retail prices, stock, and retail Blob images); it never reuses wholesale, Amazon, Noon, or marketplace product data. The shop safely stays unavailable when the database or an approved published product is absent.

Production checkout is designed for Vercel Node Functions and Neon managed Postgres provisioned through the Vercel Marketplace, not a local development server or a long-running local process. Local servers are appropriate for development and back-office work only; do not expose one as a production payment backend.

1. Provision Neon managed Postgres through the Vercel Marketplace. In the provider console for that explicitly selected database, create `retail_runtime_environment` and insert its one distinct 16–128 character identity sentinel before running application migrations. The migration runner only validates this pre-provisioned sentinel and never creates its value, so pointing it at an empty or wrong database fails closed. Then run `npm run migrate:retail`; it applies every versioned retail migration discovered by the runner in order under a PostgreSQL advisory lock and records checksums.
2. In Vercel Project Settings, set `RETAIL_SHOP_ENABLED=true`, the PayPal values listed in `.env.local.example`, and the retail public Blob-store values `RETAIL_BLOB_STORE_ID` plus the exact `RETAIL_BLOB_HOSTNAME`. Prefer a retail-only `RETAIL_DATABASE_URL` in Preview; it overrides the marketplace `DATABASE_URL` so manual Preview deployments cannot inherit the main database. Set `RETAIL_DATABASE_ENVIRONMENT=preview` in Preview and `production` in Production; it must match Vercel's deployment environment. Set `RETAIL_DATABASE_IDENTITY` to the sentinel already provisioned in that exact database; every retail query fails closed on a mismatch. Authentication may use the store's dedicated `RETAIL_BLOB_READ_WRITE_TOKEN` or Vercel runtime OIDC. Keep all secrets server-only; never prefix them with `NEXT_PUBLIC_`. Do not reuse `BLOB_READ_WRITE_TOKEN`: it belongs to the separate private outreach store. Vercel may also inject `RETAIL_BLOB_WEBHOOK_PUBLIC_KEY`, but this application does not consume it unless a Blob webhook route is added later.
3. Create a PayPal webhook pointing to `https://your-domain/api/retail/webhook`, subscribe to checkout/capture events, and set the resulting webhook ID as `PAYPAL_WEBHOOK_ID`.
4. Begin with PayPal Sandbox: set `RETAIL_PAYMENT_MODE=sandbox` and `PAYPAL_API_BASE_URL=https://api-m.sandbox.paypal.com` in local and Preview environments. Live payments require all three of `RETAIL_PAYMENT_MODE=live`, `VERCEL_ENV=production`, and `PAYPAL_API_BASE_URL=https://api-m.paypal.com`; a Preview deployment always fails closed for Live.
5. Set the same high-entropy `CRON_SECRET` in Vercel and the GitHub repository, then set the repository secret `RETAIL_CRON_ENDPOINT` to the production `/api/cron/retail/reservations` URL. Configure `RETAIL_RESEND_API_KEY`, `RETAIL_EMAIL_FROM`, and a server-only `RETAIL_PORTAL_TOKEN_SECRET` of at least 32 characters before enabling notification delivery. Set `RETAIL_EMAIL_REPLY_TO` to the monitored Google Workspace support mailbox so customer replies reach a real inbox while Resend sends the automated message. Promotional campaigns only target active double-opt-in subscribers, include an unsubscribe link and the business postal address from `RETAIL_MARKETING_POSTAL_ADDRESS`, and are delivered by the same authenticated operations cron. Checkout marketing consent remains optional and unchecked. Secret rotation does not automatically invalidate database-backed confirmation links: existing links remain valid until expiry or explicit revocation. Before rotating, drain or manually handle pending/failed confirmation notifications, because retrying the same notification after rotation can conflict with its stored token hash. After rotation, manually reissue replacement links where needed. After the workflow is merged to the default branch, `.github/workflows/retail-operations-cron.yml` targets authenticated capture reconciliation, reservation cleanup, transactional notifications, and scheduled campaigns every five minutes without requiring Vercel Pro. It fails visibly when the endpoint reports pending reconciliation or failed notifications. Checkout also performs safe cleanup inside its transaction. PayPal capture accepts only active stock holds: once a hold is released or expired, it cannot consume stock and must be recreated with a new checkout.
6. Deploy, then test a sandbox order and confirm the database order, reservation/ledger rows, webhook event, and audit records. Retail image upload is administrator-only and limited to 4 MiB because Vercel Route Handler request bodies have a lower practical limit than 5 MiB; do not replace this with a local filesystem. The routes fail closed when the shop gate, database URL, or PayPal configuration is missing. The accounting view is a signed posting ledger (payment, fee, refund, reversal); net is derived, not stored as an additional row. Before removing every sellable product or disabling the gate, complete or otherwise reconcile all existing orders.

Run `npm run typecheck:retail`, `npm run typecheck:admin`, `npm run test:retail:ci`, and `npm run build` before deployment. For a database-backed release check, run `npm run migrate:retail`, `npm run test:retail:sql`, and `npm run test:retail:concurrency` against an isolated PostgreSQL database. A local server is useful for browser validation, but payment and webhook acceptance must be repeated with PayPal Sandbox against a deployed preview using its own preview database.

See `docs/retail-operations-runbook.md` for shipping-zone setup, sandbox acceptance, monitoring, backup/PITR, restore drills, and release gates.
