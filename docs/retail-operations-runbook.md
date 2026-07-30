# Direct retail operations runbook

## Catalog Agent

受控自动化 Agent 的目录协议、发布门槛与凭证配置流程见
[`retail-catalog-agent-api.md`](./retail-catalog-agent-api.md)；机器可读接口见
[`retail-catalog-agent-openapi.yaml`](./retail-catalog-agent-openapi.yaml)。在服务器秘密管理器
中通过 `RETAIL_AGENT_OPERATORS_JSON` 配置静态机器 principal（id、name、零售角色、至少
32 字符 token）；调用方仅以 `$RETAIL_AGENT_TOKEN` 注入该 token，绝不写入浏览器、代码、
日志或 Prompt。总开关为 `RETAIL_AGENT_ENABLED`，写开关为
`RETAIL_AGENT_CATALOG_WRITE_ENABLED`，生产写入还需
`RETAIL_AGENT_PRODUCTION_ENABLED`；疑似泄露时先关闭总开关，再替换受影响 principal 的 token
并审计其 actor 和幂等键。

## Production shape

- Deploy the Next.js application and API routes on Vercel.
- Use a managed PostgreSQL provider connected through Vercel Marketplace. Neon is the default for this project; keep the database region close to the Vercel Functions region.
- Store product media in Vercel Blob. The local filesystem is never a production source of retail images.
- A laptop or LAN server is suitable for development, migration rehearsals, and encrypted backup copies only. It is not the public payment backend: home power, network, TLS, webhook reachability, monitoring, and recovery are not reliable enough for order capture.
- The reservation/reconciliation job uses the authenticated GitHub Actions scheduler in `.github/workflows/retail-operations-cron.yml`, so the application can stay on Vercel Hobby. Its target frequency is every five minutes, but GitHub scheduling is best-effort and can be delayed. Scheduled workflows run only from the default branch; public-repository schedules may be disabled after prolonged repository inactivity. Set `RETAIL_CRON_ENDPOINT` and `CRON_SECRET` as GitHub repository secrets, keep the same `CRON_SECRET` in Vercel, and never point the scheduled workflow at a preview database. Do not silently weaken the schedule to Vercel Hobby's once-daily cron.

## Initial deployment

1. Create separate Neon branches/databases for preview and production. Never point a preview deployment at production order data.
2. In the provider console for the explicitly selected database, provision the single-row `retail_runtime_environment` sentinel with a distinct 16–128 character identity. Configure the same value as `RETAIL_DATABASE_IDENTITY` in the matching Vercel environment. Set a Preview-only `RETAIL_DATABASE_URL` for the dedicated preview branch; it overrides the marketplace `DATABASE_URL`. Set `RETAIL_DATABASE_ENVIRONMENT=preview` for Preview and `production` for Production; checkout fails closed if it does not match `VERCEL_ENV`. The application compares both controls before every retail query. Retail media requires `RETAIL_BLOB_STORE_ID`, the exact public `RETAIL_BLOB_HOSTNAME`, and either the dedicated `RETAIL_BLOB_READ_WRITE_TOKEN` or Vercel runtime OIDC. The code checks the store embedded in a legacy token and rejects delete URLs from another hostname; never reuse the private outreach `BLOB_READ_WRITE_TOKEN`. Vercel's automatically injected Blob webhook public key is not a runtime requirement until the application has a webhook receiver. Do not put credentials in source, issue text, or agent prompts.
3. Run `npm run migrate:retail` against the target database with that same `RETAIL_DATABASE_IDENTITY`. The runner takes a session-level advisory lock across target preflight and the complete migration run, records a SHA-256 receipt in `retail_schema_migrations`, validates but never writes the database sentinel, skips an already-applied identical migration, and stops on a checksum or identity mismatch.
4. In `/admin/retail`, create at least one active shipping country before enabling checkout. Create retail-only draft products, upload verified images, set prices and stock, then publish them. Wholesale, Amazon, and Noon data are not imported.
5. Configure transactional delivery with `RETAIL_RESEND_API_KEY`, `RETAIL_EMAIL_FROM`, and a server-only `RETAIL_PORTAL_TOKEN_SECRET` that is at least 32 characters. Never expose this secret to the browser. Rotation does not automatically invalidate database-backed confirmation links: existing links remain valid until expiry or explicit revocation. Before rotation, drain or manually handle pending/failed confirmation notifications; retrying the same notification after the secret changes can conflict with its stored token hash. Rotate only in a controlled support window, then manually reissue replacement links where required. Check `/api/retail/health`. A `200` response requires the payment gate, database schema, and at least one active shipping zone; Production also requires the complete notification configuration.
6. Configure the PayPal webhook URL as `/api/retail/webhook` and subscribe to checkout approval, capture completed/denied/reversed, and refund events.
7. Merge the workflow to the default branch, add the GitHub repository secrets `RETAIL_CRON_ENDPOINT=https://your-production-domain/api/cron/retail/reservations` and `CRON_SECRET` (matching Vercel), manually dispatch `Retail operations cron`, and confirm a successful response before relying on the schedule.
8. Set `RETAIL_SHOP_ENABLED=true` only after the sandbox acceptance checklist passes. Use `RETAIL_PAYMENT_MODE=sandbox` with the Sandbox endpoint in local and Preview. Live mode is permitted only in Production with `RETAIL_PAYMENT_MODE=live` and the exact Live endpoint; Preview cannot enable Live mode.

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
- Monitor Vercel Function errors for the cron, checkout, capture, webhook, admin, and health routes, plus failed or unexpectedly absent `Retail operations cron` workflow runs. The workflow retries transient request failures twice and fails on a non-2xx response, invalid JSON, `pending > 0`, or `notifications.failed > 0`; any failure must alert an operator.

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

