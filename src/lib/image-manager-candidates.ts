import fs from "node:fs";
import path from "node:path";

export type CandidateImageRecord = {
  id: number;
  product_group: string;
  material: string | null;
  bead_count: string | null;
  color_variant?: string | null;
  product_type: string | null;
  shot_type: string | null;
  source_folder?: string | null;
  filename_pattern?: string | null;
  original_path: string;
  thumb_path?: string | null;
};

type CandidateContext = {
  material: string;
  name: string;
  limit?: number;
};

export type RankedCandidateImage = CandidateImageRecord & {
  score: number;
  reasons: string[];
};

// The image-manager catalog only exposes the NAS upload tree.  Keep this
// allowlist independent of request input: it is deliberately not configurable
// by a query parameter or an environment variable.
export const CANDIDATE_IMAGE_ROOT = "/Volumes/office/products/Pic/upload";
const DATABASE_IMAGE_ROOT = "/vol1/1000/office/products/Pic/upload";
const PREVIEW_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

const KEYWORD_GROUPS: Array<{ key: string; aliases: string[] }> = [
  { key: "amber", aliases: ["amber", "amber-look", "baltic amber", "琥珀"] },
  { key: "wood", aliases: ["wood", "kuka", "sandalwood", "oud", "木", "木头", "沉香"] },
  { key: "agate", aliases: ["agate", "玛瑙"] },
  { key: "hematite", aliases: ["hematite", "赤铁矿"] },
  { key: "crystal", aliases: ["crystal", "rose crystal", "水晶"] },
  { key: "glass", aliases: ["glass", "琉璃", "玻璃"] },
  { key: "resin", aliases: ["resin", "树脂"] },
  { key: "obsidian", aliases: ["obsidian", "黑曜石"] },
  { key: "tiger-eye", aliases: ["tiger's eye", "tigers eye", "tiger eye", "tiger", "blue tiger", "hawk's eye", "hawks eye", "hawk eye", "hawk", "bluetiger", "虎眼石", "鹰眼石"] },
  { key: "pearl", aliases: ["pearl", "珍珠"] },
  { key: "shell", aliases: ["shell", "贝壳", "贝母"] },
  { key: "stone", aliases: ["stone", "石", "terahertz", "能量石"] },
  { key: "silver", aliases: ["silver", "s925", "925银", "银"] },
];

