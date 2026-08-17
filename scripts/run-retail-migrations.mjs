import "dotenv/config";

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationNames = [
  "20260726_retail_payments.sql",
  "20260727_retail_operations.sql",
  "20260728_retail_checkout_v2.sql",
  "20260729_retail_admin_write_consistency.sql",
  "20260730_retail_checkout_return.sql",
  "20260730_retail_payment_reconciliation.sql",
  "20260731_retail_admin_roles_pii.sql",
  "20260731_retail_media_order.sql",
  "20260731_retail_storefront_zh.sql",
  "20260801_retail_admin_sessions.sql",
  "20260801_retail_atomic_admin_audit.sql",
  "20260801_retail_disputes.sql",
  "20260802_retail_variants_promotions.sql",
  "20260802_retail_customer_portal.sql",
  "20260802_retail_paypal_settlement.sql",
  "20260803_retail_rma.sql",
  "20260804_retail_variant_authority.sql",
  "20260805_retail_rma_permissions.sql",
  "20260806_retail_customer_address_admin.sql",
  "20260807_retail_rma_privacy_refund_cap.sql",
  "20260808_retail_concurrency_lock_order.sql",
  "20260809_retail_release_catalog_lock_order.sql",
  "20260810_retail_rma_refund_status.sql",
  "20260811_retail_order_locale_notifications.sql",
  "20260812_retail_order_locale_notification_contract.sql",
  "20260813_retail_promotion_line_allocation.sql",
  "20260814_retail_order_line_projection.sql",
  "20260815_retail_rma_refund_integrity.sql",
  "20260816_retail_rma_line_discount_cap.sql",
  "20260817_retail_media_delete_conflict.sql",
  "20260818_retail_product_styles.sql",
  "20260819_retail_product_pdp_content.sql",
  "20260820_retail_agent_catalog.sql",
  "20260821_retail_customer_accounts.sql",
  "20260822_retail_atomic_capture_customer_finalize.sql",
  "20260823_retail_global_shipping_foundation.sql",
  "20260824_retail_promotions_marketing_list.sql",
  "20260825_retail_admin_magic_links.sql",
  "20260826_retail_dynamic_shipping_checkout.sql",
  "20260827_retail_marketing_campaigns.sql",
];

const migrationTarget = process.env.RETAIL_MIGRATION_TARGET;
const migrationTargetIndex = migrationTarget ? migrationNames.indexOf(migrationTarget) : -1;
if (migrationTarget && migrationTargetIndex === -1) {
  throw new Error(`RETAIL_MIGRATION_TARGET must be one of: ${migrationNames.join(", ")}`);
}
const selectedMigrationNames = migrationTarget
  ? migrationNames.slice(0, migrationTargetIndex + 1)
  : migrationNames;

const connectionString = process.env.RETAIL_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error("RETAIL_DATABASE_URL or DATABASE_URL is required");
const databaseIdentity = process.env.RETAIL_DATABASE_IDENTITY;
if (!databaseIdentity || databaseIdentity.length < 16 || databaseIdentity.length > 128) throw new Error("RETAIL_DATABASE_IDENTITY is required");

const { Client } = pg;
const client = new Client({ connectionString });
const lockKey = "projectnoor.retail_schema_migrations";
const ensureLedger = `CREATE TABLE IF NOT EXISTS retail_schema_migrations (
  name TEXT PRIMARY KEY,
  sha256 TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`;

async function verifyDatabaseIdentity(activeClient) {
  const existing = await activeClient.query("SELECT identity FROM retail_runtime_environment WHERE singleton=true FOR UPDATE");
  // Provisioning owns the sentinel. A migration must never bless whichever
  // database URL it was accidentally pointed at by inserting the expected ID.
  if (existing.rows.length === 0) throw new Error("retail database identity is not provisioned");
  if (existing.rows.length !== 1 || existing.rows[0].identity !== databaseIdentity) throw new Error("retail database identity mismatch");
}

let migrationLockHeld = false;
await client.connect();
try {
  // Refuse the database before creating even the migration ledger. The
  // sentinel is provisioned out-of-band in the explicitly selected database.
  await client.query("BEGIN");
  try {
    await verifyDatabaseIdentity(client);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }

  // Hold this lock across preflight and every migration transaction. A target
  // runner must not successfully pass preflight while another runner advances
  // the schema to a receipt beyond that target.
  await client.query("SELECT pg_advisory_lock(hashtextextended($1, 0))", [lockKey]);
  migrationLockHeld = true;

  if (migrationTarget) {
    // A target is safe only when the database has not already advanced beyond
    // it.  Keep this preflight read-only: a fresh database must not gain a
    // ledger merely because a deployment checked an earlier target.
    await client.query("BEGIN READ ONLY");
    try {
      const ledger = await client.query("SELECT to_regclass('public.retail_schema_migrations') AS name");
      if (ledger.rows[0].name) {
        const laterNames = migrationNames.slice(migrationTargetIndex + 1);
        const surpassed = await client.query(
          "SELECT name FROM retail_schema_migrations WHERE name = ANY($1::text[]) ORDER BY name LIMIT 1",
          [laterNames],
        );
        if (surpassed.rows.length > 0) {
          throw new Error(`migration target already surpassed: ${surpassed.rows[0].name}`);
        }
      }
      await client.query("ROLLBACK");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  for (const name of selectedMigrationNames) {
    const source = await fs.readFile(path.join(root, "migrations", name), "utf8");
    const checksum = crypto.createHash("sha256").update(source).digest("hex");
    await client.query("BEGIN");
    try {
      await client.query(ensureLedger);
      const existing = await client.query("SELECT sha256 FROM retail_schema_migrations WHERE name = $1", [name]);
      if (existing.rows.length > 0) {
        if (existing.rows[0].sha256 !== checksum) throw new Error(`migration checksum mismatch: ${name}`);
        if (name === "20260730_retail_payment_reconciliation.sql") await verifyDatabaseIdentity(client);
        await client.query("COMMIT");
        console.log(`skip ${name}`);
        continue;
      }

      await client.query(source);
      if (name === "20260730_retail_payment_reconciliation.sql") await verifyDatabaseIdentity(client);
      await client.query("INSERT INTO retail_schema_migrations (name, sha256) VALUES ($1, $2)", [name, checksum]);
      await client.query("COMMIT");
      console.log(`applied ${name}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
} finally {
  try {
    if (migrationLockHeld) await client.query("SELECT pg_advisory_unlock(hashtextextended($1, 0))", [lockKey]);
  } finally {
    await client.end();
  }
}
