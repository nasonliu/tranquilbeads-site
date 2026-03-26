import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

type SiteProbeResult = {
  ok: boolean;
  status: number;
  finalUrl: string;
};

type TlsProbeResult = {
  ok: boolean;
  commonName: string;
  issuer: string;
};

type DnsProbeResult = {
  mx: string[];
  txt: string[];
  cname?: string;
  a: string[];
};

type OpsCheckOptions = {
  siteUrl: string;
  domain: string;
  agentSubdomain: string;
  probes?: {
    fetchSite?: (siteUrl: string) => Promise<SiteProbeResult>;
    tls?: (hostname: string) => Promise<TlsProbeResult>;
    dns?: (domain: string, agentSubdomain: string) => Promise<DnsProbeResult>;
  };
};

async function fetchSite(siteUrl: string): Promise<SiteProbeResult> {
  const { stdout } = await execFile("curl", [
    "-I",
    "-L",
    "-s",
    "-o",
    "/dev/null",
    "-w",
    "%{http_code} %{url_effective}",
    siteUrl,
  ]);
  const [statusText, ...urlParts] = stdout.trim().split(" ");
  return {
    ok: Number(statusText) >= 200 && Number(statusText) < 400,
    status: Number(statusText),
    finalUrl: urlParts.join(" "),
  };
}

async function probeTls(hostname: string): Promise<TlsProbeResult> {
  const { stdout } = await execFile("sh", [
    "-lc",
    `printf 'Q' | openssl s_client -servername ${hostname} -connect ${hostname}:443`,
  ]);
  const commonNameMatch = stdout.match(/CN\s*=\s*([^\n/]+)/);
  const issuerMatch = stdout.match(/issuer=.*CN\s*=\s*([^\n/]+)/);
  return {
    ok: /Verify return code: 0 \(ok\)/.test(stdout),
    commonName: commonNameMatch?.[1]?.trim() ?? "",
    issuer: issuerMatch?.[1]?.trim() ?? "",
  };
}

async function probeDns(domain: string, agentSubdomain: string): Promise<DnsProbeResult> {
  const dig = async (args: string[]) => {
    const { stdout } = await execFile("dig", ["+short", ...args]);
    return stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  };

  const [mx, txt, cname, a] = await Promise.all([
    dig([domain, "MX"]),
    dig([domain, "TXT"]),
    dig(["www." + domain, "CNAME"]),
    dig([agentSubdomain, "A"]),
  ]);

  return {
    mx,
    txt,
    cname: cname[0],
    a,
  };
}

export async function runOpsCheck(options: OpsCheckOptions) {
  const site = await (options.probes?.fetchSite ?? fetchSite)(options.siteUrl);
  const tls = await (options.probes?.tls ?? probeTls)(
    new URL(options.siteUrl).hostname,
  );
  const dns = await (options.probes?.dns ?? probeDns)(
    options.domain,
    options.agentSubdomain,
  );

  return {
    site: {
      reachable: site.ok,
      status: site.status,
      finalUrl: site.finalUrl,
    },
    tls,
    dns,
    summary: site.ok
      ? `Site reachable at ${site.finalUrl}; TLS ${tls.ok ? "valid" : "needs attention"}.`
      : `Site check failed with status ${site.status}.`,
  };
}
