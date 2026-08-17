import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

const execFile = promisify(execFileCallback);

describe("google ads mcp tools", () => {
  it("builds an OAuth URL through the stdio MCP server", async () => {
    const call = await execFile("mcporter", [
      "call",
      "--stdio",
      "npm run --silent mcp:stdio",
      "google_ads_auth_url",
      "--args",
      JSON.stringify({
        clientId: "client-id.apps.googleusercontent.com",
        redirectUri: "http://localhost:8080/oauth2callback",
        state: "tranquilbeads",
      }),
    ], { cwd: process.cwd() });

    expect(call.stdout).toContain("https://accounts.google.com/o/oauth2/v2/auth");
    expect(call.stdout).toContain("https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fadwords");
  });

  it("prepares a dry-run conversion action through the stdio MCP server", async () => {
    const call = await execFile("mcporter", [
      "call",
      "--stdio",
      "npm run --silent mcp:stdio",
      "google_ads_prepare_conversion_action",
      "--args",
      JSON.stringify({
        customerId: "709-112-1019",
        name: "Lead - Contact form submit",
        category: "SUBMIT_LEAD_FORM",
      }),
    ], { cwd: process.cwd() });

    expect(call.stdout).toContain("Prepared dry-run conversion action");
    expect(call.stdout).toContain("7091121019");
    expect(call.stdout).toContain("Lead - Contact form submit");
    expect(call.stdout).toContain("conversionActions:mutate");
  });
});
