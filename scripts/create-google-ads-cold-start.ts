import { resolve } from "node:path";

import dotenv from "dotenv";

import {
  getGoogleAdsConfigFromEnv,
  googleAdsSearchStream,
  normalizeCustomerId,
  refreshGoogleAdsAccessToken,
  type GoogleAdsConfig,
} from "../src/lib/google-ads-api";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });
dotenv.config();

const GOOGLE_ADS_API_VERSION = "v24";
const GOOGLE_ADS_API_BASE_URL = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;

type MutateOperation = Record<string, unknown>;

type KeywordSpec = {
  text: string;
  matchTypes: Array<"EXACT" | "PHRASE">;
};

type AdGroupSpec = {
  name: string;
  cpcMicros: string;
  finalUrl: string;
  headlines: string[];
  descriptions: string[];
  keywords: KeywordSpec[];
};

type CampaignSpec = {
  name: string;
  budgetMicros: string;
  geoTargetConstants: string[];
  languageConstants: string[];
  adGroups: AdGroupSpec[];
  negatives?: KeywordSpec[];
};

const runId = new Date()
  .toISOString()
  .slice(0, 16)
  .replaceAll("-", "")
  .replace("T", "-")
  .replace(":", "");

const campaignSpecs: CampaignSpec[] = [
  {
    name: `TB Search AE Cold Start ${runId}`,
    budgetMicros: "5000000",
    geoTargetConstants: ["geoTargetConstants/2784"],
    languageConstants: ["languageConstants/1000", "languageConstants/1019"],
    negatives: [
      { text: "tasbih ring", matchTypes: ["EXACT"] },
      { text: "tasbih counter", matchTypes: ["EXACT"] },
      { text: "prayer beads 33", matchTypes: ["EXACT"] },
      { text: "auto keyword", matchTypes: ["EXACT"] },
      { text: "testrun", matchTypes: ["EXACT"] },
      { text: "top_of_search", matchTypes: ["EXACT"] },
    ],
    adGroups: [
      {
        name: "AE Head Term Controlled",
        cpcMicros: "350000",
        finalUrl: "https://www.tranquilbeads.com/en/amazon?utm_source=google&utm_medium=cpc&utm_campaign=ae_search_cold_start&utm_content=head_term",
        headlines: [
          "Natural Tasbih Beads",
          "TranquilBeads Tasbih",
          "Shop Tasbih Online",
          "Amazon AE Options",
          "Prayer Beads For Gifts",
        ],
        descriptions: [
          "Discover selected tasbih and prayer beads for daily use and meaningful gifts.",
          "Compare styles and regional marketplace options from TranquilBeads.",
        ],
        keywords: [
          { text: "tasbih", matchTypes: ["EXACT", "PHRASE"] },
          { text: "tasbih beads", matchTypes: ["EXACT", "PHRASE"] },
        ],
      },
      {
        name: "AE Car Ayatul Kursi",
        cpcMicros: "550000",
        finalUrl: "https://www.tranquilbeads.com/en/amazon?utm_source=google&utm_medium=cpc&utm_campaign=ae_search_cold_start&utm_content=car_ayatul_kursi",
        headlines: [
          "Car Hanging Tasbih",
          "Ayatul Kursi For Car",
          "Tasbih For Your Car",
          "TranquilBeads Gifts",
          "Shop On Amazon AE",
        ],
        descriptions: [
          "Find selected car hanging tasbih and prayer bead styles from TranquilBeads.",
          "Shop regional marketplace options with Amazon AE links on our site.",
        ],
        keywords: [
          { text: "ayatul kursi for car", matchTypes: ["EXACT", "PHRASE"] },
          { text: "car hanging tasbih", matchTypes: ["EXACT", "PHRASE"] },
          { text: "ayat al-kursi", matchTypes: ["EXACT", "PHRASE"] },
        ],
      },
      {
        name: "AE Material Longtail",
        cpcMicros: "500000",
        finalUrl: "https://www.tranquilbeads.com/en/amazon?utm_source=google&utm_medium=cpc&utm_campaign=ae_search_cold_start&utm_content=material_longtail",
        headlines: [
          "Baltic Amber Tasbih",
          "Hematite Prayer Beads",
          "Wood Tasbih Beads",
          "Muslim Prayer Beads",
          "TranquilBeads Online",
        ],
        descriptions: [
          "Browse selected prayer beads by material, style, and regional marketplace availability.",
          "Compare TranquilBeads styles before buying through Amazon or Noon.",
        ],
        keywords: [
          { text: "baltic amber tasbih", matchTypes: ["EXACT", "PHRASE"] },
          { text: "natural hematite prayer beads", matchTypes: ["EXACT"] },
          { text: "wood tasbih", matchTypes: ["EXACT"] },
          { text: "muslim prayer beads", matchTypes: ["EXACT", "PHRASE"] },
        ],
      },
    ],
  },
  {
    name: `TB Search SA Cold Start ${runId}`,
    budgetMicros: "2000000",
    geoTargetConstants: ["geoTargetConstants/2682"],
    languageConstants: ["languageConstants/1000", "languageConstants/1019"],
    negatives: [
      { text: "tasbih ring", matchTypes: ["EXACT"] },
      { text: "tasbih counter", matchTypes: ["EXACT"] },
      { text: "auto keyword", matchTypes: ["EXACT"] },
      { text: "testrun", matchTypes: ["EXACT"] },
      { text: "top_of_search", matchTypes: ["EXACT"] },
    ],
    adGroups: [
      {
        name: "SA Arabic Tasbih",
        cpcMicros: "250000",
        finalUrl: "https://www.tranquilbeads.com/ar/noon?utm_source=google&utm_medium=cpc&utm_campaign=sa_search_cold_start&utm_content=arabic_tasbih",
        headlines: [
          "سبحة من TranquilBeads",
          "تسوق على نون",
          "سبحة هدية مميزة",
          "خيارات للسعودية",
          "تصاميم سبحة مختارة",
        ],
        descriptions: [
          "تسوق سبحات مختارة من TranquilBeads عبر نون الإمارات والسعودية.",
          "قارن التصاميم والمواد قبل الشراء من روابط المتاجر الإقليمية.",
        ],
        keywords: [
          { text: "سبحة", matchTypes: ["EXACT", "PHRASE"] },
          { text: "سبحة حجر طبيعي", matchTypes: ["PHRASE"] },
          { text: "سبحة هدية", matchTypes: ["PHRASE"] },
        ],
      },
      {
        name: "SA English Longtail",
        cpcMicros: "300000",
        finalUrl: "https://www.tranquilbeads.com/en/noon?utm_source=google&utm_medium=cpc&utm_campaign=sa_search_cold_start&utm_content=english_longtail",
        headlines: [
          "Stone Tasbih Beads",
          "Tasbih For Gifts",
          "Shop On Noon Saudi",
          "TranquilBeads Tasbih",
          "Prayer Beads Online",
        ],
        descriptions: [
          "Explore selected tasbih and prayer bead styles with Noon Saudi shopping options.",
          "Use TranquilBeads to compare styles, materials, and regional availability.",
        ],
        keywords: [
          { text: "stone tasbih", matchTypes: ["EXACT", "PHRASE"] },
          { text: "tasbih", matchTypes: ["EXACT"] },
          { text: "tasbih beads", matchTypes: ["PHRASE"] },
        ],
      },
    ],
  },
  {
    name: `TB Search DE Cold Start ${runId}`,
    budgetMicros: "2000000",
    geoTargetConstants: ["geoTargetConstants/2276"],
    languageConstants: ["languageConstants/1001", "languageConstants/1000"],
    negatives: [
      { text: "tasbih ring", matchTypes: ["EXACT"] },
      { text: "tasbih counter", matchTypes: ["EXACT"] },
      { text: "auto keyword", matchTypes: ["EXACT"] },
      { text: "testrun", matchTypes: ["EXACT"] },
      { text: "top_of_search", matchTypes: ["EXACT"] },
    ],
    adGroups: [
      {
        name: "DE Islam Gebetskette",
        cpcMicros: "250000",
        finalUrl: "https://www.tranquilbeads.com/en/amazon?utm_source=google&utm_medium=cpc&utm_campaign=de_search_cold_start&utm_content=islam_gebetskette",
        headlines: [
          "Islamische Gebetskette",
          "Tasbih Von TranquilBeads",
          "Auf Amazon DE Kaufen",
          "Gebetskette Als Geschenk",
          "Natuerliche Perlen",
        ],
        descriptions: [
          "Shop selected tasbih and prayer beads with Amazon DE options from TranquilBeads.",
          "Compare styles for personal use, gifting, and wholesale inquiries.",
        ],
        keywords: [
          { text: "gebetskette islam", matchTypes: ["EXACT", "PHRASE"] },
          { text: "islamische gebetsperlen", matchTypes: ["EXACT", "PHRASE"] },
          { text: "gebetskette", matchTypes: ["EXACT"] },
        ],
      },
      {
        name: "DE Tespih Tesbih",
        cpcMicros: "180000",
        finalUrl: "https://www.tranquilbeads.com/en/amazon?utm_source=google&utm_medium=cpc&utm_campaign=de_search_cold_start&utm_content=tespih_tesbih",
        headlines: [
          "Tespih Und Tesbih",
          "Gebetskette Online",
          "Amazon DE Optionen",
          "TranquilBeads Perlen",
          "Ausgewaehlte Tasbih",
        ],
        descriptions: [
          "Browse selected tasbih, tespih, and prayer bead styles from TranquilBeads.",
          "See Amazon DE buying options and compare product styles on our site.",
        ],
        keywords: [
          { text: "tespih", matchTypes: ["EXACT", "PHRASE"] },
          { text: "tesbih", matchTypes: ["EXACT", "PHRASE"] },
          { text: "gebetsperlen", matchTypes: ["EXACT"] },
          { text: "personalisierte gebetskette", matchTypes: ["EXACT", "PHRASE"] },
        ],
      },
    ],
  },
];

