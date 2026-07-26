# Direct retail operations runbook

## Production shape

- Deploy the Next.js application and API routes on Vercel.
- Use a managed PostgreSQL provider connected through Vercel Marketplace. Neon is the default for this project; keep the database region close to the Vercel Functions region.
- Store product media in Vercel Blob. The local filesystem is never a production source of retail images.
- A laptop or LAN server is suitable for development, migration rehearsals, and encrypted backup copies only. It is not the public payment backend: home power, network, TLS, webhook reachability, monitoring, and recovery are not reliable enough for order capture.
- The five-minute reservation/reconciliation job requires a Vercel plan that supports per-minute cron schedules, or an equivalent authenticated external scheduler. Do not silently deploy it on a once-daily Hobby schedule.

## Initial deployment

1. Create separate Neon branches/databases for preview and production. Never point a preview deployment at production order data.
2. Configure the server-only values documented in `.env.local.example` in the matching Vercel environment. Do not put credentials in source, issue text, or agent prompts.
3. Run `npm run migrate:retail` against the target database. The runner records a SHA-256 receipt in `retail_schema_migrations`, skips an already-applied identical migration, and stops on a checksum mismatch.
4. In `/admin/retail`, create at least one active shipping country before enabling checkout. Create retail-only draft products, upload verified images, set prices and stock, then publish them. Wholesale, Amazon, and Noon data are not imported.
5. Check `/api/retail/health`. A `200` response requires the payment gate, database schema, and at least one active shipping zone.
6. Configure the PayPal webhook URL as `/api/retail/webhook` and subscribe to checkout approval, capture completed/denied/reversed, and refund events.
7. Set `RETAIL_SHOP_ENABLED=true` only after the sandbox acceptance checklist passes.

## PayPal sandbox acceptance

Use a PayPal Sandbox business account for the merchant and a separate personal account for the buyer.

- Complete one normal order and verify the PayPal capture, local `captured` order, consumed reservation, payment ledger, confirmation outbox, and confirmation page.
- Cancel an unpaid order and verify all active reservations are released exactly once.
- Complete a partial refund and a final refund. Verify remote refund IDs, cumulative `refunded_minor`, signed ledger postings, admin audit rows, and notification outbox rows.
- Exercise an instrument-declined response and a simulated capture timeout. A remote completed capture must reconcile without releasing its stock hold.
- Send a valid webhook twice and an invalid-signature webhook once. The valid event must be idempotent and the invalid event must not mutate an order.
- Confirm the shipping address and subtotal/shipping/tax/discount total shown before PayPal match the stored immutable checkout snapshot and PayPal order.

## Daily operations

- Use `/admin/retail` for product, image, price, inventory, shipping-zone, order, address, fulfilment, cancellation, refund, and posting-ledger work.
- Never reduce on-hand stock below reserved stock. Investigate old `capturing`, `pending` refund requests, failed notifications, and unreconciled postings before changing inventory manually.
- Treat a PayPal refund that succeeded remotely but failed local reconciliation as pending. Do not create a new refund key; reconcile the recorded remote refund first.
- Monitor Vercel Function errors for the cron, checkout, capture, webhook, admin, and health routes. Vercel does not retry a failed cron invocation, so alert on non-2xx results.

## Backup and restore

- Enable an appropriate Neon history-retention/PITR policy for production and take scheduled snapshots if the selected plan supports them.
- Keep an encrypted logical `pg_dump` outside the Neon project as a secondary, portable backup. Do not treat a dump alone as point-in-time recovery.
- Quarterly, restore a snapshot or PITR point into an isolated branch, run `npm run migrate:retail`, query representative products/orders/ledger rows, and record the recovery time. Never test restore by overwriting the production branch.
- Vercel Blob objects must be inventoried against `retail_product_images`; retain an export of blob keys with the database backup. The blob-delete outbox is the authority for deferred deletion.

## Release gate

Before each production release run:

```bash
npm ci
npm run typecheck:retail
npm run test:retail
npm audit --omit=dev
npm run build
```

Then repeat the browser checkout against a preview deployment and its own PayPal Sandbox app/database. Unit tests do not replace this external acceptance.
