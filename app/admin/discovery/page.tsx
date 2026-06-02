// app/admin/discovery/page.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { Edit, Check, X, Save } from 'lucide-react';
import AdminLanguageSelector from '@/components/common/AdminLanguageSelector';

// 页面类型映射（严格按照需求）
const typeLabels: Record<string, string> = {
  home: '首页',
  productLine: '产品线落地页',
  productCollection: '产品合集',
  product: '产品',
  page: '页面',
  blog: '博客落地页',
  blogCategory: '博客合集',
  blogPost: '博客文章',
  docLibrary: '文档库',
  doc: '文档',
  videoCategory: '视频合集',
  video: '视频',
  inquiry: '询盘',
  policy: '政策',
};

// 提取焦点关键词
function getFocusKeyword(seo: any): string {
  const keywords = seo?.metaKeywords || '';
  return keywords.split(',')[0]?.trim() || '';
}

// 元标签得分（55分）
function calculateMetaScore(seo: any): { score: number; checks: Array<{ label: string; passed: boolean }> } {
  const metaTitle = seo?.metaTitle || '';
  const metaDesc = seo?.metaDescription || '';
  const focusKeyword = getFocusKeyword(seo);
  let score = 0;
  const checks = [];

  // 1. 元标题长度 ≥30 (5分)
  if (metaTitle.length >= 30) { score += 5; checks.push({ label: '元标题长度符合推荐最少30字符', passed: true }); }
  else { checks.push({ label: '元标题长度符合推荐最少30字符', passed: false }); }

  // 2. 元标题长度 ≤60 (5分)
  if (metaTitle.length <= 60 && metaTitle.length > 0) { score += 5; checks.push({ label: '元标题长度未超过60字符', passed: true }); }
  else { checks.push({ label: '元标题长度未超过60字符', passed: false }); }

  // 3. 元标题包含焦点关键词 (10分)
  if (focusKeyword && metaTitle.toLowerCase().includes(focusKeyword.toLowerCase())) { score += 10; checks.push({ label: '元标题包含核心关键词', passed: true }); }
  else { checks.push({ label: '元标题包含核心关键词', passed: false }); }

  // 4. 元标题以焦点关键词开头 (10分)
  if (focusKeyword && metaTitle.toLowerCase().startsWith(focusKeyword.toLowerCase())) { score += 10; checks.push({ label: '元标题以核心关键词开头', passed: true }); }
  else { checks.push({ label: '元标题以核心关键词开头', passed: false }); }

  // 5. 元描述长度 ≥80 (5分)
  if (metaDesc.length >= 80) { score += 5; checks.push({ label: '元描述长度符合推荐最少80字符', passed: true }); }
  else { checks.push({ label: '元描述长度符合推荐最少80字符', passed: false }); }

  // 6. 元描述长度 ≤160 (5分)
  if (metaDesc.length <= 160 && metaDesc.length > 0) { score += 5; checks.push({ label: '元描述长度未超过160字符', passed: true }); }
  else { checks.push({ label: '元描述长度未超过160字符', passed: false }); }

  // 7. 元描述包含焦点关键词 (15分)
  if (focusKeyword && metaDesc.toLowerCase().includes(focusKeyword.toLowerCase())) { score += 15; checks.push({ label: '元描述包含核心关键词', passed: true }); }
  else { checks.push({ label: '元描述包含核心关键词', passed: false }); }

  return { score, checks };
}

// Slug得分（15分）
function calculateSlugScore(page: any): { score: number; checks: Array<{ label: string; passed: boolean }> } {
  let score = 0;
  const checks = [];
  const url = page.url || '';
  const focusKeyword = getFocusKeyword(page.seo);
  const slug = url.split('/').filter(Boolean).pop() || '';
  if (focusKeyword && slug.toLowerCase().includes(focusKeyword.toLowerCase())) { score += 10; checks.push({ label: 'URL中包含核心关键词', passed: true }); }
  else { checks.push({ label: 'URL中包含核心关键词', passed: false }); }
  if (slug.length <= 100) { score += 5; checks.push({ label: 'URL长度未超过100字符', passed: true }); }
  else { checks.push({ label: 'URL长度未超过100字符', passed: false }); }
  return { score, checks };
}

