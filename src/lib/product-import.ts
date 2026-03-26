import type {
  LocalizedString,
  Product,
  ProductImportPayload,
  ProductImportRecord,
  ProductSpec,
} from "@/src/lib/catalog-types";
import { readSiteContent, writeSiteContent } from "@/src/lib/site-content";

type ImportProductsOptions = {
  filePath: string;
  confirm: boolean;
  payload: ProductImportPayload;
};

type ImportProductsResult = {
  dryRun: boolean;
  created: number;
  updated: number;
  products: Product[];
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toLocalizedString(value: Partial<LocalizedString>, fallback: string): LocalizedString {
  const en = value.en?.trim() || fallback;
  const ar = value.ar?.trim() || en;
  return { en, ar };
}

function toTags(
  value: Partial<Record<keyof LocalizedString, string[]>> | undefined,
): Record<keyof LocalizedString, string[]> {
  const en = value?.en?.length ? value.en : [];
  const ar = value?.ar?.length ? value.ar : en;
  return { en, ar };
}

function toSpecs(specs: ProductImportRecord["specs"]): ProductSpec[] {
  return specs.map((spec, index) => ({
    key: spec.key || `spec_${index + 1}`,
    label: toLocalizedString(spec.label, `Spec ${index + 1}`),
    value: toLocalizedString(spec.value, ""),
  }));
}

function normalizeProduct(record: ProductImportRecord): Product {
  const title = toLocalizedString(record.title, "Untitled Product");
  const slug = record.slug?.trim() ? slugify(record.slug) : slugify(title.en);

  return {
    slug,
    collection: record.collection_slug,
    title,
    summary: toLocalizedString(record.summary, title.en),
    image: record.hero_image.url,
    material: toLocalizedString(record.material, title.en),
    tags: toTags(record.tags),
    detailIntro: toLocalizedString(record.detail_intro, title.en),
    detailBody: toLocalizedString(record.detail_body, title.en),
    idealFor: toLocalizedString(record.ideal_for, title.en),
    heroAlt: toLocalizedString(record.hero_image.alt, `${title.en} hero`),
    gallery: record.gallery.map((item, index) => ({
      image: item.url,
      alt: toLocalizedString(item.alt, `${title.en} detail ${index + 1}`),
    })),
    specs: toSpecs(record.specs),
  };
}

export async function importProducts(
  options: ImportProductsOptions,
): Promise<ImportProductsResult> {
  const content = await readSiteContent(options.filePath);
  const collectionSlugs = new Set(content.collections.map((collection) => collection.slug));
  const nextProducts = [...content.products];
  const normalizedProducts = options.payload.products.map(normalizeProduct);

  let created = 0;
  let updated = 0;

  for (const product of normalizedProducts) {
    if (!collectionSlugs.has(product.collection)) {
      throw new Error(`Unknown collection slug: ${product.collection}`);
    }

    const index = nextProducts.findIndex((item) => item.slug === product.slug);
    if (index >= 0) {
      nextProducts[index] = product;
      updated += 1;
    } else {
      nextProducts.push(product);
      created += 1;
    }
  }

  if (options.confirm) {
    await writeSiteContent(
      {
        ...content,
        products: nextProducts,
      },
      options.filePath,
    );
  }

  return {
    dryRun: !options.confirm,
    created,
    updated,
    products: normalizedProducts,
  };
}
