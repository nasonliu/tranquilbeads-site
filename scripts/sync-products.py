#!/usr/bin/env python3
"""Sync image-manager products to site.ts"""
import json
import re
import sys
import os

DEFAULT_ROOT = '/Volumes/新加卷/Documents/ProjectNoor'

def escape(s):
    if not s:
        return ''
    return s.replace('\\', '\\\\').replace('"', '\\"')

def unique(values):
    seen = set()
    result = []
    for value in values:
        if not value or value in seen:
            continue
        seen.add(value)
        result.append(value)
    return result

def get_collections(product):
    collections = product.get('collections')
    if isinstance(collections, list):
        normalized = [str(item).strip() for item in collections if str(item).strip()]
        if normalized:
            return normalized
    legacy_collection = str(product.get('collection', '')).strip()
    return [legacy_collection] if legacy_collection else ['signature-tasbih']

def extract_existing_slugs(content):
    match = re.search(r'export const products: Product\[\] = \[(.*?)\n\];\nexport const contactFormCopy', content, re.S)
    if not match:
        return set()
    return set(re.findall(r'slug:\s+"([^"]+)"', match.group(1)))

def make_product_entry(p):
    valid_images = [img for img in p.get('images', []) if img]
    main = valid_images[0] if valid_images else ''
    gallery = valid_images[1:6]
    collections = get_collections(p)
    collection = collections[0]

    title_en = p.get('titleEn') or p.get('name') or (p.get('title', {}) or {}).get('en', '')
    title_ar = p.get('titleAr') or p.get('nameAr') or (p.get('title', {}) or {}).get('ar', '')
    summary_en = p.get('summaryEn') or ("%s - %s." % (p.get('name',''), p.get('material','')))
    summary_ar = p.get('summaryAr') or ("%s - %s." % (p.get('nameAr',''), p.get('material','')))
    detail_intro_en = p.get('detailIntroEn') or ("%s from TranquilBeads." % title_en)
    detail_intro_ar = p.get('detailIntroAr') or ("%s من ترانكويل بيذرز." % title_ar)
    detail_body_en = p.get('detailBodyEn') or "Premium tasbih. Wholesale available."
    detail_body_ar = p.get('detailBodyAr') or "سبحة فاخرة. متاحة للجملة."
    ideal_for_en = p.get('idealForEn') or 'Distributors, retailers, boutiques'
    ideal_for_ar = p.get('idealForAr') or 'الموزعين، تجار التجزئة'
    tags_en = unique((p.get('tagsEn') or [p.get('material',''), p.get('name','')]) + collections)
    tags_ar = unique((p.get('tagsAr') or [p.get('material',''), p.get('nameAr','')]) + collections)

    specs = p.get('specs') or [
        {'labelEn': 'Material', 'labelAr': 'الخامة', 'valueEn': p.get('material',''), 'valueAr': p.get('material','')},
        {'labelEn': 'Collection', 'labelAr': 'المجموعة', 'valueEn': collection, 'valueAr': collection},
    ]
    if len(collections) > 1:
        specs = specs + [
            {
                'labelEn': 'Collection Tags',
                'labelAr': 'وسوم المجموعات',
                'valueEn': ', '.join(collections),
                'valueAr': ', '.join(collections),
            }
        ]

    lines = []
    lines.append('  {')
    lines.append('    slug: "%s",' % p['slug'])
    lines.append('    collection: "%s",' % collection)
    lines.append('    title: { en: "%s", ar: "%s" },' % (escape(title_en), escape(title_ar)))
    lines.append('    summary: {')
    lines.append('      en: "%s",' % escape(summary_en))
    lines.append('      ar: "%s",' % escape(summary_ar))
    lines.append('    },')
    lines.append('    image: "%s",' % main)
    lines.append('    material: { en: "%s", ar: "%s" },' % (escape(p.get('material','')), escape(p.get('material',''))))
    lines.append('    tags: {')
    tags_en_str = ', '.join('"' + escape(t) + '"' for t in tags_en)
    tags_ar_str = ', '.join('"' + escape(t) + '"' for t in tags_ar)
    lines.append('      en: [%s],' % tags_en_str)
    lines.append('      ar: [%s],' % tags_ar_str)
    lines.append('    },')
    lines.append('    detailIntro: {')
    lines.append('      en: "%s",' % escape(detail_intro_en))
    lines.append('      ar: "%s",' % escape(detail_intro_ar))
    lines.append('    },')
    lines.append('    detailBody: {')
    lines.append('      en: "%s",' % escape(detail_body_en))
    lines.append('      ar: "%s",' % escape(detail_body_ar))
    lines.append('    },')
    lines.append('    idealFor: { en: "%s", ar: "%s" },' % (escape(ideal_for_en), escape(ideal_for_ar)))
    lines.append('    heroAlt: { en: "%s hero", ar: "الصورة الرئيسية ل%s" },' % (escape(title_en), escape(title_ar)))
    lines.append('    gallery: [')
    for i, img in enumerate(gallery):
        lines.append('      { image: "%s", alt: { en: "%s detail %d", ar: "%s تفصيل %d" } },' % (
            img, escape(title_en), i+1, escape(title_ar), i+1))
    lines.append('    ],')
    lines.append('    specs: [')
    for spec in specs:
        lines.append('      { label: { en: "%s", ar: "%s" }, value: { en: "%s", ar: "%s" } },' % (
            escape(spec['labelEn']), escape(spec['labelAr']), escape(spec['valueEn']), escape(spec['valueAr'])))
    lines.append('    ],')
    lines.append('  },')

    return '\n'.join(lines)

def main():
    project_root = os.environ.get('PROJECT_NOOR_ROOT', DEFAULT_ROOT)
    im_file = os.path.join(project_root, 'app/data/image-manager-products.json')
    site_file = os.path.join(project_root, 'src/data/site.ts')

    with open(im_file) as f:
        im_products = json.load(f)

    with open(site_file) as f:
        content = f.read()

    existing_slugs = extract_existing_slugs(content)

    # Find products array boundaries
    m = re.search(r'export const products: Product\[\] = \[', content)
    if not m:
        print(json.dumps({
            'success': False,
            'error': 'Could not find products array',
        }))
        return 1

    # before_end is m.start() - 1 (just before 'export const products')
    before_end = m.start()

    # Find the closing '];\n' of the products array
    # It's the '];' that appears after all products
    contact_pos = content.find('export const contactFormCopy')
    products_close = content.rfind('];', 0, contact_pos)

    # after starts after the '\n' following '];\n'
    # products_close is the position of ']' in '];'
    # '];\n' spans products_close to products_close+2
    after_start = products_close + len('];\n')

    # Build new section
    valid_products = [p for p in im_products if any(img for img in p.get('images', []))]
    entries = '\n'.join(make_product_entry(p) for p in valid_products)
    valid_slugs = {p['slug'] for p in valid_products}
    added = len(valid_slugs - existing_slugs)
    updated = len(valid_slugs & existing_slugs)

    new_products_section = 'export const products: Product[] = [\n%s\n];\n' % entries

    before = content[:before_end]
    after = content[after_start:]

    new_content = before + '\n' + new_products_section + after

    with open(site_file, 'w') as f:
        f.write(new_content)

    print(json.dumps({
        'success': True,
        'added': added,
        'updated': updated,
        'total': len(valid_products),
        'message': 'Synced %d products to site.ts' % len(valid_products),
    }))
    return 0

if __name__ == '__main__':
    sys.exit(main())
