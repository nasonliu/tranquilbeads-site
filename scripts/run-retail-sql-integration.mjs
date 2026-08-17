import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import pg from "pg";

const connectionString = process.env.RETAIL_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error("RETAIL_DATABASE_URL or DATABASE_URL is required");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const integrationFiles = [
  "retail-admin-write-consistency.integration.sql",
  "retail-atomic-capture.integration.sql",
];
const { Client } = pg;
const client = new Client({ connectionString });
await client.connect();
try {
  for (const file of integrationFiles) {
    const source = await fs.readFile(path.join(root, "tests", file), "utf8");
    await client.query(source.replace(/^\\set ON_ERROR_STOP on\s*/m, ""));
  }
  console.log("retail SQL integration: passed");
} finally {
  await client.end();
}
