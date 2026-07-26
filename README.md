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

1. Provision Neon managed Postgres through the Vercel Marketplace and run both `migrations/20260726_retail_payments.sql` and `migrations/20260727_retail_operations.sql` in that order.
2. In Vercel Project Settings, set `RETAIL_SHOP_ENABLED=true`, `DATABASE_URL`, the PayPal values listed in `.env.local.example`, `BLOB_READ_WRITE_TOKEN`, and the exact `RETAIL_BLOB_HOSTNAME`. Keep all secrets server-only; never prefix them with `NEXT_PUBLIC_`.
3. Create a PayPal webhook pointing to `https://your-domain/api/retail/webhook`, subscribe to checkout/capture events, and set the resulting webhook ID as `PAYPAL_WEBHOOK_ID`.
4. Begin with PayPal Sandbox. The live API endpoint is accepted only when `PAYPAL_API_BASE_URL` exactly equals `https://api-m.paypal.com`.
5. Set a high-entropy `CRON_SECRET`; `vercel.json` runs the authenticated reservation cleanup every five minutes. Checkout also performs the same cleanup inside its transaction. PayPal capture accepts only active stock holds: once a hold is released or expired, it cannot consume stock and must be recreated with a new checkout.
6. Deploy, then test a sandbox order and confirm the database order, reservation/ledger rows, webhook event, and audit records. Retail image upload is administrator-only and limited to 4 MiB because Vercel Route Handler request bodies have a lower practical limit than 5 MiB; do not replace this with a local filesystem. The routes fail closed when the shop gate, database URL, or PayPal configuration is missing. The accounting view is a signed posting ledger (payment, fee, refund, reversal); net is derived, not stored as an additional row. Before removing every sellable product or disabling the gate, complete or otherwise reconcile all existing orders.

Run `npm run test:retail` and `npm run typecheck:retail` before deployment. A local server is useful for browser validation, but payment and webhook acceptance must be repeated with PayPal Sandbox against a deployed preview using its own preview database.