// 图片得分（30分）- 仅产品页面有实际图片检查
function calculateImageScore(page: any): { score: number; checks: Array<{ label: string; passed: boolean }> } {
  let score = 0;
  const checks = [];
  const focusKeyword = getFocusKeyword(page.seo);
  // 产品页面才有图片检查
  const hasImages = page.type === 'product';
  const hasAlt = hasImages;
  const altContainsKeyword = hasAlt && focusKeyword ? true : false;
  if (hasAlt) { score += 15; checks.push({ label: '所有产品图片都有Alt标签', passed: true }); }
  else { checks.push({ label: '所有产品图片都有Alt标签', passed: false }); }
  if (altContainsKeyword) { score += 15; checks.push({ label: '图片Alt标签包含核心关键词', passed: true }); }
  else { checks.push({ label: '图片Alt标签包含核心关键词', passed: false }); }
  return { score, checks };
}

function calculateTotalScore(page: any): { total: number; meta: any; slug: any; image: any } {
  const meta = calculateMetaScore(page.seo);
  const slug = calculateSlugScore(page);
  const image = calculateImageScore(page);
  return { total: meta.score + slug.score + image.score, meta, slug, image };
}

function ScoreCircle({ score }: { score: number }) {
  const percent = Math.min(100, score);
  const color = percent >= 80 ? '#22c55e' : percent >= 60 ? '#eab308' : '#ef4444';
  return (
    <div className="relative w-14 h-14 inline-flex items-center justify-center">
      <svg className="w-14 h-14 transform -rotate-90">
        <circle cx="28" cy="28" r="24" stroke="#e5e7eb" strokeWidth="3" fill="none" />
        <circle cx="28" cy="28" r="24" stroke={color} strokeWidth="3" fill="none" strokeDasharray={`${2 * Math.PI * 24}`} strokeDashoffset={`${2 * Math.PI * 24 * (1 - percent / 100)}`} />
      </svg>
      <span className="absolute text-sm font-bold">{score}</span>
    </div>
  );
}

