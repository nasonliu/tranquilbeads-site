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
import {
  buildGoogleAdsAuthUrl,
  buildGoogleAdsConversionActionPlan,
  getGoogleAdsConfigFromEnv,
  listAccessibleGoogleAdsCustomers,
  listGoogleAdsConversionActions,
} from "../src/lib/google-ads-api";

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

  server.registerTool(
    "google_ads_auth_url",
    {
      description: "Build the Google OAuth consent URL for Google Ads API access.",
      inputSchema: {
        clientId: z.string().optional(),
        redirectUri: z.string().url().optional(),
        state: z.string().optional(),
      },
    },
    async (args) => {
      const clientId = args.clientId ?? process.env.GOOGLE_ADS_CLIENT_ID;
      const redirectUri = args.redirectUri ?? process.env.GOOGLE_ADS_REDIRECT_URI;

      if (!clientId || !redirectUri) {
        return {
          content: [
            {
              type: "text",
              text: "Missing GOOGLE_ADS_CLIENT_ID or GOOGLE_ADS_REDIRECT_URI.",
            },
          ],
          structuredContent: { ok: false },
          isError: true,
        };
      }

      const url = buildGoogleAdsAuthUrl({
        clientId,
        redirectUri,
        state: args.state,
      });

      return {
        content: [{ type: "text", text: url }],
        structuredContent: { ok: true, url },
      };
    },
  );

  server.registerTool(
    "google_ads_list_customers",
    {
      description: "List Google Ads customers available to the configured OAuth user.",
      inputSchema: {},
    },
    async () => {
      const config = getGoogleAdsConfigFromEnv();
      const result = await listAccessibleGoogleAdsCustomers(config);

      return {
        content: [
          {
            type: "text",
            text: `Loaded ${result.resourceNames?.length ?? 0} accessible Google Ads customers.`,
          },
        ],
        structuredContent: result,
      };
    },
  );

  server.registerTool(
    "google_ads_list_conversion_actions",
    {
      description: "List Google Ads conversion actions for the configured or provided customer ID.",
      inputSchema: {
        customerId: z.string().optional(),
      },
    },
    async (args) => {
      const config = getGoogleAdsConfigFromEnv();
      const actions = await listGoogleAdsConversionActions(config, args.customerId);

      return {
        content: [
          {
            type: "text",
            text: `Loaded ${actions.length} conversion actions.`,
          },
        ],
        structuredContent: { actions },
      };
    },
  );

  server.registerTool(
    "google_ads_prepare_conversion_action",
    {
      description: "Prepare a dry-run Google Ads conversion action mutate payload. This tool never writes to Google Ads.",
      inputSchema: {
        customerId: z.string().optional(),
        name: z.string(),
        category: z.string().default("SUBMIT_LEAD_FORM"),
        type: z.string().default("WEBPAGE"),
        primaryForGoal: z.boolean().optional(),
        includeInConversionsMetric: z.boolean().optional(),
      },
    },
    async (args) => {
      const customerId =
        args.customerId ??
        process.env.GOOGLE_ADS_CUSTOMER_ID ??
        "7091121019";
      const plan = buildGoogleAdsConversionActionPlan({
        customerId,
        name: args.name,
        category: args.category,
        type: args.type,
        primaryForGoal: args.primaryForGoal,
        includeInConversionsMetric: args.includeInConversionsMetric,
      });

      return {
        content: [
          {
            type: "text",
            text: `Prepared dry-run conversion action: ${args.name} for customer ${plan.customerId} via ${plan.endpoint}.`,
          },
        ],
        structuredContent: plan,
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