async function main() {
  const config = getGoogleAdsConfigFromEnv();
  const customerId = normalizeCustomerId(config.customerId ?? "");

  if (!customerId) {
    throw new Error("Missing GOOGLE_ADS_CUSTOMER_ID.");
  }

  const mode = process.argv.includes("--create") ? "create" : "validate";

  await assertNoExistingColdStartCampaigns(config, customerId);

  const operations = buildMutateOperations(customerId, campaignSpecs);
  await mutateGoogleAds(config, customerId, operations, mode === "validate");

  if (mode === "validate") {
    console.log(JSON.stringify({
      ok: true,
      validateOnly: true,
      campaigns: summarizePlan(campaignSpecs),
      next: "Run `npm run google-ads:cold-start -- --create` to create paused campaigns.",
    }, null, 2));
    return;
  }

  const campaigns = await listCreatedCampaigns(config, customerId);
  console.log(JSON.stringify({ ok: true, validateOnly: false, campaigns }, null, 2));
}

function buildMutateOperations(customerId: string, specs: CampaignSpec[]) {
  const operations: MutateOperation[] = [];
  let budgetTempId = -1;
  let campaignTempId = -100;
  let adGroupTempId = -1000;

  for (const campaign of specs) {
    const budgetResourceName = `customers/${customerId}/campaignBudgets/${budgetTempId--}`;
    const campaignResourceName = `customers/${customerId}/campaigns/${campaignTempId--}`;

    operations.push({
      campaignBudgetOperation: {
        create: {
          resourceName: budgetResourceName,
          name: `${campaign.name} Budget`,
          amountMicros: campaign.budgetMicros,
          deliveryMethod: "STANDARD",
          explicitlyShared: false,
        },
      },
    });

    operations.push({
      campaignOperation: {
        create: {
          resourceName: campaignResourceName,
          name: campaign.name,
          status: "PAUSED",
          advertisingChannelType: "SEARCH",
          containsEuPoliticalAdvertising: "DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING",
          campaignBudget: budgetResourceName,
          manualCpc: {},
          networkSettings: {
            targetGoogleSearch: true,
            targetSearchNetwork: false,
            targetContentNetwork: false,
            targetPartnerSearchNetwork: false,
          },
          geoTargetTypeSetting: {
            positiveGeoTargetType: "PRESENCE",
            negativeGeoTargetType: "PRESENCE",
          },
        },
      },
    });

    for (const geoTargetConstant of campaign.geoTargetConstants) {
      operations.push({
        campaignCriterionOperation: {
          create: {
            campaign: campaignResourceName,
            location: { geoTargetConstant },
          },
        },
      });
    }

    for (const languageConstant of campaign.languageConstants) {
      operations.push({
        campaignCriterionOperation: {
          create: {
            campaign: campaignResourceName,
            language: { languageConstant },
          },
        },
      });
    }

    for (const negative of campaign.negatives ?? []) {
      for (const matchType of negative.matchTypes) {
        operations.push({
          campaignCriterionOperation: {
            create: {
              campaign: campaignResourceName,
              negative: true,
              keyword: {
                text: negative.text,
                matchType,
              },
            },
          },
        });
      }
    }

    for (const adGroup of campaign.adGroups) {
      const adGroupResourceName = `customers/${customerId}/adGroups/${adGroupTempId--}`;

      operations.push({
        adGroupOperation: {
          create: {
            resourceName: adGroupResourceName,
            name: adGroup.name,
            campaign: campaignResourceName,
            status: "ENABLED",
            type: "SEARCH_STANDARD",
            cpcBidMicros: adGroup.cpcMicros,
          },
        },
      });

      for (const keyword of adGroup.keywords) {
        for (const matchType of keyword.matchTypes) {
          operations.push({
            adGroupCriterionOperation: {
              create: {
                adGroup: adGroupResourceName,
                status: "ENABLED",
                keyword: {
                  text: keyword.text,
                  matchType,
                },
              },
            },
          });
        }
      }

      operations.push({
        adGroupAdOperation: {
          create: {
            adGroup: adGroupResourceName,
            status: "ENABLED",
            ad: {
              finalUrls: [adGroup.finalUrl],
              responsiveSearchAd: {
                headlines: adGroup.headlines.map((text) => ({ text })),
                descriptions: adGroup.descriptions.map((text) => ({ text })),
              },
            },
          },
        },
      });
    }
  }

  return operations;
}

