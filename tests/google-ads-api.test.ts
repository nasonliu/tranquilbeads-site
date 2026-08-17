import { describe, expect, it } from "vitest";

import {
  buildGoogleAdsAuthUrl,
  getGoogleAdsConfigFromEnv,
  listGoogleAdsConversionActions,
  normalizeCustomerId,
} from "@/src/lib/google-ads-api";

describe("google ads api helpers", () => {
  it("normalizes formatted customer IDs", () => {
    expect(normalizeCustomerId("709-112-1019")).toBe("7091121019");
  });

  it("builds an offline OAuth URL for the Google Ads scope", () => {
    const url = new URL(
      buildGoogleAdsAuthUrl({
        clientId: "client-id",
        redirectUri: "http://localhost:8080/oauth2callback",
        state: "tranquilbeads",
      }),
    );

    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("scope")).toBe("https://www.googleapis.com/auth/adwords");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("state")).toBe("tranquilbeads");
  });

  it("reports missing required API config", () => {
    expect(() => getGoogleAdsConfigFromEnv({})).toThrow(
      "Missing Google Ads API environment values",
    );
  });

  it("lists conversion actions through mocked REST calls", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchImpl = async (url: string | URL | Request, init?: RequestInit) => {
      const asString = String(url);
      calls.push({ url: asString, init });

      if (asString.includes("oauth2.googleapis.com")) {
        return jsonResponse({ access_token: "access-token" });
      }

      return jsonResponse([
        {
          results: [
            {
              conversionAction: {
                id: "123",
                resourceName: "customers/7091121019/conversionActions/123",
                name: "Lead - Contact form submit",
                status: "ENABLED",
                type: "WEBPAGE",
                category: "SUBMIT_LEAD_FORM",
                primaryForGoal: true,
                includeInConversionsMetric: true,
              },
            },
          ],
        },
      ]);
    };

    const actions = await listGoogleAdsConversionActions(
      {
        developerToken: "developer-token",
        clientId: "client-id",
        clientSecret: "client-secret",
        refreshToken: "refresh-token",
        customerId: "709-112-1019",
      },
      undefined,
      fetchImpl as typeof fetch,
    );

    expect(calls[1]?.url).toContain("/v24/customers/7091121019/googleAds:searchStream");
    expect(actions).toEqual([
      {
        id: "123",
        resourceName: "customers/7091121019/conversionActions/123",
        name: "Lead - Contact form submit",
        status: "ENABLED",
        type: "WEBPAGE",
        category: "SUBMIT_LEAD_FORM",
        primaryForGoal: true,
        includeInConversionsMetric: true,
      },
    ]);
  });
});

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
