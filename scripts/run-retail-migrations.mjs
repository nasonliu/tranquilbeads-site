import "dotenv/config";

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { neon } from "@neondatabase/serverless";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationNames = [
  "20260726_retail_payments.sql",
  "20260727_retail_operations.sql",
  "20260728_retail_checkout_v2.sql",
];

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const sql = neon(connectionString);
await sql.query(`CREATE TABLE IF NOT EXISTS retail_schema_migrations (
  name TEXT PRIMARY KEY,
  sha256 TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`);

for (const name of migrationNames) {
  const source = await fs.readFile(path.join(root, "migrations", name), "utf8");
  const checksum = crypto.createHash("sha256").update(source).digest("hex");
  const existing = await sql`SELECT sha256 FROM retail_schema_migrations WHERE name = ${name}`;
  if (existing.length > 0) {
    if (existing[0].sha256 !== checksum) throw new Error(`migration checksum mismatch: ${name}`);
    console.log(`skip ${name}`);
    continue;
  }

  // Migration files and names are repository-controlled. Appending the ledger
  // write to the same PostgreSQL query makes the migration and its receipt one
  // atomic unit; a failing statement records nothing.
  const quotedName = name.replaceAll("'", "''");
  await sql.query(`BEGIN;\n${source}\nINSERT INTO retail_schema_migrations (name, sha256) VALUES ('${quotedName}', '${checksum}');\nCOMMIT;`);
  console.log(`applied ${name}`);
}
