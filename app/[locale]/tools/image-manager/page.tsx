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

interface CandidateImage {
  id: number;
  product_group: string;
  material: string | null;
  bead_count: string | null;
  product_type: string | null;
  shot_type: string | null;
  source_folder?: string | null;
  filename_pattern?: string | null;
  original_path: string;
  previewUrl: string;
  score: number;
  reasons: string[];
}

interface PublishPreview {
  hasChanges: boolean;
  branch: string;
  files: Array<{
    path: string;
    status: 'modified' | 'added' | 'deleted' | 'renamed' | 'copied' | 'untracked';
  }>;
  commitMessage: string;
}

interface ConfigState {
  hasGithubToken: boolean;
  githubTokenMask: string | null;
  repo: string | null;
}

interface DeploymentStatus {
  state: 'not_configured' | 'building' | 'ready' | 'error' | 'unknown';
  repo: string | null;
  commitSha: string;
  deploymentUrl: string | null;
  productionUrl: string | null;
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

function withPreviewBust(url: string, seed: string) {
  if (!url) return url;
  const divider = url.includes('?') ? '&' : '?';
  return `${url}${divider}preview=${encodeURIComponent(seed)}`;
}

function SlotPreview({
  src,
  alt,
  seed,
  emptyLabel = '空',
  className = '',
}: {
  src?: string;
  alt: string;
  seed: string;
  emptyLabel?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div
        className={className}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ccc',
          fontSize: '0.75rem',
          padding: '20px',
          textAlign: 'center',
        }}
      >
        {src ? 'Image not found' : emptyLabel}
      </div>
    );
  }

  return (
    <img
      key={`${seed}-${src}`}
      src={withPreviewBust(src, `${seed}-${src}`)}
      alt={alt}
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      onError={() => setFailed(true)}
    />
  );
}

