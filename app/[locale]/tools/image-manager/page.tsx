'use client';

import { useEffect, useState, useCallback } from 'react';

interface ImageData {
  folders: Record<string, string[]>;
  staticFiles: string[];
}

interface Product {
  slug: string;
  name: string;
  nameAr: string;
  material: string;
  collections: string[];
  images: string[];
}

const ALL_COLLECTIONS = [
  'signature-tasbih',
  'gift-sets',
  'wholesale',
  'new-arrivals',
  'best-sellers',
  'ramadan-eid',
  'premium',
];

const EMPTY_PRODUCT: Product = {
  slug: '',
  name: '',
  nameAr: '',
  material: '',
  collections: [],
  images: ['', '', '', '', '', ''],
};

const TOTAL_SLOTS = 6;

function ImagePickerModal({
  productSlug,
  slotIndex,
  imageData,
  onSelect,
  onUpload,
  onClose,
}: {
  productSlug: string;
  slotIndex: number;
  imageData: ImageData;
  onSelect: (url: string) => void;
  onUpload: (url: string) => void;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
  const [uploading, setUploading] = useState(false);

  const getAllImages = () => {
    const folderNames = Object.keys(imageData.folders).sort();
    return folderNames.flatMap(f => imageData.folders[f] || []);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('slug', productSlug);
      const res = await fetch('/api/images', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        onUpload(data.url);
      } else {
        alert('Upload failed');
      }
    } catch {
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const options = getAllImages();

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 99999,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'white', borderRadius: 16, width: '90vw', maxWidth: 900,
        maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#333' }}>
              选择图片 — 槽位 {slotIndex + 1}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#999', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid #eee' }}>
          <button onClick={() => setActiveTab('library')} style={{ flex: 1, padding: '10px', border: 'none', background: activeTab === 'library' ? '#2196f3' : '#f5f5f5', color: activeTab === 'library' ? 'white' : '#666', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
            📁 图片库
          </button>
          <button onClick={() => setActiveTab('upload')} style={{ flex: 1, padding: '10px', border: 'none', background: activeTab === 'upload' ? '#2196f3' : '#f5f5f5', color: activeTab === 'upload' ? 'white' : '#666', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
            📂 本地上传
          </button>
          <button onClick={() => window.open('http://192.168.5.76:5666/p/', '_blank')} style={{ padding: '10px 16px', border: 'none', background: '#666', color: 'white', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
            📷 外部图库
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 16, minHeight: 0 }}>
          {activeTab === 'library' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8, overflowY: 'auto' }}>
              {options.map((url, i) => (
                <div key={i} onClick={() => { onSelect(url); onClose(); }} style={{ cursor: 'pointer', borderRadius: 8, overflow: 'hidden', border: '2px solid transparent', transition: 'all 0.15s', aspectRatio: '1', minWidth: 0 }} title={url.split('/').pop()}>
                  <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={(e) => { const el = e.target as HTMLImageElement; el.style.display = 'none'; el.parentElement!.style.background = '#eee'; }} />
                </div>
              ))}
            </div>
          )}

          {activeTab === 'upload' && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <input type="file" accept="image/*" id="modal-upload" style={{ display: 'none' }} onChange={async (e) => { const file = (e.target as HTMLInputElement).files?.[0]; if (file) await handleUpload(file); }} />
              <label htmlFor="modal-upload" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', padding: '40px 60px', border: '2px dashed #ccc', borderRadius: 16, cursor: 'pointer', background: '#fafafa' }}>
                <span style={{ fontSize: '3rem', marginBottom: 12 }}>📁</span>
                <span style={{ fontSize: '0.9rem', color: '#666', fontWeight: 600 }}>{uploading ? '上传中...' : '点击选择本地图片'}</span>
                <span style={{ fontSize: '0.75rem', color: '#999', marginTop: 6 }}>图片将保存到产品专属文件夹</span>
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EditProductModal({
  product,
  mode,
  allCollections,
  onSave,
  onClose,
}: {
  product: Product;
  mode: 'add' | 'edit';
  allCollections: string[];
  onSave: (product: Product) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Product>({ ...product });
  const [images, setImages] = useState<string[]>([...product.images]);
  const [saving, setSaving] = useState(false);
  const [newTag, setNewTag] = useState('');

  const updateField = (field: keyof Product, value: unknown) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const toggleCollection = (col: string) => {
    const cols = form.collections.includes(col)
      ? form.collections.filter(c => c !== col)
      : [...form.collections, col];
    updateField('collections', cols);
  };

  const addCollection = () => {
    const tag = newTag.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    if (tag && !form.collections.includes(tag) && !allCollections.includes(tag)) {
      updateField('collections', [...form.collections, tag]);
    }
    setNewTag('');
  };

  const updateImage = (i: number, url: string) => {
    const updated = [...images];
    updated[i] = url;
    setImages(updated);
  };

  const handleSave = async () => {
    if (!form.slug.trim() || !form.name.trim()) {
      alert('Slug 和名称不能为空');
      return;
    }
    setSaving(true);
    await onSave({ ...form, images });
    setSaving(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: 'white', borderRadius: 16, width: '90vw', maxWidth: 600, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#333' }}>{mode === 'add' ? '➕ 新增产品' : '✏️ 编辑产品'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#999', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#666', display: 'block', marginBottom: 4 }}>Slug（英文，用于URL）</label>
              <input type="text" value={form.slug} onChange={e => updateField('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: '0.85rem' }} placeholder="e.g. amber-tasbih" disabled={mode === 'edit'} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#666', display: 'block', marginBottom: 4 }}>名称（英文）</label>
                <input type="text" value={form.name} onChange={e => updateField('name', e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: '0.85rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#666', display: 'block', marginBottom: 4 }}>名称（阿拉伯语）</label>
                <input type="text" value={form.nameAr} onChange={e => updateField('nameAr', e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: '0.85rem', direction: 'rtl' }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#666', display: 'block', marginBottom: 4 }}>材质</label>
              <input type="text" value={form.material} onChange={e => updateField('material', e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: '0.85rem' }} />
            </div>

            {/* Collections / Tags */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#666', display: 'block', marginBottom: 6 }}>Collections（可多选）</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {allCollections.map(col => (
                  <button key={col} onClick={() => toggleCollection(col)} style={{ padding: '4px 10px', borderRadius: 16, border: '1px solid #ddd', background: form.collections.includes(col) ? '#2196f3' : 'white', color: form.collections.includes(col) ? 'white' : '#333', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500 }}>
                    {col}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input type="text" value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCollection(); } }} placeholder="新增 collection 标签" style={{ flex: 1, padding: '6px 10px', border: '1px solid #ddd', borderRadius: 8, fontSize: '0.8rem' }} />
                <button onClick={addCollection} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#4caf50', color: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>添加</button>
              </div>
              {form.collections.length > 0 && (
                <div style={{ marginTop: 6, fontSize: '0.7rem', color: '#888' }}>
                  已选: {form.collections.join(', ')}
                </div>
              )}
            </div>

            {/* Images */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#666', display: 'block', marginBottom: 4 }}>产品图片（6张）</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
                {images.map((img, i) => (
                  <div key={i} onClick={() => { const url = prompt(`槽位 ${i + 1} 图片 URL：`, img); if (url !== null) updateImage(i, url.trim()); }} style={{ cursor: 'pointer', borderRadius: 6, overflow: 'hidden', aspectRatio: '1', border: i === 0 ? '2px solid #4caf50' : '2px solid #e0e0e0', background: '#f5f5f5', position: 'relative' }}>
                    {img ? <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: '0.7rem' }}>+</div>}
                    <div style={{ position: 'absolute', bottom: 1, left: 1, background: i === 0 ? '#4caf50' : 'rgba(0,0,0,0.5)', color: 'white', fontSize: '8px', padding: '1px 3px', borderRadius: 3 }}>{i + 1}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '16px 20px', borderTop: '1px solid #eee', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: '0.85rem' }}>取消</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#4caf50', color: 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>{saving ? '保存中...' : '保存'}</button>
        </div>
      </div>
    </div>
  );
}

export default function ImageManagerPage() {
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [picker, setPicker] = useState<{ productSlug: string; slotIndex: number } | null>(null);
  const [editModal, setEditModal] = useState<{ product: Product; mode: 'add' | 'edit' } | null>(null);
  const [originalProducts, setOriginalProducts] = useState<Product[]>([]);
  const [allCollections, setAllCollections] = useState<string[]>([...ALL_COLLECTIONS]);
  const [filterCollections, setFilterCollections] = useState<string[]>([]);
  const [syncing, setSyncing] = useState(false);

  const loadData = useCallback(async () => {
    const [imgRes, prodRes] = await Promise.all([
      fetch('/api/images').then(r => r.json()),
      fetch('/api/image-manager/products').then(r => r.json()),
    ]);
    setImageData(imgRes);
    setProducts(prodRes);
    setOriginalProducts(prodRes);
    // Collect all unique collections
    const cols = new Set<string>(ALL_COLLECTIONS);
    prodRes.forEach((p: Product) => p.collections?.forEach((c: string) => cols.add(c)));
    setAllCollections([...cols]);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  const setSlotImage = (slug: string, slotIndex: number, url: string) => {
    setProducts(prev => prev.map(p => {
      if (p.slug !== slug) return p;
      const images = [...p.images];
      images[slotIndex] = url;
      return { ...p, images };
    }));
    showToast(`✓ 槽位 ${slotIndex + 1} 已更新`);
  };

  const handleSaveProduct = async (product: Product) => {
    try {
      const action = editModal?.mode === 'add' ? 'add' : 'update';
      const res = await fetch('/api/image-manager/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, product, slug: product.slug }),
      });
      const data = await res.json();
      if (data.error) { alert(data.error); return; }
      setProducts(data.products);
      setOriginalProducts(data.products);
      // Update allCollections if new ones were added
      const cols = new Set<string>(ALL_COLLECTIONS);
      data.products.forEach((p: Product) => p.collections?.forEach((c: string) => cols.add(c)));
      setAllCollections([...cols]);
      setEditModal(null);
      showToast(editModal?.mode === 'add' ? '✓ 产品已添加' : '✓ 产品已保存');
    } catch { alert('保存失败'); }
  };

  const handleDeleteProduct = async (slug: string) => {
    if (!confirm(`确定删除产品 "${slug}"？`)) return;
    const res = await fetch('/api/image-manager/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', slug }),
    });
    const data = await res.json();
    if (data.error) { alert(data.error); return; }
    setProducts(data.products);
    setOriginalProducts(data.products);
    showToast('✓ 产品已删除');
  };

  const handleSyncToSite = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/image-manager/sync', { method: 'POST' });
      const data = await res.json();
      if (data.error) { alert('同步失败: ' + data.error); }
      else if (typeof data.added === 'number' && typeof data.updated === 'number' && typeof data.total === 'number') {
        showToast(`✓ 同步完成：${data.added} 新增，${data.updated} 更新，共 ${data.total} 个产品`);
      } else {
        showToast(`✓ ${data.message || '同步完成'}`);
      }
    } catch { alert('同步失败'); }
    finally { setSyncing(false); }
  };

  const toggleFilterCollection = (col: string) => {
    setFilterCollections(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);
  };

  const exportChanges = () => {
    const changed = products.filter((p, i) => JSON.stringify(p) !== JSON.stringify(originalProducts[i]));
    if (changed.length === 0) { alert('No changes to export!'); return; }
    let output = `# Product Changes - ${new Date().toLocaleDateString('en-GB')}\n\n`;
    changed.forEach(p => {
      output += `## ${p.name} (${p.slug})\n`;
      output += `Material: ${p.material} | Collections: ${p.collections.join(', ')}\n`;
      p.images.forEach((img, i) => { if (img) output += `  [${i + 1}] ${img}\n`; });
      output += `\n`;
    });
    const blob = new Blob([output], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `product-changes-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    showToast(`Exported ${changed.length} product(s)`);
  };

  const filteredProducts = products.filter(p => {
    if (filterCollections.length > 0 && !filterCollections.some(c => p.collections?.includes(c))) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q) || p.material.toLowerCase().includes(q);
  });

  const changedCount = products.filter((p, i) => JSON.stringify(p) !== JSON.stringify(originalProducts[i])).length;

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', fontFamily: 'system-ui' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', background: '#f5f5f5', minHeight: '100vh', padding: 24 }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <h1 style={{ fontSize: '1.5rem', color: '#222', margin: 0 }}>🖼️ Product Manager</h1>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={handleSyncToSite} disabled={syncing} style={{ background: syncing ? '#ccc' : '#e91e63', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: syncing ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
              {syncing ? '同步中...' : '🚀 同步到网站'}
            </button>
            <button onClick={() => setEditModal({ product: { ...EMPTY_PRODUCT }, mode: 'add' })} style={{ background: '#4caf50', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
              ➕ 新增产品
            </button>
          </div>
        </div>

        <div style={{ background: '#fff3e0', border: '1px solid #ffcc80', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: '0.875rem' }}>
          <strong>操作说明：</strong>点击槽位选择图片 → 编辑产品信息 → <strong>🚀 同步到网站</strong>推送变更到真实产品文件
        </div>

        {/* Collection filter tags */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#888', marginBottom: 6 }}>按 Collection 筛选（可多选）：</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <button onClick={() => setFilterCollections([])} style={{ padding: '4px 12px', borderRadius: 16, border: '1px solid #ddd', background: filterCollections.length === 0 ? '#666' : 'white', color: filterCollections.length === 0 ? 'white' : '#333', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500 }}>全部</button>
            {allCollections.map(col => (
              <button key={col} onClick={() => toggleFilterCollection(col)} style={{ padding: '4px 12px', borderRadius: 16, border: '1px solid #ddd', background: filterCollections.includes(col) ? '#2196f3' : 'white', color: filterCollections.includes(col) ? 'white' : '#333', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500 }}>
                {col}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <input type="text" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', padding: '10px 16px', border: '1px solid #ddd', borderRadius: 8, fontSize: '0.9rem' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <div style={{ fontSize: '0.8rem', color: '#666' }}>
            {filteredProducts.length} / {products.length} products
            {changedCount > 0 && <span style={{ color: '#ff9800', fontWeight: 600 }}> · {changedCount} changed</span>}
          </div>
          <button onClick={exportChanges} style={{ background: changedCount > 0 ? '#ff9800' : '#4caf50', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 8, cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, marginLeft: 'auto' }}>
            📤 Export{changedCount > 0 ? ` ${changedCount}` : ''}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filteredProducts.map(product => {
            const origIdx = products.indexOf(product);
            const isChanged = JSON.stringify(product) !== JSON.stringify(originalProducts[origIdx]);
            return (
              <div key={product.slug} style={{ background: 'white', borderRadius: 12, border: '1px solid #e0e0e0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</div>
                    <div style={{ fontSize: '0.65rem', color: '#888', marginTop: 2 }}>{product.material}</div>
                    {product.collections?.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
                        {product.collections.map(c => (
                          <span key={c} style={{ background: '#e3f2fd', color: '#1565c0', fontSize: '0.6rem', padding: '1px 6px', borderRadius: 10, fontWeight: 500 }}>{c}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 8 }}>
                    <button onClick={() => setEditModal({ product: { ...product }, mode: 'edit' })} style={{ background: '#2196f3', color: 'white', border: 'none', padding: '3px 8px', borderRadius: 6, cursor: 'pointer', fontSize: '0.7rem' }}>✏️</button>
                    <button onClick={() => handleDeleteProduct(product.slug)} style={{ background: '#f44336', color: 'white', border: 'none', padding: '3px 8px', borderRadius: 6, cursor: 'pointer', fontSize: '0.7rem' }}>🗑️</button>
                    <span style={{ background: isChanged ? '#ff9800' : '#4caf50', color: 'white', fontSize: '0.65rem', padding: '3px 8px', borderRadius: 10, fontWeight: 600 }}>{isChanged ? 'Changed' : 'OK'}</span>
                  </div>
                </div>

                <div style={{ background: '#fafafa', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                  {product.images[0] ? <img src={product.images[0]} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { const el = e.target as HTMLImageElement; el.style.display = 'none'; el.parentElement!.innerHTML = '<div style="color:#999;font-size:0.75rem;padding:20px">Image not found</div>'; }} /> : <span style={{ color: '#ccc', fontSize: '0.8rem' }}>空</span>}
                  <div style={{ position: 'absolute', top: 6, left: 6, background: '#4caf50', color: 'white', fontSize: '0.6rem', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>MAIN</div>
                </div>

                <div style={{ padding: 10 }}>
                  <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: 8, fontWeight: 600 }}>点击槽位选择/替换图片</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4 }}>
                    {Array.from({ length: TOTAL_SLOTS }).map((_, slotIndex) => {
                      const img = product.images[slotIndex];
                      return (
                        <div key={slotIndex} onClick={() => imageData && setPicker({ productSlug: product.slug, slotIndex })} style={{ cursor: 'pointer', borderRadius: 6, overflow: 'hidden', aspectRatio: '1', position: 'relative', border: slotIndex === 0 ? '2px solid #4caf50' : '2px solid #e0e0e0', background: '#f5f5f5', transition: 'all 0.15s' }} title={`Slot ${slotIndex + 1}${img ? ': ' + img.split('/').pop() : ''}`}>
                          {img ? <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: '0.6rem' }}>+</div>}
                          <div style={{ position: 'absolute', bottom: 1, left: 1, background: slotIndex === 0 ? '#4caf50' : 'rgba(0,0,0,0.5)', color: 'white', fontSize: '8px', padding: '1px 3px', borderRadius: 3, fontWeight: 700 }}>{slotIndex + 1}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ padding: '8px 14px', borderTop: '1px solid #f0f0f0' }}>
                  <div style={{ fontSize: '0.65rem', color: '#888', fontFamily: 'monospace', background: '#f5f5f5', padding: '2px 6px', borderRadius: 4, display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.slug}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {picker && imageData && (
        <ImagePickerModal productSlug={picker.productSlug} slotIndex={picker.slotIndex} imageData={imageData} onSelect={(url) => setSlotImage(picker.productSlug, picker.slotIndex, url)} onUpload={(url) => { setSlotImage(picker.productSlug, picker.slotIndex, url); setPicker(null); }} onClose={() => setPicker(null)} />
      )}

      {editModal && (
        <EditProductModal product={editModal.product} mode={editModal.mode} allCollections={allCollections} onSave={handleSaveProduct} onClose={() => setEditModal(null)} />
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#333', color: 'white', padding: '12px 24px', borderRadius: 8, fontSize: '0.875rem', opacity: 1, transition: 'opacity 0.3s', zIndex: 99999 }}>
          {toast}
        </div>
      )}
    </div>
  );
}