### Staged expand/contract release

For the locale/notification schema change, perform a two-stage release in each target environment, including Preview; do not combine the migration phases or allow a mixed schema/outbox state.

1. Pause checkout and the retail cron/notification delivery. Inspect and resolve, or explicitly hand off for manual reconciliation, all `processing` and `pending` risk before changing the schema, with particular attention to pending/failed confirmation notifications and their customer-portal tokens.
2. Apply only the expand phase to the explicitly selected target database with `RETAIL_MIGRATION_TARGET=20260811_retail_order_locale_notifications.sql npm run migrate:retail`. Confirm the migration receipt, database identity, and checksums all match that target. Do not apply the `20260812` contract migration yet.

Before proceeding to step 3, run these read-only count queries against that same target database. They intentionally return no recipient, token digest, or other customer detail:

```sql
SELECT
  count(*) FILTER (WHERE status = 'processing') AS processing_count,
  count(*) FILTER (WHERE status = 'pending') AS pending_count
FROM retail_notification_outbox
WHERE status IN ('processing', 'pending');

SELECT count(*) AS unmapped_active_confirmation_count
FROM retail_notification_outbox AS n
WHERE n.kind = 'order_confirmed'
  AND n.status IN ('pending', 'failed', 'processing')
  AND EXISTS (
    SELECT 1
    FROM retail_customer_portal_tokens AS t
    WHERE t.order_id = n.order_id
      AND t.revoked_at IS NULL
      AND t.expires_at > now()
  )
  AND NOT EXISTS (
    SELECT 1
    FROM retail_customer_portal_notification_tokens AS m
    WHERE m.notification_id = n.id
  );
```

Record the count readback. `unmapped_active_confirmation_count` is a hard gate and must equal `0`. If it is nonzero, stop the release, keep checkout and delivery paused, and record and manually resolve the affected notifications before rerunning the query; do not deploy the new code or continue to the contract phase.

3. Deploy the build that recognizes the new notification kinds, then verify the running deployment is the exact intended commit (not merely the intended branch or a completed build). Keep checkout, cron, and notification delivery paused until this verification succeeds.
4. Run `npm run migrate:retail` without `RETAIL_MIGRATION_TARGET` only after the new code is serving and its exact commit has been verified; this applies the `20260812` contract phase. Check `/api/retail/health` and require HTTP `200`; only then restore checkout and the cron/notification delivery.

At any point, stop the release and keep the affected paths paused if database identity, migration checksum, or notification-outbox state is inconsistent, or if the code and schema represent different phases. Resolve the inconsistency before retrying; do not bypass the gate by resuming a mixed deployment.