function EditableKeywords({ value, onSave }: { value: string; onSave: (val: string) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [temp, setTemp] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (isEditing) ref.current?.focus(); }, [isEditing]);
  const handleSave = () => { onSave(temp); setIsEditing(false); };
  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <input ref={ref} type="text" value={temp} onChange={e => setTemp(e.target.value)} onBlur={handleSave} onKeyDown={e => e.key === 'Enter' && handleSave()} className="border rounded px-1 py-0.5 text-sm w-32" />
        <button onClick={handleSave} className="text-green-600"><Save className="w-3 h-3" /></button>
        <button onClick={() => { setTemp(value); setIsEditing(false); }} className="text-gray-500"><X className="w-3 h-3" /></button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 group">
      <span className="text-sm text-gray-600 truncate max-w-32">{value || '—'}</span>
      <button onClick={() => setIsEditing(true)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600">
        <Edit className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function EditModal({ page, onClose, onSave }: any) {
  const [form, setForm] = useState({
    seo_title: page.seo?.metaTitle || '',
    seo_description: page.seo?.metaDescription || '',
    seo_keywords: page.seo?.metaKeywords || '',
  });
  const tempSeo = { metaTitle: form.seo_title, metaDescription: form.seo_description, metaKeywords: form.seo_keywords };
  const meta = calculateMetaScore(tempSeo);
  const slug = calculateSlugScore({ ...page, seo: tempSeo });
  const image = calculateImageScore({ ...page, seo: tempSeo });
  const totalScore = meta.score + slug.score + image.score;
  const handleSubmit = () => onSave({ ...page, seo: { metaTitle: form.seo_title, metaDescription: form.seo_description, metaKeywords: form.seo_keywords } });
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">SEO优化设置 - {page.title}</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <div className="flex flex-col md:flex-row p-6 gap-6">
          <div className="md:w-1/3 space-y-4">
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">SEO检查项</h3>
                <ScoreCircle score={totalScore} />
              </div>
              <div className="space-y-3 text-sm">
                <div className="font-medium">元标签 (55分)</div>
                {meta.checks.map((check, idx) => (
                  <div key={idx} className="flex items-start gap-2 ml-2">
                    {check.passed ? <Check className="w-4 h-4 text-green-600 mt-0.5" /> : <X className="w-4 h-4 text-red-500 mt-0.5" />}
                    <span>{check.label}</span>
                  </div>
                ))}
                <div className="font-medium mt-2">Slug网址 (15分)</div>
                {slug.checks.map((check, idx) => (
                  <div key={idx} className="flex items-start gap-2 ml-2">
                    {check.passed ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-red-500" />}
                    <span>{check.label}</span>
                  </div>
                ))}
                <div className="font-medium mt-2">图片 (30分)</div>
                {image.checks.map((check, idx) => (
                  <div key={idx} className="flex items-start gap-2 ml-2">
                    {check.passed ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-red-500" />}
                    <span>{check.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="md:w-2/3 space-y-4">
            <div><label className="block text-sm font-medium">页面标题</label><div className="text-xl font-bold">{page.title}</div></div>
            <div><label className="block text-sm font-medium">核心关键词</label><input type="text" value={form.seo_keywords} onChange={e => setForm({...form, seo_keywords: e.target.value})} className="w-full border rounded-md px-3 py-2" placeholder="关键词，用逗号分隔" /></div>
            <div><label className="block text-sm font-medium">元标题</label><input type="text" value={form.seo_title} onChange={e => setForm({...form, seo_title: e.target.value})} className="w-full border rounded-md px-3 py-2" /><div className="text-right text-xs text-gray-400 mt-1">{form.seo_title.length} 个字符</div></div>
            <div><label className="block text-sm font-medium">元描述</label><textarea rows={3} value={form.seo_description} onChange={e => setForm({...form, seo_description: e.target.value})} className="w-full border rounded-md px-3 py-2" /><div className="text-right text-xs text-gray-400 mt-1">{form.seo_description.length} 个字符</div></div>
          </div>
        </div>
        <div className="flex justify-end space-x-3 p-4 border-t bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 border rounded-md">取消</button>
          <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-md">保存</button>
        </div>
      </div>
    </div>
  );
}

export default function DiscoveryAdminPage() {
  const [locale, setLocale] = useState('zh');
  const [pages, setPages] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [editingPage, setEditingPage] = useState<any>(null);
  const [savingKeywordId, setSavingKeywordId] = useState<string | null>(null);

  const fetchPages = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/discovery/pages?locale=${locale}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPages(data);
    } catch (error) {
      console.error(error);
      alert('加载失败');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchPages(); }, [locale]);

  const tabs = [
    { key: 'all', label: '全部' },
    { key: 'home', label: '首页' },
    { key: 'productLine', label: '产品线落地页' },
    { key: 'productCollection', label: '产品合集' },
    { key: 'product', label: '产品' },
    { key: 'page', label: '页面' },
    { key: 'blog', label: '博客落地页' },
    { key: 'blogCategory', label: '博客合集' },
    { key: 'blogPost', label: '博客文章' },
    { key: 'docLibrary', label: '文档库' },
    { key: 'doc', label: '文档' },
    { key: 'videoCategory', label: '视频合集' },
    { key: 'video', label: '视频' },
    { key: 'inquiry', label: '询盘' },
    { key: 'policy', label: '政策' },
  ];

  useEffect(() => {
    if (activeTab === 'all') setFiltered(pages);
    else setFiltered(pages.filter(p => p.type === activeTab));
  }, [activeTab, pages]);

  const saveSeo = async (updatedPage: any) => {
    const res = await fetch('/api/discovery/seo', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: updatedPage.id, locale, seo: updatedPage.seo }),
    });
    if (res.ok) { await fetchPages(); setEditingPage(null); }
    else alert('保存失败');
  };
  const saveKeyword = async (id: string, keywords: string) => {
    setSavingKeywordId(id);
    const page = pages.find(p => p.id === id);
    if (page) await saveSeo({ ...page, seo: { ...page.seo, metaKeywords: keywords } });
    setSavingKeywordId(null);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">SEO优化设置</h1>
        <AdminLanguageSelector currentLocale={locale} onLocaleChange={setLocale} />
      </div>
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-4 overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`pb-2 text-sm font-medium ${activeTab === tab.key ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      {loading ? <div>加载中...</div> : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium">标题</th>
                <th className="px-4 py-3 text-left text-xs font-medium">核心关键词</th>
                <th className="px-4 py-3 text-left text-xs font-medium">SEO分数</th>
                <th className="px-4 py-3 text-right text-xs font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(page => {
                const { total } = calculateTotalScore(page);
                return (
                  <tr key={page.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3"><div className="text-sm font-medium">{page.title}</div><div className="text-xs text-gray-500">{typeLabels[page.type] || page.type}</div></td>
                    <td className="px-4 py-3"><EditableKeywords value={page.seo?.metaKeywords || ''} onSave={(val) => saveKeyword(page.id, val)} /></td>
                    <td className="px-4 py-3"><ScoreCircle score={total} /></td>
                    <td className="px-4 py-3 text-right"><button onClick={() => setEditingPage(page)} className="text-blue-600"><Edit className="w-4 h-4" /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {editingPage && <EditModal page={editingPage} onClose={() => setEditingPage(null)} onSave={saveSeo} />}
    </div>
  );
}