async function mutateGoogleAds(
  config: GoogleAdsConfig,
  customerId: string,
  mutateOperations: MutateOperation[],
  validateOnly: boolean,
) {
  const accessToken = await getAccessToken(config);
  const response = await fetch(
    `${GOOGLE_ADS_API_BASE_URL}/customers/${customerId}/googleAds:mutate`,
    {
      method: "POST",
      headers: buildHeaders(config, accessToken),
      body: JSON.stringify({
        mutateOperations,
        validateOnly,
        partialFailure: false,
      }),
    },
  );

  const body = await readJson(response);

  if (!response.ok) {
    throw new Error(JSON.stringify(body, null, 2));
  }

  return body;
}

async function assertNoExistingColdStartCampaigns(
  config: GoogleAdsConfig,
  customerId: string,
) {
  const rows = await googleAdsSearchStream<{ campaign?: { id?: string; name?: string; status?: string } }>(
    config,
    customerId,
    [
      "SELECT campaign.id, campaign.name, campaign.status",
      "FROM campaign",
      "WHERE campaign.name LIKE 'TB Search % Cold Start%'",
      "AND campaign.status != 'REMOVED'",
      "LIMIT 20",
    ].join(" "),
  );

  if (rows.length > 0 && !process.argv.includes("--force")) {
    throw new Error(
      `Cold start campaigns already exist. Pass --force to create another set: ${JSON.stringify(rows, null, 2)}`,
    );
  }
}

