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

`/[locale]/shop` has an independent, intentionally empty direct-retail catalog in `src/data/retail/catalog.ts`. It does not reuse wholesale, Amazon, Noon, or marketplace product data. Add only approved direct-retail SKUs (including their own copy, image, currency, amount, availability, and fulfilment review) to that file. Until then the shop states that the catalog is in preparation and does not load PayPal.

Production checkout is designed for Vercel Node Functions and Neon managed Postgres provisioned through the Vercel Marketplace, not a local development server or a long-running local process. Local servers are appropriate for development and back-office work only; do not expose one as a production payment backend.

1. Provision Neon managed Postgres through the Vercel Marketplace and run `migrations/20260726_retail_payments.sql` using its SQL console or migration workflow.
2. In Vercel Project Settings, set `RETAIL_SHOP_ENABLED=true`, `DATABASE_URL`, and the PayPal values listed in `.env.local.example`. Keep `PAYPAL_CLIENT_SECRET` server-only; never prefix it with `NEXT_PUBLIC_`.
3. Create a PayPal webhook pointing to `https://your-domain/api/retail/webhook`, subscribe to checkout/capture events, and set the resulting webhook ID as `PAYPAL_WEBHOOK_ID`.
4. Begin with PayPal Sandbox. The live API endpoint is accepted only when `PAYPAL_API_BASE_URL` exactly equals `https://api-m.paypal.com`.
5. Deploy, then test a sandbox order and confirm the database order, webhook event, and audit records. The routes fail closed when the shop gate, catalog, database URL, or PayPal configuration is missing. Before removing every sellable catalog item or disabling the gate, complete or otherwise reconcile all existing orders.
