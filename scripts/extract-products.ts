// Standalone script to extract products from site.ts into a JSON file
// Run: npx tsx scripts/extract-products.ts

import fs from 'fs';
import path from 'path';

const SITE_FILE = path.join(process.cwd(), 'src/data/site.ts');
const OUTPUT_FILE = path.join(process.cwd(), 'app/data/image-manager-products.json');

interface ExtractedProduct {
  slug: string;
  name: string;
  nameAr: string;
  material: string;
  collections: string[];
  images: string[];
  titleEn?: string;
  titleAr?: string;
  summaryEn?: string;
  summaryAr?: string;
  detailIntroEn?: string;
  detailIntroAr?: string;
  detailBodyEn?: string;
  detailBodyAr?: string;
  idealForEn?: string;
  idealForAr?: string;
  tagsEn?: string[];
  tagsAr?: string[];
  specs?: { labelEn: string; labelAr: string; valueEn: string; valueAr: string }[];
}

function extractLocale(str: string, locale: 'en' | 'ar'): string {
  // Pattern: { en: "...", ar: "..." }
  const m = str.match(new RegExp(`${locale}:\\s*"((?:[^"\\\\]|\\\\.)*)"`));
  return m ? m[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\') : '';
}

function extractArray(str: string, locale: 'en' | 'ar'): string[] {
  const arrMatch = str.match(new RegExp(`${locale}:\\s*\\[([^\\]]*)\\]`));
  if (!arrMatch) return [];
  const items = arrMatch[1].match(/"((?:[^"\\\\]|\\\\.)*)"/g);
  if (!items) return [];
  return items.map(s => s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
}

async function main() {
  const content = fs.readFileSync(SITE_FILE, 'utf-8');

  const start = content.indexOf('export const products: Product[] = [');
  const end = content.lastIndexOf('];');
  if (start === -1) { console.error('Products not found'); return; }

  const section = content.slice(start, end + 2);

  // Find all product blocks using slug as anchor
  const slugRegex = /slug:\s*"([^"]+)"/g;
  const products: ExtractedProduct[] = [];
  let match;

  while ((match = slugRegex.exec(section)) !== null) {
    const slug = match[1];
    const entryStart = match.index;
    // Find the end of this entry (the "  }," that closes it)
    // Look for "\n  }," after the slug entry
    const afterSlug = section.slice(entryStart);
    const entryEndMatch = afterSlug.match(/\n  \},/);
    if (!entryEndMatch) continue;
    const entryEnd = entryStart + afterSlug.indexOf('\n  },') + 4;
    const entry = section.slice(entryStart, entryEnd);

    const imageMatch = entry.match(/image:\s*"([^"]*)"/);
    const collectionMatch = entry.match(/collection:\s*"([^"]*)"/);
    const titleEn = extractLocale(entry, 'en');
    const titleAr = extractLocale(entry, 'ar');
    const materialMatch = entry.match(/material:\s*\{[^}]*en:\s*"((?:[^"\\\\]|\\\\.)*)"/);
    const summaryEn = extractLocale(entry.split('summary:')[1]?.split('material:')[0] || '', 'en');
    const summaryAr = extractLocale(entry.split('summary:')[1]?.split('material:')[0] || '', 'ar');

    // Extract gallery
    const gallery: string[] = [];
    const galleryMatch = entry.match(/gallery:\s*\[([\s\S]*?)\n\s*\],/);
    if (galleryMatch) {
      const imgMatches = galleryMatch[1].match(/image:\s*"([^"]*)"/g);
      if (imgMatches) {
        imgMatches.forEach(m => gallery.push(m.match(/image:\s*"([^"]*)"/)![1]));
      }
    }

    const tagsEn = extractArray(entry, 'en');
    const tagsAr = extractArray(entry, 'ar');

    // Get detailIntro, detailBody, idealFor, heroAlt
    const detailIntroEn = entry.includes('detailIntro') ? extractLocale(entry.split('detailIntro:')[1]?.split('detailBody:')[0] || '', 'en') : '';
    const detailIntroAr = entry.includes('detailIntro') ? extractLocale(entry.split('detailIntro:')[1]?.split('detailBody:')[0] || '', 'ar') : '';
    const detailBodyEn = entry.includes('detailBody') ? extractLocale(entry.split('detailBody:')[1]?.split('idealFor:')[0] || '', 'en') : '';
    const detailBodyAr = entry.includes('detailBody') ? extractLocale(entry.split('detailBody:')[1]?.split('idealFor:')[0] || '', 'ar') : '';
    const idealForEn = entry.includes('idealFor') ? extractLocale(entry.split('idealFor:')[1]?.split('heroAlt:')[0] || '', 'en') : '';
    const idealForAr = entry.includes('idealFor') ? extractLocale(entry.split('idealFor:')[1]?.split('heroAlt:')[0] || '', 'ar') : '';

    const product: ExtractedProduct = {
      slug,
      name: titleEn,
      nameAr: titleAr,
      material: materialMatch ? materialMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\') : '',
      collections: collectionMatch ? [collectionMatch[1]] : [],
      images: [imageMatch ? imageMatch[1] : '', ...gallery],
      titleEn,
      titleAr,
      summaryEn,
      summaryAr,
      detailIntroEn,
      detailIntroAr,
      detailBodyEn,
      detailBodyAr,
      idealForEn,
      idealForAr,
      tagsEn,
      tagsAr,
    };

    products.push(product);
  }

  console.log(`Extracted ${products.length} products`);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(products, null, 2));
  console.log(`Written to ${OUTPUT_FILE}`);
}

main().catch(console.error);
