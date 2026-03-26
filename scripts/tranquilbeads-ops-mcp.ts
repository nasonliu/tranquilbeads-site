import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import dotenv from "dotenv";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod";

import { prepareLeadFollowUp } from "../src/lib/lead-tools";
import { runOpsCheck } from "../src/lib/ops-checks";
import { importProducts } from "../src/lib/product-import";
import { getSiteSnapshot, updateContactSettings } from "../src/lib/site-admin";
import type { ProductImportPayload } from "../src/lib/catalog-types";
import { defaultSiteContentPath } from "../src/lib/site-content";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });
dotenv.config();

const defaultImportPath = resolve(process.cwd(), "src/data/imports/products.sample.json");

async function main() {
  const server = new McpServer({
    name: "tranquilbeads-ops",
    version: "0.1.0",
  });

  server.registerTool(
    "get_site_snapshot",
    {
      description: "Read the current TranquilBeads site content snapshot.",
      inputSchema: {
        filePath: z.string().optional(),
      },
    },
    async (args) => {
      const snapshot = await getSiteSnapshot(args.filePath ?? defaultSiteContentPath);
      return {
        content: [
          {
            type: "text",
            text: `Loaded snapshot for ${snapshot.brandName} with ${snapshot.counts.products} products.`,
          },
        ],
        structuredContent: snapshot,
      };
    },
  );

  server.registerTool(
    "update_contact_settings",
    {
      description: "Dry-run or apply public site contact changes.",
      inputSchema: {
        filePath: z.string().optional(),
        confirm: z.boolean().optional(),
        email: z.string().email(),
        whatsappHref: z.string().url(),
        whatsappDisplay: z.string(),
      },
    },
    async (args) => {
      const result = await updateContactSettings({
        filePath: args.filePath ?? defaultSiteContentPath,
        confirm: args.confirm ?? false,
        email: args.email,
        whatsappHref: args.whatsappHref,
        whatsappDisplay: args.whatsappDisplay,
      });
      return {
        content: [
          {
            type: "text",
            text: result.dryRun
              ? "Prepared contact update dry run."
              : "Applied contact update.",
          },
        ],
        structuredContent: result,
      };
    },
  );

  server.registerTool(
    "import_products",
    {
      description: "Dry-run or apply product imports into the TranquilBeads site catalog.",
      inputSchema: {
        filePath: z.string().optional(),
        targetFilePath: z.string().optional(),
        confirm: z.boolean().optional(),
        importFile: z.string().optional(),
        payload: z.any().optional(),
      },
    },
    async (args) => {
      const payload =
        (args.payload as ProductImportPayload | undefined) ??
        (JSON.parse(
          readFileSync(args.importFile ?? defaultImportPath, "utf8"),
        ) as ProductImportPayload);

      const targetFilePath =
        args.targetFilePath ?? args.filePath ?? defaultSiteContentPath;

      const result = await importProducts({
        filePath: targetFilePath,
        confirm: args.confirm ?? false,
        payload,
      });

      return {
        content: [
          {
            type: "text",
            text: result.dryRun
              ? `Dry run imported ${result.products.length} products into ${targetFilePath}.`
              : `Applied import for ${result.products.length} products into ${targetFilePath}.`,
          },
        ],
        structuredContent: {
          ...result,
          targetFilePath,
        },
      };
    },
  );

  server.registerTool(
    "run_ops_check",
    {
      description: "Check public site reachability, TLS, and DNS state.",
      inputSchema: {
        siteUrl: z.string().url().optional(),
        domain: z.string().optional(),
        agentSubdomain: z.string().optional(),
      },
    },
    async (args) => {
      const result = await runOpsCheck({
        siteUrl: args.siteUrl ?? "https://www.tranquilbeads.com",
        domain: args.domain ?? "tranquilbeads.com",
        agentSubdomain: args.agentSubdomain ?? "agent.tranquilbeads.com",
      });
      return {
        content: [{ type: "text", text: result.summary }],
        structuredContent: result,
      };
    },
  );

  server.registerTool(
    "prepare_lead_follow_up",
    {
      description: "Normalize a website inquiry and prepare human and agent reply drafts.",
      inputSchema: {
        lead: z.object({
          name: z.string().optional(),
          company: z.string(),
          country: z.string().optional(),
          contact: z.string().optional(),
          interest: z.string().optional(),
          quantity: z.string().optional(),
          message: z.string().optional(),
        }),
      },
    },
    async (args) => {
      const result = prepareLeadFollowUp(args.lead);
      return {
        content: [{ type: "text", text: "Prepared lead follow-up drafts." }],
        structuredContent: result,
      };
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
