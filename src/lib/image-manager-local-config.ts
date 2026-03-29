import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

export type ImageManagerLocalConfig = {
  githubToken?: string;
};

const CONFIG_FILE = path.join(process.cwd(), ".image-manager.local.json");

function ensureConfigDir() {
  fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
}

export function readLocalConfig(): ImageManagerLocalConfig {
  if (!fs.existsSync(CONFIG_FILE)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8")) as ImageManagerLocalConfig;
  } catch {
    return {};
  }
}

export function writeLocalConfig(config: ImageManagerLocalConfig) {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export function maskToken(token?: string) {
  if (!token) return null;
  if (token.length <= 8) return `${token.slice(0, 2)}...${token.slice(-2)}`;
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

export function getOriginRepo() {
  const remote = execFileSync("git", ["remote", "get-url", "origin"], {
    cwd: process.cwd(),
    encoding: "utf8",
  }).trim();

  const httpsMatch = remote.match(/github\.com[:/](.+?)\/(.+?)(?:\.git)?$/);
  if (!httpsMatch) {
    return { remote, repo: null as string | null };
  }

  const repo = `${httpsMatch[1]}/${httpsMatch[2]}`;
  return { remote, repo };
}
