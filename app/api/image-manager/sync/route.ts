import { NextResponse } from "next/server";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { revalidatePath } from "next/cache";

const IS_VERCEL = process.env.VERCEL === "1";
const SCRIPT = "/Volumes/新加卷/Documents/ProjectNoor/scripts/sync-products.py";
const SITE_FILE = path.join(process.cwd(), "src/data/site.ts");
const IMAGE_MANAGER_FILE = path.join(process.cwd(), "app/data/image-manager-products.json");

type ProductRecord = {
  slug?: string;
  collection?: string;
  collections?: string[];
};

function getSyncRoutes() {
  const baseRoutes = new Set([
    "/",
    "/collections",
    "/wholesale",
    "/contact",
    "/en",
    "/en/collections",
    "/en/wholesale",
    "/en/contact",
    "/ar",
    "/ar/collections",
    "/ar/wholesale",
    "/ar/contact",
  ]);

  if (!fs.existsSync(IMAGE_MANAGER_FILE)) {
    return [...baseRoutes];
  }

  try {
    const raw = JSON.parse(fs.readFileSync(IMAGE_MANAGER_FILE, "utf8")) as ProductRecord[];
    const collections = new Set<string>();

    raw.forEach((product) => {
      const tags = Array.isArray(product.collections)
        ? product.collections.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        : [];
      const collection = tags[0] || (typeof product.collection === "string" ? product.collection : "");
      const slug = typeof product.slug === "string" ? product.slug : "";

      if (!collection) {
        return;
      }

      collections.add(collection);
      baseRoutes.add(`/en/collections/${collection}`);
      baseRoutes.add(`/ar/collections/${collection}`);

      if (slug) {
        baseRoutes.add(`/en/collections/${collection}/${slug}`);
        baseRoutes.add(`/ar/collections/${collection}/${slug}`);
      }
    });

    collections.forEach((collection) => {
      baseRoutes.add(`/collections/${collection}`);
    });

    return [...baseRoutes];
  } catch {
    return [...baseRoutes];
  }
}

export async function POST() {
  if (IS_VERCEL) {
    return NextResponse.json({ error: "Sync disabled on Vercel. Run sync locally." }, { status: 403 });
  }
  try {
    const result = execSync(`python3 "${SCRIPT}"`, {
      cwd: "/Volumes/新加卷/Documents/ProjectNoor",
      encoding: "utf-8",
    });
    const parsed = JSON.parse(result.trim()) as {
      success: boolean;
      added: number;
      updated: number;
      total: number;
      message?: string;
    };

    // Touch the generated file in-process so the local Next watcher reliably sees the change.
    if (fs.existsSync(SITE_FILE)) {
      const content = fs.readFileSync(SITE_FILE, "utf8");
      fs.writeFileSync(SITE_FILE, content, "utf8");
    }

    getSyncRoutes().forEach((route) => revalidatePath(route));

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    const error = err as { stderr?: string; message?: string };
    return NextResponse.json({
      error: "Sync failed",
      detail: error?.stderr || error?.message || String(err),
    }, { status: 500 });
  }
}
