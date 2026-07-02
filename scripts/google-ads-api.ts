import { resolve } from "node:path";

import dotenv from "dotenv";

import {
  buildGoogleAdsAuthUrl,
  exchangeGoogleAdsAuthCode,
  getGoogleAdsConfigFromEnv,
  listAccessibleGoogleAdsCustomers,
  listGoogleAdsConversionActions,
} from "../src/lib/google-ads-api";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });
dotenv.config();

const command = process.argv[2];

async function main() {
  switch (command) {
    case "auth-url":
      printAuthUrl();
      return;
    case "exchange-code":
      await exchangeCode();
      return;
    case "list-customers":
      await listCustomers();
      return;
    case "list-conversions":
      await listConversions();
      return;
    default:
      printUsage();
  }
}

function printAuthUrl() {
  const clientId = readEnv("GOOGLE_ADS_CLIENT_ID");
  const redirectUri = readEnv("GOOGLE_ADS_REDIRECT_URI");
  const state = process.env.GOOGLE_ADS_OAUTH_STATE;

  console.log(buildGoogleAdsAuthUrl({ clientId, redirectUri, state }));
}

async function exchangeCode() {
  const clientId = readEnv("GOOGLE_ADS_CLIENT_ID");
  const clientSecret = readEnv("GOOGLE_ADS_CLIENT_SECRET");
  const redirectUri = readEnv("GOOGLE_ADS_REDIRECT_URI");
  const code = process.argv[3] ?? process.env.GOOGLE_ADS_AUTH_CODE;

  if (!code) {
    throw new Error("Pass the OAuth code as an argument or GOOGLE_ADS_AUTH_CODE.");
  }

  const token = await exchangeGoogleAdsAuthCode({
    clientId,
    clientSecret,
    redirectUri,
    code,
  });

  console.log(JSON.stringify(token, null, 2));
}

async function listCustomers() {
  const config = getGoogleAdsConfigFromEnv();
  const result = await listAccessibleGoogleAdsCustomers(config);
  console.log(JSON.stringify(result, null, 2));
}

async function listConversions() {
  const config = getGoogleAdsConfigFromEnv();
  const customerId = process.argv[3] ?? config.customerId;
  const actions = await listGoogleAdsConversionActions(config, customerId);
  console.log(JSON.stringify(actions, null, 2));
}

function readEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}.`);
  }
  return value;
}

function printUsage() {
  console.log(`Usage:
  npm run google-ads:api -- auth-url
  npm run google-ads:api -- exchange-code <oauth-code>
  npm run google-ads:api -- list-customers
  npm run google-ads:api -- list-conversions [customer-id]

Required env:
  GOOGLE_ADS_DEVELOPER_TOKEN
  GOOGLE_ADS_CLIENT_ID
  GOOGLE_ADS_CLIENT_SECRET
  GOOGLE_ADS_REFRESH_TOKEN
  GOOGLE_ADS_CUSTOMER_ID

OAuth helper env:
  GOOGLE_ADS_REDIRECT_URI
`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
