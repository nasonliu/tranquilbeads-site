import fs from 'fs';
import path from 'path';

interface ImProduct {
  slug: string;
  name: string;
  nameAr: string;
  material: string;
  collections: string[];
  images: string[];
}

const IM_FILE = path.join(process.cwd(), 'app/data/image-manager-products.json');
const SITE_FILE = path.join(process.cwd(), 'src/data/site.ts');

function generateProductEntry(p: ImProduct): string {
  const validImages = p.images.filter(Boolean);
  const main = validImages[0] || '';
  const galleryImages = validImages.slice(1, 6);

  const collection = p.collections?.[0] || 'signature-tasbih';

  const tags = [
    p.material,
    collection,
    p.name,
  ];

  const lines: string[] = [];

  lines.push(`  {`);
  lines.push(`    slug: "${p.slug}",`);
  lines.push(`    collection: "${collection}",`);
  lines.push(`    title: { en: "${escape(p.name)}", ar: "${escape(p.nameAr)}" },`);
  lines.push(`    summary: {`);
  lines.push(`      en: "${escape(p.name)} - ${escape(p.material)}.",`);
  lines.push(`      ar: "${escape(p.nameAr)} - ${escape(p.material)}.",`);
  lines.push(`    },`);
  lines.push(`    image: "${main}",`);

  const materialLabel = p.material;
  lines.push(`    material: { en: "${escape(materialLabel)}", ar: "${escape(materialLabel)}" },`);

  lines.push(`    tags: {`);
  lines.push(`      en: [${tags.map(t => `"${escape(t)}"`).join(', ')}],`);
  lines.push(`      ar: [${tags.map(t => `"${escape(t)}"`).join(', ')}],`);
  lines.push(`    },`);

  lines.push(`    detailIntro: {`);
  lines.push(`      en: "${escape(p.name)} from TranquilBeads. Premium quality ${escape(p.material)}.",`);
  lines.push(`      ar: "${escape(p.nameAr)} من ترانكويل بيذرز.",`);
  lines.push(`    },`);

  lines.push(`    detailBody: {`);
  lines.push(`      en: "Premium ${escape(p.material)} tasbih. Perfect for daily dhikr and spiritual practice. Wholesale available for distributors and retailers.",`);
  lines.push(`      ar: "سبحة ${escape(p.material)} فاخرة. مثالية للذكر اليومي. متاحة للجملة للموزعين.",`);
  lines.push(`    },`);

  lines.push(`    idealFor: { en: "Distributors, retailers, boutiques", ar: "الموزعين، تجار التجزئة، المحلات" },`);

  lines.push(`    heroAlt: { en: "${escape(p.name)} hero", ar: "الصورة الرئيسية ل${escape(p.nameAr)}" },`);

  lines.push(`    gallery: [`);
  galleryImages.forEach((img, i) => {
    lines.push(`      {`);
    lines.push(`        image: "${img}",`);
    lines.push(`        alt: { en: "${escape(p.name)} detail ${i + 1}", ar: "${escape(p.nameAr)} تفصيل ${i + 1}" },`);
    lines.push(`      },`);
  });
  lines.push(`    ],`);

  lines.push(`    specs: [`);
  lines.push(`      { label: { en: "Material", ar: "الخامة" }, value: { en: "${escape(p.material)}", ar: "${escape(p.material)}" } },`);
  lines.push(`      { label: { en: "Collection", ar: "المجموعة" }, value: { en: "${escape(collection)}", ar: "${escape(collection)}" } },`);
  lines.push(`    ],`);

  lines.push(`  },`);

  return lines.join('\n');
}

function escape(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function generateSiteProductsTS(products: ImProduct[]): string {
  const productEntries = products
    .filter(p => p.images?.some(Boolean))
    .map(generateProductEntry)
    .join('\n');

  return `export const products: Product[] = [\n${productEntries}\n];\n`;
}

if (require.main === module) {
  const imProducts: ImProduct[] = JSON.parse(fs.readFileSync(IM_FILE, 'utf-8'));

  // Read existing site.ts
  const siteContent = fs.readFileSync(SITE_FILE, 'utf-8');

  // Find the products section boundaries
  const productsStart = siteContent.indexOf('export const products: Product[] = [');
  const productsEnd = siteContent.lastIndexOf('];');

  if (productsStart === -1 || productsEnd === -1) {
    console.error('Could not find products section in site.ts');
    process.exit(1);
  }

  const before = siteContent.slice(0, productsStart);
  const after = siteContent.slice(productsEnd + 2);

  // Generate new products section
  const newProductsSection = generateSiteProductsTS(imProducts);

  const newSiteContent = before + newProductsSection + after;

  fs.writeFileSync(SITE_FILE, newSiteContent);
  console.log(`✓ Updated site.ts with ${imProducts.filter(p => p.images?.some(Boolean)).length} products`);
}
