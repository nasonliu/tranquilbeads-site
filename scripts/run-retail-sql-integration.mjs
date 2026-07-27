import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = await fs.readFile(path.join(root, "tests", "retail-admin-write-consistency.integration.sql"), "utf8");
const { Client } = pg;
const client = new Client({ connectionString });
await client.connect();
try {
  await client.query(source.replace(/^\\set ON_ERROR_STOP on\s*/m, ""));
  console.log("retail SQL integration: passed");
} finally {
  await client.end();
}
