import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import siteContentJson from "@/src/data/site-content.json";
import type { SiteContent } from "@/src/lib/catalog-types";

export const defaultSiteContentPath = resolve(
  process.cwd(),
  "src/data/site-content.json",
);

export function getBundledSiteContent(): SiteContent {
  return structuredClone(siteContentJson) as SiteContent;
}

export async function readSiteContent(filePath = defaultSiteContentPath): Promise<SiteContent> {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as SiteContent;
}

export async function writeSiteContent(
  content: SiteContent,
  filePath = defaultSiteContentPath,
) {
  await writeFile(filePath, `${JSON.stringify(content, null, 2)}\n`, "utf8");
}
