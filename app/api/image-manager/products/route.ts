import { NextRequest, NextResponse } from "next/server";

const IS_VERCEL = process.env.VERCEL === "1";

interface Product {
  slug: string;
  name: string;
  nameAr: string;
  material: string;
  collections: string[];
  images: string[];
  [key: string]: unknown;
}

function normalizeProduct(product: Record<string, unknown>): Product {
  const legacyCollection =
    typeof product.collection === "string" && product.collection.trim()
      ? [product.collection]
      : [];
  const collections = Array.isArray(product.collections)
    ? product.collections.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : legacyCollection;

  return {
    slug: typeof product.slug === "string" ? product.slug : "",
    name: typeof product.name === "string" ? product.name : "",
    nameAr: typeof product.nameAr === "string" ? product.nameAr : "",
    material: typeof product.material === "string" ? product.material : "",
    collections,
    images: Array.isArray(product.images)
      ? product.images.filter((item): item is string => typeof item === "string")
      : [],
    ...product,
    collections,
  };
}

export async function GET() {
  if (IS_VERCEL) {
    return NextResponse.json({ error: "Not available on Vercel" }, { status: 403 });
  }
  try {
    const fs = await import("fs");
    const path = await import("path");
    const DATA_FILE = path.join(process.cwd(), "app/data/image-manager-products.json");
    const products: Product[] = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"))
      .map((product: Record<string, unknown>) => normalizeProduct(product));
    return NextResponse.json(products);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  if (IS_VERCEL) {
    return NextResponse.json({ error: "Not available on Vercel" }, { status: 403 });
  }
  try {
    const fs = await import("fs");
    const path = await import("path");
    const DATA_FILE = path.join(process.cwd(), "app/data/image-manager-products.json");

    const readProducts = (): Product[] =>
      JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"))
        .map((product: Record<string, unknown>) => normalizeProduct(product));

    const writeProducts = (data: Product[]) => {
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    };

    const body = await req.json() as { action: string; slug?: string; product?: Product };
    const products = readProducts();

    if (body.action === "add") {
      const newProduct = normalizeProduct(body.product as unknown as Record<string, unknown>);
      if (products.find((p: Product) => p.slug === newProduct.slug)) {
        return NextResponse.json({ error: "Slug already exists" }, { status: 400 });
      }
      products.push(newProduct);
      writeProducts(products);
      return NextResponse.json({ success: true, products });
    }

    if (body.action === "update") {
      const slug = body.slug as string;
      const idx = products.findIndex((p: Product) => p.slug === slug);
      if (idx === -1) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }
      products[idx] = normalizeProduct({
        ...products[idx],
        ...(body.product as unknown as Record<string, unknown>),
      });
      writeProducts(products);
      return NextResponse.json({ success: true, products });
    }

    if (body.action === "delete") {
      const slug = body.slug as string;
      const idx = products.findIndex((p: Product) => p.slug === slug);
      if (idx === -1) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }
      products.splice(idx, 1);
      writeProducts(products);
      return NextResponse.json({ success: true, products });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
