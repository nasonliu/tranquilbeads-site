import { describe, expect, it } from "vitest";

import { runOpsCheck } from "@/src/lib/ops-checks";

describe("runOpsCheck", () => {
  it("summarizes public site, DNS, and contact state from injected probes", async () => {
    const report = await runOpsCheck({
      siteUrl: "https://www.tranquilbeads.com",
      domain: "tranquilbeads.com",
      agentSubdomain: "agent.tranquilbeads.com",
      probes: {
        fetchSite: async () => ({
          ok: true,
          status: 200,
          finalUrl: "https://www.tranquilbeads.com/en",
        }),
        tls: async () => ({
          ok: true,
          commonName: "www.tranquilbeads.com",
          issuer: "Let's Encrypt",
        }),
        dns: async () => ({
          mx: ["smtp.google.com"],
          txt: ["v=spf1 include:_spf.google.com ~all"],
          cname: "verify.vercel-dns.com",
          a: ["216.198.79.1"],
        }),
      },
    });

    expect(report.site.reachable).toBe(true);
    expect(report.tls.ok).toBe(true);
    expect(report.dns.mx).toContain("smtp.google.com");
    expect(report.summary).toMatch(/reachable/i);
  });
});