function escapeSqlLike(value: string): string {
  return value.replace(/'/g, "''");
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[_/\\-]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractKeywordSignals(text: string): Set<string> {
  const normalized = normalizeText(text);
  const matches = new Set<string>();

  for (const group of KEYWORD_GROUPS) {
    if (group.aliases.some((alias) => normalized.includes(normalizeText(alias)))) {
      matches.add(group.key);
    }
  }

  return matches;
}

function aliasesForText(text: string): string[] {
  const normalized = normalizeText(text);
  const aliases = new Set<string>();

  for (const group of KEYWORD_GROUPS) {
    if (group.aliases.some((alias) => normalized.includes(normalizeText(alias)))) {
      for (const alias of group.aliases) {
        aliases.add(alias);
      }
    }
  }

  return [...aliases];
}

function extractBeadCount(text: string): string | null {
  const match = text.match(/\b(33|66|99|108)\b/);
  return match?.[1] ?? null;
}

export function mapDatabasePathToMountedPath(dbPath: string): string {
  if (dbPath === DATABASE_IMAGE_ROOT || dbPath.startsWith(`${DATABASE_IMAGE_ROOT}/`)) {
    return `${CANDIDATE_IMAGE_ROOT}${dbPath.slice(DATABASE_IMAGE_ROOT.length)}`;
  }
  return dbPath;
}

function isWithinRoot(candidate: string, root: string) {
  const relative = path.relative(root, candidate);
  return relative !== "" && !relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative);
}

/**
 * Resolves an image-manager path only when it remains a regular image below
 * the one catalog root, including after symlinks are resolved.
 */
export function resolveCandidateImagePath(rawPath: string): string | null {
  if (!rawPath || rawPath.includes("\0")) return null;
  const segments = rawPath.split(/[\\/]+/).filter(Boolean);
  if (segments.some((segment) => segment === ".." || segment.startsWith("."))) return null;

  const mountedPath = mapDatabasePathToMountedPath(rawPath);
  if (!path.isAbsolute(mountedPath) || !isWithinRoot(mountedPath, CANDIDATE_IMAGE_ROOT)) return null;
  if (!PREVIEW_IMAGE_EXTENSIONS.has(path.extname(mountedPath).toLowerCase())) return null;

  try {
    // Reject the symlink itself, even when its target currently happens to be
    // inside the root. This also closes time-of-check path swapping.
    if (!fs.lstatSync(mountedPath).isFile()) return null;
    const realRoot = fs.realpathSync(CANDIDATE_IMAGE_ROOT);
    const realPath = fs.realpathSync(mountedPath);
    if (!isWithinRoot(realPath, realRoot) || !fs.statSync(realPath).isFile()) return null;
    return realPath;
  } catch {
    return null;
  }
}

export function buildCandidateQuerySql(context: CandidateContext): string {
  const aliases = aliasesForText(`${context.material} ${context.name}`);
  const conditions = ["original_path is not null", "original_path != ''"];

  if (aliases.length > 0) {
    const aliasFilters = aliases.map((alias) => {
      const escaped = escapeSqlLike(alias);
      return [
        `material like '%${escaped}%'`,
        `coalesce(product_type, '') like '%${escaped}%'`,
        `coalesce(source_folder, '') like '%${escaped}%'`,
        `coalesce(filename_pattern, '') like '%${escaped}%'`,
        `original_path like '%${escaped}%'`,
      ].join(" or ");
    });
    conditions.push(`(${aliasFilters.join(" or ")})`);
  }

  return [
    "select id, product_group, material, bead_count, color_variant, product_type, shot_type, source_folder, filename_pattern, original_path, thumb_path",
    "from products",
    `where ${conditions.join(" and ")}`,
    `limit ${Math.max(context.limit ?? 80, 500)};`,
  ].join(" ");
}

export function buildBroadCandidateQuerySql(context: CandidateContext): string {
  return [
    "select id, product_group, material, bead_count, color_variant, product_type, shot_type, source_folder, filename_pattern, original_path, thumb_path",
    "from products",
    "where original_path is not null and original_path != ''",
    `limit ${Math.max(context.limit ?? 80, 1000)};`,
  ].join(" ");
}

export function rankCandidateImages(
  candidates: CandidateImageRecord[],
  context: CandidateContext,
): RankedCandidateImage[] {
  const desiredMaterialText = `${context.material} ${context.name}`;
  const desiredSignals = extractKeywordSignals(desiredMaterialText);
  const desiredBeadCount = extractBeadCount(desiredMaterialText);

  const ranked = candidates.map((candidate) => {
    const reasons: string[] = [];
    let score = 0;
    const candidateMaterial = normalizeText(candidate.material);
    const candidateSignals = extractKeywordSignals(
      `${candidate.material ?? ""} ${candidate.product_type ?? ""} ${candidate.filename_pattern ?? ""} ${candidate.source_folder ?? ""} ${candidate.original_path ?? ""}`,
    );

    const sharedSignals = [...desiredSignals].filter((signal) => candidateSignals.has(signal));
    if (sharedSignals.length > 0) {
      score += 120 + sharedSignals.length * 15;
      reasons.push(`材质匹配: ${sharedSignals.join(", ")}`);
    }

    const normalizedDesiredMaterial = normalizeText(context.material);
    if (
      normalizedDesiredMaterial &&
      candidateMaterial &&
      (normalizedDesiredMaterial.includes(candidateMaterial) || candidateMaterial.includes(normalizedDesiredMaterial))
    ) {
      score += 60;
      reasons.push("material text match");
    }

    if (desiredBeadCount && candidate.bead_count === desiredBeadCount) {
      score += 25;
      reasons.push(`珠数匹配 ${desiredBeadCount}`);
    }

    const fileName = normalizeText(candidate.filename_pattern);
    if (fileName.includes("main")) {
      score += 12;
      reasons.push("main image");
    } else if (fileName.includes("size")) {
      score += 6;
      reasons.push("size image");
    }

    if (normalizeText(candidate.shot_type).includes("overview")) {
      score += 8;
      reasons.push("overview shot");
    }

    return {
      ...candidate,
      score,
      reasons,
    };
  });

  return ranked
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if ((a.product_group ?? "") !== (b.product_group ?? "")) {
        return (a.product_group ?? "").localeCompare(b.product_group ?? "");
      }
      return a.id - b.id;
    })
    .slice(0, context.limit ?? 60);
}