function ImagePickerModal({
  product,
  slotIndex,
  imageData,
  onSelect,
  onUpload,
  onClose,
}: {
  product: Product;
  slotIndex: number;
  imageData: ImageData;
  onSelect: (url: string) => void;
  onUpload: (url: string) => Promise<void>;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'recommended' | 'library' | 'upload'>('recommended');
  const [uploading, setUploading] = useState(false);
  const [recommendations, setRecommendations] = useState<CandidateImage[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);
  const [recommendationQuery, setRecommendationQuery] = useState('');
  const [importingCandidateId, setImportingCandidateId] = useState<number | null>(null);
  const [visibleRecommendationCount, setVisibleRecommendationCount] = useState(24);

  const getAllImages = () => {
    const folderNames = Object.keys(imageData.folders).sort();
    return [
      ...folderNames.flatMap(f => imageData.folders[f] || []),
      ...(imageData.staticFiles || []),
    ];
  };

  useEffect(() => {
    let cancelled = false;

    async function loadRecommendations() {
      setLoadingRecommendations(true);
      try {
        const params = new URLSearchParams({
          material: product.material,
          name: product.name,
          limit: '24',
        });
        const res = await fetch(`/api/image-manager/candidates?${params.toString()}`, { cache: 'no-store' });
        const data = await res.json();
        if (!cancelled) {
          setRecommendations(Array.isArray(data.candidates) ? data.candidates : []);
        }
      } catch {
        if (!cancelled) {
          setRecommendations([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingRecommendations(false);
        }
      }
    }

    loadRecommendations();
    return () => { cancelled = true; };
  }, [product.material, product.name]);

  useEffect(() => {
    setVisibleRecommendationCount(24);
  }, [recommendations, recommendationQuery, product.slug, slotIndex]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('slug', product.slug);
      const res = await fetch('/api/images', { method: 'POST', body: formData, cache: 'no-store' });
      const data = await res.json();
      if (data.url) {
        await onUpload(data.url);
      } else {
        alert('Upload failed');
      }
    } catch {
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleCandidateImport = async (candidate: CandidateImage) => {
    setImportingCandidateId(candidate.id);
    try {
      const res = await fetch('/api/image-manager/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: product.slug,
          originalPath: candidate.original_path,
        }),
      });
      const data = await res.json();
      if (data.url) {
        onSelect(data.url);
        onClose();
      } else {
        alert(data.error || '导入图片失败');
      }
    } catch {
      alert('导入图片失败');
    } finally {
      setImportingCandidateId(null);
    }
  };

  const options = getAllImages();
  const filteredRecommendations = recommendations.filter((candidate) => {
    if (!recommendationQuery.trim()) return true;
    const q = recommendationQuery.trim().toLowerCase();
    return [
      candidate.material,
      candidate.product_group,
      candidate.filename_pattern,
      candidate.source_folder,
      candidate.reasons.join(' '),
    ].some((value) => (value || '').toLowerCase().includes(q));
  });
  const visibleRecommendations = filteredRecommendations.slice(0, visibleRecommendationCount);

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
              选择图片 — {product.name} · 槽位 {slotIndex + 1}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#888', marginTop: 3 }}>
              推荐顺序会优先参考材质：{product.material || '未填写'}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#999', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid #eee' }}>
          <button onClick={() => setActiveTab('recommended')} style={{ flex: 1, padding: '10px', border: 'none', background: activeTab === 'recommended' ? '#4caf50' : '#f5f5f5', color: activeTab === 'recommended' ? 'white' : '#666', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
            ✨ 智能推荐
          </button>
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
          {activeTab === 'recommended' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                <input
                  type="text"
                  value={recommendationQuery}
                  onChange={(e) => setRecommendationQuery(e.target.value)}
                  placeholder="筛选推荐结果，例如 amber / 琥珀 / 33 / main"
                  style={{ flex: 1, minWidth: 220, padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: '0.82rem' }}
                />
                <div style={{ fontSize: '0.74rem', color: '#777' }}>
                  共 {filteredRecommendations.length} 条候选
                </div>
              </div>

              {loadingRecommendations ? (
                <div style={{ padding: '40px 20px', color: '#777', textAlign: 'center' }}>正在读取本地产品图候选...</div>
              ) : filteredRecommendations.length === 0 ? (
                <div style={{ padding: '40px 20px', color: '#777', textAlign: 'center' }}>没有找到匹配候选，请改用图片库或本地上传。</div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                    {visibleRecommendations.map((candidate) => (
                      <button
                        key={candidate.id}
                        onClick={() => void handleCandidateImport(candidate)}
                        disabled={importingCandidateId === candidate.id}
                        style={{
                          border: '1px solid #e5e5e5',
                          background: 'white',
                          borderRadius: 12,
                          overflow: 'hidden',
                          cursor: importingCandidateId === candidate.id ? 'wait' : 'pointer',
                          padding: 0,
                          textAlign: 'left',
                          boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                        }}
                      >
                        <div style={{ aspectRatio: '1', background: '#f5f5f5', overflow: 'hidden' }}>
                          <img src={candidate.previewUrl} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        </div>
                        <div style={{ padding: 10 }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#333' }}>
                            {candidate.material || '未知材质'} · {candidate.bead_count || '-'}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#666', marginTop: 4 }}>
                            {candidate.filename_pattern || candidate.shot_type || candidate.product_group}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                            {candidate.reasons.slice(0, 3).map((reason) => (
                              <span key={reason} style={{ background: '#eef6ea', color: '#2e7d32', fontSize: '0.62rem', padding: '2px 6px', borderRadius: 999 }}>
                                {reason}
                              </span>
                            ))}
                          </div>
                          <div style={{ fontSize: '0.64rem', color: '#888', marginTop: 8 }}>
                            组 {candidate.product_group} · 分数 {candidate.score}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  {visibleRecommendationCount < filteredRecommendations.length && (
                    <div style={{ marginTop: 14, textAlign: 'center' }}>
                      <button
                        onClick={() => setVisibleRecommendationCount((count) => count + 24)}
                        style={{ border: '1px solid #ddd', background: 'white', borderRadius: 999, padding: '9px 16px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: '#444' }}
                      >
                        加载更多候选
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

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

function PublishModal({
  preview,
  publishing,
  onConfirm,
  onClose,
}: {
  preview: PublishPreview;
  publishing: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}
      onClick={(e) => { if (e.target === e.currentTarget && !publishing) onClose(); }}
    >
      <div style={{ background: 'white', borderRadius: 16, width: '90vw', maxWidth: 720, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#222' }}>📤 发布到网站</div>
            <div style={{ fontSize: '0.74rem', color: '#777', marginTop: 3 }}>
              将在本地执行 commit + push，然后由 Vercel 自动部署
            </div>
          </div>
          <button onClick={onClose} disabled={publishing} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: publishing ? 'not-allowed' : 'pointer', color: '#999', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: 20, overflow: 'auto' }}>
          <div style={{ background: '#f7f7f7', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: '0.82rem', color: '#444' }}>
            <div><strong>分支：</strong>{preview.branch}</div>
            <div style={{ marginTop: 6 }}><strong>提交信息：</strong>{preview.commitMessage}</div>
          </div>

          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#444', marginBottom: 10 }}>
            即将发布 {preview.files.length} 个文件
          </div>
          <div style={{ border: '1px solid #eee', borderRadius: 12, overflow: 'hidden' }}>
            {preview.files.map((file) => (
              <div key={file.path} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: '1px solid #f3f3f3', fontSize: '0.78rem' }}>
                <span style={{
                  minWidth: 74,
                  textAlign: 'center',
                  borderRadius: 999,
                  padding: '3px 8px',
                  background: file.status === 'untracked' ? '#e8f5e9' : '#fff3e0',
                  color: file.status === 'untracked' ? '#2e7d32' : '#ef6c00',
                  fontWeight: 700,
                }}>
                  {file.status}
                </span>
                <span style={{ fontFamily: 'monospace', color: '#444', wordBreak: 'break-all' }}>{file.path}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '16px 20px', borderTop: '1px solid #eee', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={onClose} disabled={publishing} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #ddd', background: 'white', cursor: publishing ? 'not-allowed' : 'pointer', fontSize: '0.85rem' }}>取消</button>
          <button onClick={onConfirm} disabled={publishing} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: publishing ? '#ccc' : '#111', color: 'white', cursor: publishing ? 'wait' : 'pointer', fontSize: '0.85rem', fontWeight: 700 }}>
            {publishing ? '发布中...' : '确认发布'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeploymentStatusPanel({
  status,
  loading,
  onRefresh,
}: {
  status: DeploymentStatus | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  if (!status) return null;

  const stateLabel = {
    not_configured: '未配置 GitHub Token',
    building: 'Vercel 部署中',
    ready: 'Vercel 已完成',
    error: 'Vercel 部署失败',
    unknown: '状态未知',
  }[status.state];

  const stateColor = {
    not_configured: '#757575',
    building: '#ef6c00',
    ready: '#2e7d32',
    error: '#c62828',
    unknown: '#455a64',
  }[status.state];

  return (
    <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e0e0e0', padding: 16, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#222' }}>Vercel 部署状态</div>
          <div style={{ fontSize: '0.74rem', color: '#777', marginTop: 4 }}>
            当前跟踪 commit：<span style={{ fontFamily: 'monospace' }}>{status.commitSha.slice(0, 7)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ background: `${stateColor}15`, color: stateColor, borderRadius: 999, padding: '6px 10px', fontSize: '0.75rem', fontWeight: 700 }}>
            {stateLabel}
          </span>
          <button onClick={onRefresh} disabled={loading} style={{ background: loading ? '#ccc' : '#111', color: 'white', border: 'none', padding: '8px 14px', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
            {loading ? '刷新中...' : '刷新状态'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 14 }}>
        <div style={{ background: '#f7f7f7', borderRadius: 10, padding: '10px 12px', fontSize: '0.78rem', color: '#444' }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>GitHub Repo</div>
          <div style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{status.repo || '未识别'}</div>
        </div>
        <div style={{ background: '#f7f7f7', borderRadius: 10, padding: '10px 12px', fontSize: '0.78rem', color: '#444' }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Production</div>
          {status.productionUrl ? (
            <a href={status.productionUrl} target="_blank" rel="noreferrer" style={{ color: '#1565c0', wordBreak: 'break-all' }}>{status.productionUrl}</a>
          ) : (
            <span style={{ color: '#777' }}>暂无</span>
          )}
        </div>
        <div style={{ background: '#f7f7f7', borderRadius: 10, padding: '10px 12px', fontSize: '0.78rem', color: '#444' }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Deployment</div>
          {status.deploymentUrl ? (
            <a href={status.deploymentUrl} target="_blank" rel="noreferrer" style={{ color: '#1565c0', wordBreak: 'break-all' }}>{status.deploymentUrl}</a>
          ) : (
            <span style={{ color: '#777' }}>暂无</span>
          )}
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
  const [picker, setPicker] = useState<{ product: Product; slotIndex: number } | null>(null);
  const [editModal, setEditModal] = useState<{ product: Product; mode: 'add' | 'edit' } | null>(null);
  const [originalProducts, setOriginalProducts] = useState<Product[]>([]);
  const [allCollections, setAllCollections] = useState<string[]>([...ALL_COLLECTIONS]);
  const [filterCollections, setFilterCollections] = useState<string[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [publishPreview, setPublishPreview] = useState<PublishPreview | null>(null);
  const [loadingPublishPreview, setLoadingPublishPreview] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [config, setConfig] = useState<ConfigState | null>(null);
  const [githubTokenInput, setGithubTokenInput] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [testingConfig, setTestingConfig] = useState(false);
  const [deployStatus, setDeployStatus] = useState<DeploymentStatus | null>(null);
  const [deployStatusLoading, setDeployStatusLoading] = useState(false);

  const syncCollectionsFromProducts = useCallback((nextProducts: Product[]) => {
    const cols = new Set<string>(ALL_COLLECTIONS);
    nextProducts.forEach((p: Product) => p.collections?.forEach((c: string) => cols.add(c)));
    setAllCollections([...cols]);
  }, []);

  const loadData = useCallback(async () => {
    const [imgRes, prodRes] = await Promise.all([
      fetch('/api/images', { cache: 'no-store' }).then(r => r.json()),
      fetch('/api/image-manager/products', { cache: 'no-store' }).then(r => r.json()),
    ]);
    setImageData(imgRes);
    setProducts(prodRes);
    setOriginalProducts(prodRes);
    syncCollectionsFromProducts(prodRes);
    setLoading(false);
  }, [syncCollectionsFromProducts]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/image-manager/config', { cache: 'no-store' });
      const data = await res.json();
      if (!data.error) {
        setConfig(data);
      }
    } catch {
      // Keep the UI usable even if local config fails to load.
    }
  }, []);

  useEffect(() => { void loadConfig(); }, [loadConfig]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  const persistProduct = useCallback(async (updatedProduct: Product) => {
    const res = await fetch('/api/image-manager/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ action: 'update', product: updatedProduct, slug: updatedProduct.slug }),
    });
    const data = await res.json();
    if (data.error) {
      throw new Error(data.error);
    }
    setProducts(data.products);
    setOriginalProducts(data.products);
    syncCollectionsFromProducts(data.products);
  }, [syncCollectionsFromProducts]);

  const refreshImageLibrary = useCallback(async () => {
    const res = await fetch('/api/images', { cache: 'no-store' });
    const data = await res.json();
    setImageData(data);
  }, []);

  const applyLocalProductUpdate = useCallback((updatedProduct: Product) => {
    setProducts((current) => current.map((item) => item.slug === updatedProduct.slug ? updatedProduct : item));
    setOriginalProducts((current) => current.map((item) => item.slug === updatedProduct.slug ? updatedProduct : item));
    setPicker((current) => current && current.product.slug === updatedProduct.slug
      ? { ...current, product: updatedProduct }
      : current);
  }, []);

  const setSlotImage = async (product: Product, slotIndex: number, url: string) => {
    const images = [...product.images];
    images[slotIndex] = url;
    const updatedProduct = { ...product, images };
    applyLocalProductUpdate(updatedProduct);

    try {
      await persistProduct(updatedProduct);
      await refreshImageLibrary();
      showToast(`✓ 槽位 ${slotIndex + 1} 已更新`);
    } catch {
      await loadData();
      alert('保存图片失败');
    }
  };

  const handleSaveProduct = async (product: Product) => {
    try {
      const action = editModal?.mode === 'add' ? 'add' : 'update';
      const res = await fetch('/api/image-manager/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ action, product, slug: product.slug }),
      });
      const data = await res.json();
      if (data.error) { alert(data.error); return; }
      setProducts(data.products);
      setOriginalProducts(data.products);
      syncCollectionsFromProducts(data.products);
      setEditModal(null);
      showToast(editModal?.mode === 'add' ? '✓ 产品已添加' : '✓ 产品已保存');
    } catch { alert('保存失败'); }
  };

  const handleDeleteProduct = async (slug: string) => {
    if (!confirm(`确定删除产品 "${slug}"？`)) return;
    const res = await fetch('/api/image-manager/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
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
      const res = await fetch('/api/image-manager/sync', { method: 'POST', cache: 'no-store' });
      const data = await res.json();
      if (data.error) { alert('同步失败: ' + data.error); }
      else if (typeof data.added === 'number' && typeof data.updated === 'number' && typeof data.total === 'number') {
        showToast(`✓ 同步完成：${data.added} 新增，${data.updated} 更新，共 ${data.total} 个产品`);
        await loadData();
      } else {
        showToast(`✓ ${data.message || '同步完成'}`);
        await loadData();
      }
    } catch { alert('同步失败'); }
    finally { setSyncing(false); }
  };

  const handleOpenPublishPreview = async () => {
    setLoadingPublishPreview(true);
    try {
      const res = await fetch('/api/image-manager/publish', { cache: 'no-store' });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }
      if (!data.hasChanges) {
        showToast('没有可发布的本地变更');
        return;
      }
      setPublishPreview(data);
    } catch {
      alert('读取发布预览失败');
    } finally {
      setLoadingPublishPreview(false);
    }
  };

  const handlePublish = async () => {
    if (!publishPreview) return;
    setPublishing(true);
    try {
      const res = await fetch('/api/image-manager/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ commitMessage: publishPreview.commitMessage }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }
      setPublishPreview(null);
      showToast(`✓ 已推送 ${data.commitSha.slice(0, 7)}，Vercel 正在部署`);
      await fetchDeployStatus(data.commitSha);
      await loadData();
    } catch {
      alert('发布失败');
    } finally {
      setPublishing(false);
    }
  };

  const fetchDeployStatus = useCallback(async (commitSha: string) => {
    setDeployStatusLoading(true);
    try {
      const res = await fetch(`/api/image-manager/deploy-status?sha=${encodeURIComponent(commitSha)}`, { cache: 'no-store' });
      const data = await res.json();
      if (!data.error) {
        setDeployStatus(data);
      }
    } catch {
      // leave the previous status visible
    } finally {
      setDeployStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!deployStatus || deployStatus.state !== 'building') return;
    const timer = window.setTimeout(() => {
      void fetchDeployStatus(deployStatus.commitSha);
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [deployStatus, fetchDeployStatus]);

  const handleSaveGithubToken = async () => {
    setSavingConfig(true);
    try {
      const res = await fetch('/api/image-manager/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ githubToken: githubTokenInput }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }
      setConfig(data);
      setGithubTokenInput('');
      showToast('✓ GitHub Token 已保存');
    } catch {
      alert('保存 GitHub Token 失败');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTestGithubToken = async () => {
    setTestingConfig(true);
    try {
      const res = await fetch('/api/image-manager/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ action: 'test', githubToken: githubTokenInput }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }
      showToast(`✓ GitHub 已连接：${data.login || 'ok'}`);
    } catch {
      alert('测试 GitHub 连接失败');
    } finally {
      setTestingConfig(false);
    }
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
            <button onClick={() => void handleOpenPublishPreview()} disabled={loadingPublishPreview || syncing} style={{ background: loadingPublishPreview ? '#ccc' : '#111', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: loadingPublishPreview || syncing ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
              {loadingPublishPreview ? '读取发布预览...' : '📤 提交并发布'}
            </button>
            <button onClick={() => setEditModal({ product: { ...EMPTY_PRODUCT }, mode: 'add' })} style={{ background: '#4caf50', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
              ➕ 新增产品
            </button>
          </div>
        </div>

        <div style={{ background: '#fff3e0', border: '1px solid #ffcc80', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: '0.875rem' }}>
          <strong>操作说明：</strong>点击槽位选择图片 → 编辑产品信息 → <strong>🚀 同步到网站</strong>生成真实产品文件 → <strong>📤 提交并发布</strong>推到 GitHub / Vercel
        </div>

        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e0e0e0', padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#222', marginBottom: 6 }}>GitHub 配置</div>
          <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: 12 }}>
            {config?.repo ? `当前仓库：${config.repo}` : '当前仓库未识别'}
            {config?.hasGithubToken && config.githubTokenMask ? ` · 已保存 Token：${config.githubTokenMask}` : ' · 尚未保存 GitHub Token'}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              type="password"
              value={githubTokenInput}
              onChange={(e) => setGithubTokenInput(e.target.value)}
              placeholder="输入 GitHub Personal Access Token"
              style={{ flex: 1, minWidth: 260, padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: '0.84rem' }}
            />
            <button onClick={() => void handleSaveGithubToken()} disabled={savingConfig} style={{ background: savingConfig ? '#ccc' : '#1565c0', color: 'white', border: 'none', padding: '10px 16px', borderRadius: 8, cursor: savingConfig ? 'not-allowed' : 'pointer', fontSize: '0.82rem', fontWeight: 700 }}>
              {savingConfig ? '保存中...' : '保存 Token'}
            </button>
            <button onClick={() => void handleTestGithubToken()} disabled={testingConfig} style={{ background: testingConfig ? '#ccc' : '#455a64', color: 'white', border: 'none', padding: '10px 16px', borderRadius: 8, cursor: testingConfig ? 'not-allowed' : 'pointer', fontSize: '0.82rem', fontWeight: 700 }}>
              {testingConfig ? '测试中...' : '测试 GitHub 连接'}
            </button>
          </div>
        </div>

        <DeploymentStatusPanel
          status={deployStatus}
          loading={deployStatusLoading}
          onRefresh={() => { if (deployStatus) void fetchDeployStatus(deployStatus.commitSha); }}
        />

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
                  <SlotPreview
                    src={product.images[0]}
                    alt={product.name}
                    seed={`${product.slug}-hero`}
                    emptyLabel="空"
                  />
                  <div style={{ position: 'absolute', top: 6, left: 6, background: '#4caf50', color: 'white', fontSize: '0.6rem', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>MAIN</div>
                </div>

                <div style={{ padding: 10 }}>
                  <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: 8, fontWeight: 600 }}>点击槽位选择/替换图片</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4 }}>
                    {Array.from({ length: TOTAL_SLOTS }).map((_, slotIndex) => {
                      const img = product.images[slotIndex];
                      return (
                        <div key={slotIndex} onClick={() => imageData && setPicker({ product, slotIndex })} style={{ cursor: 'pointer', borderRadius: 6, overflow: 'hidden', aspectRatio: '1', position: 'relative', border: slotIndex === 0 ? '2px solid #4caf50' : '2px solid #e0e0e0', background: '#f5f5f5', transition: 'all 0.15s' }} title={`Slot ${slotIndex + 1}${img ? ': ' + img.split('/').pop() : ''}`}>
                          <SlotPreview
                            src={img}
                            alt=""
                            seed={`${product.slug}-${slotIndex}`}
                            emptyLabel="+"
                          />
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
        <ImagePickerModal
          product={picker.product}
          slotIndex={picker.slotIndex}
          imageData={imageData}
          onSelect={(url) => { void setSlotImage(picker.product, picker.slotIndex, url); }}
          onUpload={async (url) => {
            await setSlotImage(picker.product, picker.slotIndex, url);
            await loadData();
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
        />
      )}

      {editModal && (
        <EditProductModal product={editModal.product} mode={editModal.mode} allCollections={allCollections} onSave={handleSaveProduct} onClose={() => setEditModal(null)} />
      )}

      {publishPreview && (
        <PublishModal
          preview={publishPreview}
          publishing={publishing}
          onConfirm={() => void handlePublish()}
          onClose={() => setPublishPreview(null)}
        />
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#333', color: 'white', padding: '12px 24px', borderRadius: 8, fontSize: '0.875rem', opacity: 1, transition: 'opacity 0.3s', zIndex: 99999 }}>
          {toast}
        </div>
      )}
    </div>
  );
}
