'use client';

import { useEffect, useState, useCallback } from 'react';

interface ImageData {
  folders: Record<string, string[]>;
  staticFiles: string[];
}

interface Product {
  slug: string;
  name: string;
  nameAr?: string;
  material: string;
  collection: string;
  currentImage: string;
  newImage: string;
  changed: boolean;
}

const PRODUCTS: Omit<Product, 'newImage' | 'changed'>[] = [
  { slug: "natural-kuka-wood-tasbih", name: "Natural Kuka Wood Tasbih", nameAr: "سبحة خشب الكوكا الطبيعي", material: "Wood", collection: "signature-tasbih", currentImage: "/images/imported/33-kuka/size.jpg" },
  { slug: "golden-hematite-medallion-tasbih", name: "Golden Hematite Medallion Tasbih", nameAr: "سبحة ميدالية الهيماتيت الذهبي", material: "Hematite", collection: "signature-tasbih", currentImage: "/images/imported/amber-tasbih/size.jpg" },
  { slug: "lacquer-art-33-bead-tasbih", name: "Lacquer Art 33-Bead Tasbih", nameAr: "سبحة الكوارتز المنحوت 33 خرزة", material: "Resin", collection: "signature-tasbih", currentImage: "/images/imported/resin-tasbih/resin-01.jpg" },
  { slug: "baltic-amber-gift-set", name: "Baltic Amber Gift Set", nameAr: "مجموعة هدايا الكهرماني", material: "Amber", collection: "gift-sets", currentImage: "/images/imported/ambercube33/amber-53.jpg" },
  { slug: "terahertz-road-safety-pendant", name: "Terahertz Road Safety Pendant", nameAr: "تعليق الطريق الأمان", material: "Glass", collection: "signature-tasbih", currentImage: "/images/imported/glass-smoke/main.jpg" },
  { slug: "silver-sheen-obsidian-tasbih", name: "Silver Sheen Obsidian Tasbih", nameAr: "سبحة السبج اللامع", material: "Obsidian", collection: "signature-tasbih", currentImage: "/images/imported/silver-sheen-obsidian/size.jpg" },
  { slug: "blue-tigers-eye-tasbih", name: "Blue Tiger's Eye Tasbih", nameAr: "سبحة عين النمر الزرقاء", material: "Tiger's Eye", collection: "signature-tasbih", currentImage: "/images/imported/bluetiger/main.jpg" },
  { slug: "pearl-tasbih", name: "Pearl Tasbih", nameAr: "سبحة اللؤلؤ", material: "Pearl", collection: "signature-tasbih", currentImage: "/images/imported/pearl-tasbih/size.jpg" },
  { slug: "obsidian-tasbih", name: "Obsidian Tasbih", nameAr: "سبحة السبج", material: "Obsidian", collection: "signature-tasbih", currentImage: "/images/imported/obsidian-tasbih/size.jpg" },
  { slug: "resin-tasbih", name: "Resin Tasbih", nameAr: "سبحة الراتنج", material: "Resin", collection: "signature-tasbih", currentImage: "/images/imported/resin-tasbih/resin-01.jpg" },
  { slug: "crystal-tasbih", name: "Crystal Tasbih", nameAr: "سبحة الكريستال", material: "Crystal", collection: "signature-tasbih", currentImage: "/images/imported/crystal-tasbih/size.jpg" },
  { slug: "kechainrose", name: "Kechain Rose Tasbih", nameAr: "سبحة روز كيتشين", material: "Rose Crystal", collection: "signature-tasbih", currentImage: "/images/imported/kechainrose/phone.jpg" },
  { slug: "pocket", name: "Pocket Tiger Eye Tasbih", nameAr: "سبحة عين النمر للجيب", material: "Tiger's Eye", collection: "signature-tasbih", currentImage: "/images/imported/pocket/size.jpg" },
  { slug: "99-pla", name: "99-Bead Plastic Tasbih", nameAr: "سبحة 99 حبة بلاستيك", material: "Plastic", collection: "signature-tasbih", currentImage: "/images/imported/99-pla/size.jpg" },
  { slug: "zebra", name: "Zebra Agate Tasbih", nameAr: "سبحة العقيق المخطط", material: "Agate", collection: "signature-tasbih", currentImage: "/images/imported/zebra/main.jpg" },
  { slug: "watergrass", name: "Water Grass Agate Tasbih", nameAr: "سبحة عقيق العشب المائي", material: "Agate", collection: "signature-tasbih", currentImage: "/images/imported/watergrass/main.jpg" },
  { slug: "orangeagate", name: "Orange Agate Tasbih", nameAr: "سبحة العقيق البرتقالي", material: "Agate", collection: "signature-tasbih", currentImage: "/images/imported/orangeagate/main.jpg" },
  { slug: "blackagate", name: "Black Agate Tasbih", nameAr: "سبحة العقيق الأسود", material: "Agate", collection: "signature-tasbih", currentImage: "/images/imported/blackagate/main.jpg" },
  { slug: "oud2", name: "Oud Tasbih", nameAr: "سبحة العود", material: "Oud", collection: "signature-tasbih", currentImage: "/images/imported/oud2/main.jpg" },
  { slug: "shoushan", name: "Shoushan Stone Tasbih", nameAr: "سبحة حجر شوهان", material: "Stone", collection: "signature-tasbih", currentImage: "/images/imported/shoushan/main.jpg" },
  { slug: "oval-orange", name: "Oval Orange Tasbih", nameAr: "سبحة برتقالي بيضاوي", material: "Glass", collection: "signature-tasbih", currentImage: "/images/imported/oval-orange/main.jpg" },
  { slug: "faceted-orange", name: "Faceted Orange Tasbih", nameAr: "سبحة برتقالي مخطط", material: "Glass", collection: "signature-tasbih", currentImage: "/images/imported/faceted-orange/main.jpg" },
  { slug: "redwhiteglass", name: "Red White Glass Tasbih", nameAr: "سبحة زجاج أحمر أبيض", material: "Glass", collection: "signature-tasbih", currentImage: "/images/imported/redwhiteglass/main.jpg" },
  { slug: "greenresin", name: "Green Resin Tasbih", nameAr: "سبحة راتنج أخضر", material: "Resin", collection: "signature-tasbih", currentImage: "/images/imported/greenresin/main.jpg" },
  { slug: "ambercube33", name: "Amber Cube 33-Bead Tasbih", nameAr: "سبحة مكعب كهرماني 33 حبة", material: "Amber", collection: "signature-tasbih", currentImage: "/images/imported/ambercube33/amber-53.jpg" },
  { slug: "colorchangecube", name: "Color Change Cube Tasbih", nameAr: "سبحة مكعب متغير اللون", material: "Glass", collection: "signature-tasbih", currentImage: "/images/imported/colorchangecube/main.jpg" },
  { slug: "whiteagate33-s", name: "White Agate 33-Bead Tasbih", nameAr: "سبحة عقيق أبيض 33 حبة", material: "Agate", collection: "signature-tasbih", currentImage: "/images/imported/whiteagate33-s/main.jpg" },
  { slug: "greenagate99", name: "Green Agate 99-Bead Tasbih", nameAr: "سبحة عقيق أخضر 99 حبة", material: "Agate", collection: "signature-tasbih", currentImage: "/images/imported/greenagate99/main.jpg" },
  { slug: "glass-smoke", name: "Smoke Glass Tasbih", nameAr: "سبحة زجاج مدخن", material: "Glass", collection: "signature-tasbih", currentImage: "/images/imported/glass-smoke/main.jpg" },
  { slug: "glass-champon", name: "Champon Glass Tasbih", nameAr: "سبحة زجاج شامبون", material: "Glass", collection: "signature-tasbih", currentImage: "/images/imported/glass-champon/main.jpg" },
  { slug: "lumnousglass99", name: "Luminous Glass 99-Bead Tasbih", nameAr: "سبحة زجاج متوهج 99 حبة", material: "Glass", collection: "signature-tasbih", currentImage: "/images/imported/lumnousglass99/new-02.jpg" },
  { slug: "99blackrosewood", name: "99-Bead Black Rosewood Tasbih", nameAr: "سبحة خشب الورد الأسود 99 حبة", material: "Wood", collection: "signature-tasbih", currentImage: "/images/imported/99blackrosewood/main.jpg" },
  { slug: "33shellbar", name: "Shell Bar 33-Bead Tasbih", nameAr: "سبحة بار الصدفي 33 خرزة", material: "Shell", collection: "signature-tasbih", currentImage: "/images/imported/33shellbar/ambertest-8.jpg" },
];

