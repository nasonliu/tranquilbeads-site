import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { describe, expect, it } from "vitest";
import { readFileSync, statSync } from "node:fs";
import { chmod, mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const processEnv = Object.fromEntries(
  Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
);
const exactTools = [
  "retail_catalog_get", "retail_product_create_draft", "retail_product_update",
  "retail_product_content_replace", "retail_style_create", "retail_style_update",
  "retail_variant_create", "retail_variant_update", "retail_media_upload",
  "retail_media_reorder", "retail_product_publish", "retail_inventory_get",
  "retail_inventory_adjust", "retail_orders_list", "retail_orders_export",
  "retail_order_fulfil", "retail_sales_summary", "retail_sales_breakdown",
  "retail_sales_export", "retail_activity_log",
].sort();

const launcher = join(process.cwd(), "scripts/run-retail-ops-mcp.sh");
const dummyToken = "launcher-test-token-".padEnd(40, "x");

async function launcherTools(tokenFile: string, extraEnv: Record<string, string> = {}) {
  const client = new Client({ name: "retail-launcher-permission-test", version: "1.0.0" });
  const transport = new StdioClientTransport({
    command: launcher,
    cwd: process.cwd(),
    env: {
      ...processEnv,
      NODE_ENV: process.env.NODE_ENV ?? "test",
      RETAIL_AGENT_TOKEN: "",
      RETAIL_AGENT_TOKEN_FILE: tokenFile,
      RETAIL_AGENT_BASE_URL: "http://127.0.0.1:9",
      ...extraEnv,
    },
    stderr: "pipe",
  });
  try {
    await client.connect(transport);
    return (await client.listTools()).tools.map((tool) => tool.name).sort();
  } finally {
    await transport.close();
  }
}

async function rejectedLauncher(tokenFile: string, extraEnv: Record<string, string> = {}) {
  const child = spawn(launcher, [], {
    cwd: process.cwd(),
    env: {
      ...processEnv,
      NODE_ENV: process.env.NODE_ENV ?? "test",
      RETAIL_AGENT_TOKEN: "",
      RETAIL_AGENT_TOKEN_FILE: tokenFile,
      RETAIL_AGENT_BASE_URL: "http://127.0.0.1:9",
      ...extraEnv,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => { stdout += chunk; });
  child.stderr.on("data", (chunk: string) => { stderr += chunk; });
  const code = await new Promise<number | null>((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("launcher_rejection_timeout"));
    }, 5_000);
    child.once("error", reject);
    child.once("close", (exitCode) => {
      clearTimeout(timeout);
      resolve(exitCode);
    });
  });
  return { code, stdout, stderr };
}

