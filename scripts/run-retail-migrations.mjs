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
];

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

  for (const name of migrationNames) {
    const source = await fs.readFile(path.join(root, "migrations", name), "utf8");
    const checksum = crypto.createHash("sha256").update(source).digest("hex");
    await client.query("BEGIN");
    try {
      // Every runner takes the same transaction-scoped lock before it reads a
      // receipt. This closes the check-then-run race while keeping a failed
      // migration and its receipt in the same rollback boundary.
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [lockKey]);
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
  await client.end();
}