export default function ImageManagerPage() {
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/images')
      .then(r => r.json())
      .then((data: ImageData) => {
        setImageData(data);
        setProducts(PRODUCTS.map(p => ({ ...p, newImage: p.currentImage, changed: false })));
        setLoading(false);
      });
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  const selectImage = (slug: string, url: string) => {
    setProducts(prev => prev.map(p => {
      if (p.slug !== slug) return p;
      const changed = url !== p.currentImage;
      showToast(changed ? `✓ Updated` : `Same image`);
      return { ...p, newImage: url, changed };
    }));
  };

  const resetProduct = (slug: string) => {
    setProducts(prev => prev.map(p =>
      p.slug === slug ? { ...p, newImage: p.currentImage, changed: false } : p
    ));
  };

  const exportChanges = () => {
    const changed = products.filter(p => p.changed);
    if (changed.length === 0) {
      alert('No changes to export!');
      return;
    }
    let output = `# Image Changes - ${new Date().toLocaleDateString('en-GB')}\n`;
    changed.forEach(p => {
      output += `\n## ${p.name} (${p.slug})\n`;
      output += `Current: ${p.currentImage}\n`;
      output += `New:      ${p.newImage}\n`;
    });
    const blob = new Blob([output], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `image-changes-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    showToast(`Exported ${changed.length} change(s)`);
  };

  const folderNames = imageData ? Object.keys(imageData.folders).sort() : [];
  const filteredProducts = products.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q) || p.material.toLowerCase().includes(q);
  });

  const changedCount = products.filter(p => p.changed).length;

  const getOptions = (product: Product) => {
    if (!imageData) return [];
    if (activeFolder) {
      return imageData.folders[activeFolder] || [];
    }
    const keywords = [
      product.material.toLowerCase(),
      product.slug.toLowerCase().replace(/-/g, ''),
      ...product.slug.split('-').filter(w => w.length > 3),
    ];
    const matchedFolders = folderNames.filter(f =>
      keywords.some(k => f.toLowerCase().includes(k))
    );
    if (matchedFolders.length > 0) {
      return matchedFolders.flatMap(f => imageData.folders[f] || []).slice(0, 20);
    }
    return folderNames.flatMap(f => imageData.folders[f] || []).slice(0, 20);
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', fontFamily: 'system-ui' }}>
        <p>Loading image library...</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', background: '#f5f5f5', minHeight: '100vh', padding: 24 }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: 16, color: '#222' }}>
          🖼️ Product Image Manager
        </h1>

        <div style={{ background: '#e8f4fd', border: '1px solid #b8daff', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: '0.875rem' }}>
          <strong>操作说明：</strong>点击选项图选择新图片 → Apply 确认 → 最后 Export 下载变更清单
        </div>

        <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 12, color: '#444' }}>
            📁 Image Folders ({folderNames.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button
              onClick={() => setActiveFolder(null)}
              style={{
                padding: '6px 14px', borderRadius: 20, border: '1px solid #ddd',
                background: activeFolder === null ? '#2196f3' : 'white',
                color: activeFolder === null ? 'white' : '#333', cursor: 'pointer',
                fontSize: '0.75rem', fontWeight: 500
              }}
            >
              All
            </button>
            {folderNames.map(f => (
              <button
                key={f}
                onClick={() => setActiveFolder(f)}
                style={{
                  padding: '6px 14px', borderRadius: 20, border: '1px solid #ddd',
                  background: activeFolder === f ? '#2196f3' : 'white',
                  color: activeFolder === f ? 'white' : '#333', cursor: 'pointer',
                  fontSize: '0.75rem', fontWeight: 500
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '10px 16px', border: '1px solid #ddd', borderRadius: 8, fontSize: '0.9rem' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <div style={{ fontSize: '0.8rem', color: '#666' }}>
            {filteredProducts.length} / {products.length} products
            {changedCount > 0 && <span style={{ color: '#ff9800', fontWeight: 600 }}> · {changedCount} changed</span>}
          </div>
          <button
            onClick={exportChanges}
            style={{
              background: changedCount > 0 ? '#ff9800' : '#4caf50',
              color: 'white', border: 'none', padding: '10px 24px',
              borderRadius: 8, cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
              marginLeft: 'auto'
            }}
          >
            📤 Export {changedCount > 0 ? `${changedCount} ` : ''}Change{changedCount !== 1 ? 's' : ''}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {filteredProducts.map(product => {
            const options = getOptions(product);
            return (
              <div key={product.slug} style={{ background: 'white', borderRadius: 12, border: '1px solid #e0e0e0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#333', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {product.name}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#888', marginTop: 2 }}>{product.material}</div>
                  </div>
                  <span style={{
                    background: product.changed ? '#ff9800' : '#4caf50',
                    color: 'white', fontSize: '0.65rem', padding: '2px 8px', borderRadius: 10, fontWeight: 600
                  }}>
                    {product.changed ? 'Changed' : 'OK'}
                  </span>
                </div>

                <div style={{ background: '#fafafa', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                  <img
                    src={product.newImage}
                    alt={product.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement!.innerHTML = '<div style="color:#999;font-size:0.75rem;text-align:center;padding:20px">Image not found</div>';
                    }}
                  />
                  {product.changed && (
                    <div style={{ position: 'absolute', top: 8, right: 8, background: '#ff9800', color: 'white', fontSize: '0.6rem', padding: '2px 6px', borderRadius: 4 }}>
                      NEW
                    </div>
                  )}
                </div>

                <div style={{ padding: 10 }}>
                  <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Click image to select
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, maxHeight: 180, overflowY: 'auto', border: '1px solid #eee', borderRadius: 8, padding: 6 }}>
                    {options.map((url, i) => (
                      <div
                        key={i}
                        onClick={() => selectImage(product.slug, url)}
                        title={url.split('/').pop()}
                        style={{
                          cursor: 'pointer', borderRadius: 6, overflow: 'hidden', aspectRatio: '1',
                          border: `2px solid ${product.newImage === url ? '#4caf50' : 'transparent'}`,
                          boxShadow: product.newImage === url ? '0 0 0 2px rgba(76,175,80,0.3)' : 'none',
                          transition: 'all 0.15s',
                        }}
                      >
                        <img
                          src={url}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <input
                      type="text"
                      placeholder="Paste image URL..."
                      id={`url-${product.slug}`}
                      style={{ flex: 1, padding: '5px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: '0.75rem' }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const val = (e.target as HTMLInputElement).value.trim();
                          if (val) selectImage(product.slug, val);
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        const val = (document.getElementById(`url-${product.slug}`) as HTMLInputElement).value.trim();
                        if (val) selectImage(product.slug, val);
                      }}
                      style={{ background: '#666', color: 'white', border: 'none', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      Set
                    </button>
                  </div>
                </div>

                <div style={{ padding: '8px 14px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.65rem', color: '#888', fontFamily: 'monospace', background: '#f5f5f5', padding: '2px 6px', borderRadius: 4, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {product.slug}
                  </div>
                  <button
                    onClick={() => resetProduct(product.slug)}
                    disabled={!product.changed}
                    style={{
                      background: product.changed ? '#f44336' : '#e0e0e0',
                      color: 'white', border: 'none', padding: '4px 12px', borderRadius: 6,
                      cursor: product.changed ? 'pointer' : 'not-allowed',
                      fontSize: '0.75rem', fontWeight: 600
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, background: '#333', color: 'white',
          padding: '12px 24px', borderRadius: 8, fontSize: '0.875rem',
          opacity: 1, transition: 'opacity 0.3s', zIndex: 9999
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
