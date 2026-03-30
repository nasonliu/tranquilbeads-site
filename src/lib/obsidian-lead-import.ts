import type { OutreachLead } from "@/src/lib/outreach-types";

export function parseObsidianLeadFile(markdown: string, sourcePath: string): OutreachLead[] {
  const lines = markdown.split(/\r?\n/);
  const country = extractCountry(lines) ?? inferCountryFromPath(sourcePath);
  const prioritizedRows = extractPrioritizedRows(lines);

  return prioritizedRows.map((row, index) => {
    const company = row[1];
    const website = parseMarkdownLink(row[4]);
    const whatsapp = row[5];
    const score = Number.parseInt(row[3] ?? "0", 10) || 0;
    const notes = row[6] ?? "";
    const now = new Date().toISOString();

    return {
      id: createLeadId(sourcePath, company, index),
      sourceType: "obsidian",
      sourcePath,
      company,
      contactName: "",
      country,
      website,
      whatsapp,
      email: "",
      score,
      notes,
      createdAt: now,
      updatedAt: now,
    } satisfies OutreachLead;
  });
}

function extractCountry(lines: string[]) {
  const titleLine = lines.find((line) => line.startsWith("# "));
  if (!titleLine) return "";

  const title = titleLine.replace(/^#\s+/, "").trim();
  return title.replace(/\s+Tasbih Leads$/, "").trim();
}

function inferCountryFromPath(sourcePath: string) {
  const fileName = sourcePath.split(/[/\\]/).pop() ?? "";
  return fileName
    .replace(/_Tasbih_Leads_.+$/i, "")
    .replace(/\.md$/i, "")
    .replace(/_/g, " ")
    .trim();
}

function extractPrioritizedRows(lines: string[]) {
  const rows: string[][] = [];
  let inPrioritizedSection = false;

  for (const line of lines) {
    if (line.startsWith("## 优先跟进")) {
      inPrioritizedSection = true;
      continue;
    }

    if (inPrioritizedSection && line.startsWith("## ")) {
      break;
    }

    if (!inPrioritizedSection) {
      continue;
    }

    if (!line.startsWith("|")) {
      continue;
    }

    const cells = line
      .split("|")
      .map((cell) => cell.trim())
      .filter(Boolean);

    if (cells.length === 0 || cells[0] === "#" || cells[0] === "---") {
      continue;
    }

    if (!/^\d+$/.test(cells[0])) {
      continue;
    }

    rows.push(cells);
  }

  return rows;
}

function parseMarkdownLink(value: string | undefined) {
  if (!value) return "";
  const match = value.match(/\(([^)]+)\)/);
  return match ? match[1] : value.trim();
}

function createLeadId(sourcePath: string, company: string, index: number) {
  const slug = company
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const sourceSlug = sourcePath
    .split(/[/\\]/)
    .pop()
    ?.replace(/\.md$/i, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() ?? "obsidian";

  return `${sourceSlug}-${index + 1}-${slug}`;
}