async function listCreatedCampaigns(config: GoogleAdsConfig, customerId: string) {
  const rows = await googleAdsSearchStream<{
    campaign?: { id?: string; name?: string; status?: string };
    campaignBudget?: { amountMicros?: string };
  }>(
    config,
    customerId,
    [
      "SELECT campaign.id, campaign.name, campaign.status, campaign_budget.amount_micros",
      "FROM campaign",
      `WHERE campaign.name LIKE 'TB Search % ${runId}'`,
      "ORDER BY campaign.name",
    ].join(" "),
  );

  return rows.map((row) => ({
    id: row.campaign?.id,
    name: row.campaign?.name,
    status: row.campaign?.status,
    dailyBudgetUsd: row.campaignBudget?.amountMicros
      ? Number(row.campaignBudget.amountMicros) / 1_000_000
      : undefined,
  }));
}

function summarizePlan(specs: CampaignSpec[]) {
  return specs.map((campaign) => ({
    name: campaign.name,
    status: "PAUSED",
    dailyBudgetUsd: Number(campaign.budgetMicros) / 1_000_000,
    adGroups: campaign.adGroups.map((adGroup) => ({
      name: adGroup.name,
      maxCpcUsd: Number(adGroup.cpcMicros) / 1_000_000,
      keywords: adGroup.keywords.flatMap((keyword) =>
        keyword.matchTypes.map((matchType) => `${matchType.toLowerCase()}:${keyword.text}`),
      ),
    })),
  }));
}

async function getAccessToken(config: GoogleAdsConfig) {
  const token = await refreshGoogleAdsAccessToken(config);

  if (!token.access_token) {
    throw new Error("Google OAuth response did not include an access token.");
  }

  return token.access_token;
}

function buildHeaders(config: GoogleAdsConfig, accessToken: string) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": config.developerToken,
    "Content-Type": "application/json",
  };

  if (config.loginCustomerId) {
    headers["login-customer-id"] = normalizeCustomerId(config.loginCustomerId);
  }

  return headers;
}

async function readJson(response: Response) {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