describe("retail operations MCP stdio", () => {
  it("loads production credentials from macOS Keychain without embedding a token", () => {
    const wrapper = readFileSync("scripts/run-retail-ops-mcp.sh", "utf8");
    expect(statSync("scripts/run-retail-ops-mcp.sh").mode & 0o111).not.toBe(0);
    expect(wrapper.startsWith("#!/bin/sh\n")).toBe(true);
    expect(wrapper).toContain('keychain_service="tranquilbeads-retail-ops"');
    expect(wrapper).toContain('security find-generic-password -w');
    expect(wrapper).toContain("RETAIL_AGENT_TOKEN_FILE");
    expect(wrapper).toContain("CREDENTIALS_DIRECTORY");
    expect(wrapper).toContain("%a:%u:%g");
    expect(wrapper).toContain("%Lp:%u:%g");
    expect(wrapper).toContain("RETAIL_AGENT_EXPORT_ROOT");
    expect(wrapper).toContain("secret-tool lookup");
    expect(wrapper).toContain('RETAIL_AGENT_BASE_URL:-https://www.tranquilbeads.com');
    expect(wrapper).toContain("NODE_USE_ENV_PROXY=1");
    expect(wrapper).toContain("RETAIL_AGENT_PROXY_URL");
    expect(wrapper).not.toMatch(/RETAIL_AGENT_TOKEN=["'][A-Za-z0-9_-]{32,}/);
    expect(wrapper).not.toContain("echo $token");
  });

  it("accepts strict ordinary secret modes and the exact systemd LoadCredential shape", async () => {
    const root = await mkdtemp(join(tmpdir(), "retail-agent-credential-"));
    const tokenFile = join(root, "retail-agent-token");
    const fakeBin = join(root, "bin");
    const fakeStat = join(fakeBin, "stat");
    try {
      await writeFile(tokenFile, dummyToken, { mode: 0o600 });
      expect(await launcherTools(tokenFile)).toEqual(exactTools);
      await chmod(tokenFile, 0o400);
      expect(await launcherTools(tokenFile)).toEqual(exactTools);

      await mkdir(fakeBin);
      await writeFile(fakeStat, "#!/bin/sh\n[ \"${FAKE_STAT_FAIL:-0}\" = 1 ] && exit 1\nprintf '%s\\n' \"${FAKE_STAT_METADATA:-440:0:0}\"\n", { mode: 0o700 });
      await chmod(tokenFile, 0o440);
      expect(await launcherTools(tokenFile, {
        CREDENTIALS_DIRECTORY: `${root}/./`,
        PATH: `${fakeBin}:${process.env.PATH ?? ""}`,
        FAKE_STAT_METADATA: "440:0:0",
      })).toEqual(exactTools);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }, 30_000);

  it("rejects unsafe ordinary files and non-root or mismatched systemd credentials", async () => {
    const root = await mkdtemp(join(tmpdir(), "retail-agent-credential-reject-"));
    const tokenFile = join(root, "retail-agent-token");
    const otherDirectory = join(root, "other");
    const fakeBin = join(root, "bin");
    const fakeStat = join(fakeBin, "stat");
    try {
      await writeFile(tokenFile, dummyToken, { mode: 0o600 });
      await mkdir(otherDirectory);
      await mkdir(fakeBin);
      await writeFile(fakeStat, "#!/bin/sh\n[ \"${FAKE_STAT_FAIL:-0}\" = 1 ] && exit 1\nprintf '%s\\n' \"${FAKE_STAT_METADATA:-440:0:0}\"\n", { mode: 0o700 });

      for (const mode of [0o440, 0o640, 0o644]) {
        await chmod(tokenFile, mode);
        const result = await rejectedLauncher(tokenFile, { CREDENTIALS_DIRECTORY: "" });
        expect(result.code).not.toBe(0);
        expect(result.stdout).toBe("");
        expect(result.stderr).not.toContain(dummyToken);
      }

      await chmod(tokenFile, 0o440);
      for (const [credentialsDirectory, metadata] of [
        [root, "440:501:0"],
        [root, "440:0:501"],
        [otherDirectory, "440:0:0"],
        [root, "640:0:0"],
      ] as const) {
        const result = await rejectedLauncher(tokenFile, {
          CREDENTIALS_DIRECTORY: credentialsDirectory,
          PATH: `${fakeBin}:${process.env.PATH ?? ""}`,
          FAKE_STAT_METADATA: metadata,
        });
        expect(result.code).not.toBe(0);
        expect(result.stdout).toBe("");
        expect(result.stderr).not.toContain(dummyToken);
      }

      const symlinkPath = join(root, "retail-agent-token-link");
      await symlink(tokenFile, symlinkPath);
      const symlinkResult = await rejectedLauncher(symlinkPath, {
        CREDENTIALS_DIRECTORY: root,
        PATH: `${fakeBin}:${process.env.PATH ?? ""}`,
        FAKE_STAT_METADATA: "440:0:0",
      });
      expect(symlinkResult.code).not.toBe(0);
      expect(symlinkResult.stdout).toBe("");
      expect(symlinkResult.stderr).not.toContain(dummyToken);

      const unverifiableResult = await rejectedLauncher(tokenFile, {
        CREDENTIALS_DIRECTORY: root,
        PATH: `${fakeBin}:${process.env.PATH ?? ""}`,
        FAKE_STAT_FAIL: "1",
      });
      expect(unverifiableResult.code).not.toBe(0);
      expect(unverifiableResult.stdout).toBe("");
      expect(unverifiableResult.stderr).not.toContain(dummyToken);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }, 20_000);

  it("emits a JSON-RPC frame first without dotenv output on stdout", async () => {
    const launcher = join(process.cwd(), "scripts/run-retail-ops-mcp.sh");
    const childEnv: NodeJS.ProcessEnv = {
      ...processEnv,
      NODE_ENV: process.env.NODE_ENV ?? "test",
      RETAIL_AGENT_BASE_URL: "http://127.0.0.1:9",
      RETAIL_AGENT_TOKEN: "t".repeat(32),
    };
    const child = spawn(launcher, [], {
      cwd: process.cwd(),
      env: childEnv,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => { stdout += chunk; });
    child.stderr.on("data", (chunk: string) => { stderr += chunk; });

    try {
      child.stdin.write(JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "stdout-contract-test", version: "1.0.0" },
        },
      }) + "\n");

      const firstLine = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(`mcp_stdout_timeout:${stderr.slice(0, 120)}`)), 5_000);
        const poll = () => {
          const newline = stdout.indexOf("\n");
          if (newline >= 0) {
            clearTimeout(timeout);
            resolve(stdout.slice(0, newline));
            return;
          }
          setTimeout(poll, 10);
        };
        poll();
      });
      const frame = JSON.parse(firstLine) as Record<string, unknown>;
      expect(frame).toMatchObject({ jsonrpc: "2.0", id: 1 });
      expect(firstLine).not.toMatch(/dotenv|injected env|dotenvx/i);
    } finally {
      child.kill("SIGTERM");
      await new Promise<void>((resolve) => child.once("close", () => resolve()));
    }
  }, 10_000);

  it("lists the guarded operations tools and performs a write dry-run without credentials", async () => {
    const client = new Client({ name: "retail-mcp-test", version: "1.0.0" });
    const transport = new StdioClientTransport({
      command: "npm",
      args: ["run", "--silent", "mcp:retail"],
      cwd: process.cwd(),
      stderr: "pipe",
    });
    try {
      await client.connect(transport);
      const tools = await client.listTools();
      expect(tools.tools.map((tool) => tool.name).sort()).toEqual(exactTools);
      const result = await client.callTool({
        name: "retail_product_create_draft",
        arguments: {
          confirm: false,
          idempotencyKey: "11111111-1111-4111-8111-111111111111",
          sku: "MCP-SMOKE-1",
          slug: "mcp-smoke-1",
          titleEn: "MCP smoke test",
          titleAr: "اختبار MCP",
          amountMinor: 100,
          onHand: 0,
        },
      });
      expect(result.structuredContent).toMatchObject({ ok: true, dryRun: true, confirmationRequired: true });

      const publish = await client.callTool({
        name: "retail_product_publish",
        arguments: {
          confirm: false,
          idempotencyKey: "22222222-2222-4222-8222-222222222222",
          productId: "33333333-3333-4333-8333-333333333333",
        },
      });
      expect(publish.structuredContent).toMatchObject({ ok: true, dryRun: true, confirmationRequired: true });
    } finally {
      await transport.close();
    }
  }, 20_000);

  it("completes four read-only calls and writes a redacted CSV only inside the private export root", async () => {
    const exportRoot = await mkdtemp(join(tmpdir(), "retail-agent-export-"));
    const api = createServer((request, response) => {
      const url = new URL(request.url ?? "/", "http://localhost");
      expect(request.headers.authorization).toBe(`Bearer ${"t".repeat(32)}`);
      response.setHeader("content-type", "application/json");
      const observedAt = "2026-08-19T07:00:00.000Z";
      if (url.pathname === "/api/agent/retail/catalog") {
        response.end(JSON.stringify({ ok: true, snapshot: { products: [], styles: [], variants: [] }, observedAt, count: 0, counts: { products: 0, styles: 0, variants: 0 }, empty: true, sourceWindow: { type: "full_catalog_snapshot" }, watermarks: { productsUpdatedAt: null, stylesUpdatedAt: null, variantsUpdatedAt: null } }));
        return;
      }
      const resource = url.searchParams.get("resource");
      if (resource === "sales") {
        response.end(JSON.stringify({ ok: true, resource, summary: { paid_orders: 0, latest_capture_at: null }, observedAt, count: 0, empty: true, sourceWindow: { type: "relative_days", days: 30 }, watermarks: { latestCaptureAt: null } }));
        return;
      }
      if (resource === "sales_detail") {
        response.end(JSON.stringify({ ok: true, resource, rows: [], observedAt, count: 0, empty: true, offset: 0, limit: 10, hasMore: false, sourceWindow: { groupBy: "sku", sku: null, dateFrom: null, dateTo: null }, watermarks: { pageLatestSaleAt: null } }));
        return;
      }
      expect(resource).toBe("orders");
      const exportRequest = url.searchParams.get("limit") === "2";
      const orders = exportRequest ? [{
          id: 7,
          public_id: "ORDER-7",
          status: "captured",
          currency: "USD",
          amount_minor: 6900,
          checkout_email: "j***@example.com",
          shipping_snapshot: { recipient: "J***", country: "US", region: "CA", city: "Irvine" },
          order_lines: [{ variantSku: "SKU-33", quantity: 1 }],
        }] : [];
      response.end(JSON.stringify({ ok: true, resource, orders, observedAt, count: orders.length, empty: orders.length === 0, offset: 0, limit: exportRequest ? 2 : 5, hasMore: false, sourceWindow: { status: null, dateFrom: null, dateTo: null }, watermarks: { pageLatestOrderUpdatedAt: null, pageLatestCaptureAt: null } }));
    });
    await new Promise<void>((resolve) => api.listen(0, "127.0.0.1", resolve));
    const address = api.address();
    if (!address || typeof address === "string") throw new Error("mock_api_unavailable");
    const client = new Client({ name: "retail-export-test", version: "1.0.0" });
    const transport = new StdioClientTransport({
      command: "npm",
      args: ["run", "--silent", "mcp:retail"],
      cwd: process.cwd(),
      env: {
        ...processEnv,
        RETAIL_AGENT_BASE_URL: `http://127.0.0.1:${address.port}`,
        RETAIL_AGENT_TOKEN: "t".repeat(32),
        RETAIL_AGENT_EXPORT_ROOT: exportRoot,
      },
      stderr: "pipe",
    });
    try {
      await client.connect(transport);
      for (const [name, argumentsValue] of [
        ["retail_catalog_get", {}],
        ["retail_orders_list", { limit: 5 }],
        ["retail_sales_summary", { days: 30 }],
        ["retail_sales_breakdown", { groupBy: "sku", limit: 10 }],
      ] as const) {
        const read = await client.callTool({ name, arguments: argumentsValue });
        expect(read.isError).not.toBe(true);
        expect(read.structuredContent).toMatchObject({ ok: true, observedAt: "2026-08-19T07:00:00.000Z", count: 0, empty: true });
      }
      const result = await client.callTool({
        name: "retail_orders_export",
        arguments: { format: "csv", fileName: "orders-test.csv", maxRows: 2 },
      });
      expect(result.structuredContent).toMatchObject({ ok: true, rowCount: 1, format: "csv" });
      const outputPath = join(exportRoot, "orders-test.csv");
      const csv = await readFile(outputPath, "utf8");
      expect(csv).toContain("masked_email");
      expect(csv).toContain("j***@example.com");
      expect(csv).toContain("SKU-33");
      expect(csv).not.toContain("recipient");
      expect(csv).not.toContain("line1");
      expect(csv).not.toContain("phone");
      expect((await stat(outputPath)).mode & 0o077).toBe(0);
    } finally {
      await transport.close();
      await new Promise<void>((resolve, reject) => api.close((error) => error ? reject(error) : resolve()));
      await rm(exportRoot, { recursive: true, force: true });
    }
  }, 20_000);
});
