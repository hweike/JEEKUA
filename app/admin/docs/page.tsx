'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { FilePlus, Save, RotateCcw, FolderOpen } from 'lucide-react';
import pinyin from 'pinyin';
import DocsTreeAdmin from '@/components/DocsTreeAdmin';
import LanguageSelector from '@/components/common/LanguageSelector';
import SeoFields from '@/components/common/SeoFields';
import { generateSeoTitle, generateSeoDescription } from '@/lib/products/seoGenerator';
import { useToast } from '@/contexts/ToastContext';
import ResourceAssociation from '@/components/admin/products/ResourceAssociation';

const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), { ssr: false });

// 生成 URL slug
function generateSlug(text: string): string {
  if (!text) return '';
  const pinyinArray = pinyin(text, { style: pinyin.STYLE_NORMAL, heteronym: false });
  const pinyinStr = pinyinArray.map(item => item[0]).join(' ');
  let slug = pinyinStr.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (!slug) {
    slug = text.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  return slug;
}

interface DocsLib {
  id: string;
  name: string;
}

export default function DocsAdmin() {
  const searchParams = useSearchParams();
  const [locale, setLocale] = useState(searchParams.get('locale') || 'zh');
  const [docsLibs, setDocsLibs] = useState<DocsLib[]>([]);
  const [currentLibId, setCurrentLibId] = useState('');
  const [tree, setTree] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [docData, setDocData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [isSlugAuto, setIsSlugAuto] = useState(true);
  const { showToast } = useToast();

  const loadLibs = async () => {
    const res = await fetch(`/api/admin/docs-libs?locale=${locale}`);
    const data = await res.json();
    setDocsLibs(data);
    if (data.length > 0 && !currentLibId) setCurrentLibId(data[0].id);
    else if (data.length === 0) setCurrentLibId('');
  };

  const loadTree = async () => {
    if (!currentLibId) return;
    try {
      const res = await fetch(`/api/admin/docs/tree?locale=${locale}&docsLibId=${currentLibId}`);
      const data = await res.json();
      setTree(data);
    } catch (err) {
      showToast('加载文档树失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadDocument = async (docId: string) => {
    if (!currentLibId) return;
    setLoadingDoc(true);
    setDocData(null);
    try {
      const res = await fetch(`/api/admin/docs?locale=${locale}&docsLibId=${currentLibId}&id=${docId}`);
      const data = await res.json();
      setDocData({
        id: data.id,
        title: data.title ?? '',
        slug: data.slug ?? '',
        parentId: data.parentId === null || data.parentId === '' ? null : data.parentId,
        order: data.order ?? 0,
        content: data.content ?? '',
        seo_keywords: data.seo_keywords ?? '',
        seo_title: data.seo_title ?? '',
        seo_description: data.seo_description ?? '',
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
      setIsSlugAuto(!data.slug);
    } catch (err) {
      showToast('加载文档失败', 'error');
    } finally {
      setLoadingDoc(false);
    }
  };

  useEffect(() => { loadLibs(); }, [locale]);
  useEffect(() => {
    if (currentLibId) {
      loadTree();
      setSelectedId(null);
      setDocData(null);
    }
  }, [currentLibId, locale]);
  useEffect(() => {
    if (selectedId) loadDocument(selectedId);
    else setDocData(null);
  }, [selectedId]);

  const handleSeoChange = (seoData: any) => {
    setDocData((prev: any) => ({
      ...prev,
      slug: seoData.slug ?? prev.slug,
      seo_keywords: seoData.seoKeywords ?? prev.seo_keywords,
      seo_title: seoData.seoTitle ?? prev.seo_title,
      seo_description: seoData.seoDescription ?? prev.seo_description,
    }));
    if (seoData.slug !== undefined) setIsSlugAuto(false);
  };

  const handleTitleChange = (title: string) => {
    if (!docData) return;
    let newSlug = docData.slug;
    if (isSlugAuto) {
      newSlug = generateSlug(title);
    }
    setDocData({ ...docData, title, slug: newSlug });
  };

  const handleAutoGenerate = () => {
    if (!docData) return;
    const title = docData.title || '';
    let newSlug = docData.slug;
    if (!newSlug) {
      newSlug = generateSlug(title);
      handleSeoChange({ slug: newSlug });
    }
    let seoTitle = docData.seo_title;
    if (!seoTitle) {
      seoTitle = generateSeoTitle(title, '', 1, '', '');
      handleSeoChange({ seoTitle });
    }
    let seoDescription = docData.seo_description;
    if (!seoDescription) {
      // 调用 generateSeoDescription，传入文档内容（字符串）、空价格阶梯、空规格、模板和货币
      // 注意：generateSeoDescription 的第一个参数是 descriptionHtml: string | undefined
      const generatedDesc = generateSeoDescription(docData.content, [], undefined, '', '');
      if (generatedDesc) {
        seoDescription = generatedDesc;
        handleSeoChange({ seoDescription });
      }
    }
    showToast('已自动生成 SEO 信息', 'info');
  };

  const handleSave = async () => {
    if (!docData || !docData.title) {
      showToast('请填写标题', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/docs/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale,
          docsLibId: currentLibId,
          data: {
            ...docData,
            parentId: docData.parentId === null ? null : docData.parentId,
          },
          content: docData.content,
        }),
      });
      if (!res.ok) throw new Error();
      const result = await res.json();
      showToast('保存成功', 'success');
      await loadTree();
      setSelectedId(result.doc.id);
    } catch (err) {
      showToast('保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const resetDocData = async () => {
    if (selectedId) await loadDocument(selectedId);
    showToast('已重置', 'info');
  };

  const createNewDoc = async (parentId?: string) => {
    if (!currentLibId) {
      showToast('请先选择一个文档库', 'error');
      return;
    }
    setSaving(true);
    try {
      const blankDoc = {
        title: '未命名文档',
        slug: '',
        parentId: parentId || null,
        order: 0,
        content: '',
        seo_keywords: '',
        seo_title: '',
        seo_description: '',
      };
      const res = await fetch('/api/admin/docs/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale, docsLibId: currentLibId, data: blankDoc, content: '' }),
      });
      if (!res.ok) throw new Error();
      const result = await res.json();
      await loadTree();
      setSelectedId(result.doc.id);
      setIsSlugAuto(true);
    } catch (err) {
      showToast('创建失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该文档及其下级文档吗？')) return;
    const res = await fetch(`/api/admin/docs?locale=${locale}&docsLibId=${currentLibId}&id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      await loadTree();
      if (selectedId === id) setSelectedId(null);
    } else {
      showToast('删除失败', 'error');
    }
  };

  const handleTreeChange = async (newTree: any[]) => {
    const flatten = (nodes: any[], parentId: string | null = null): any[] => {
      let result: any[] = [];
      nodes.forEach((node, idx) => {
        result.push({ id: node.id, parentId, order: idx });
        if (node.children?.length) result = result.concat(flatten(node.children, node.id));
      });
      return result;
    };
    const updates = flatten(newTree);
    const res = await fetch('/api/admin/docs/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale, docsLibId: currentLibId, items: updates }),
    });
    if (res.ok) {
      await loadTree();
    } else {
      showToast('保存排序失败', 'error');
    }
  };

  const handleReorder = async (id: string, direction: 'up' | 'down') => {
    const res = await fetch('/api/admin/docs/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale, docsLibId: currentLibId, id, direction }),
    });
    if (res.ok) await loadTree();
    else showToast('排序失败', 'error');
  };

  if (loading && currentLibId) return <div className="p-6">加载中...</div>;

  return (
    <div className="flex h-full min-h-screen pb-20">
      {/* 左侧文档树 */}
      <div className="w-80 border-r border-gray-200 bg-white overflow-auto">
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">文档管理</h2>
            <LanguageSelector currentLocale={locale} onLocaleChange={setLocale} displayMode="zh" />
          </div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-gray-600">当前</span>
            <select
              value={currentLibId}
              onChange={(e) => setCurrentLibId(e.target.value)}
              className="bg-transparent border-0 p-0 text-sm font-medium text-gray-800 focus:outline-none focus:ring-0 cursor-pointer"
              disabled={docsLibs.length === 0}
            >
              {docsLibs.map(lib => (
                <option key={lib.id} value={lib.id}>{lib.name}</option>
              ))}
            </select>
          </div>
          {currentLibId && (
            <>
              <div className="flex justify-between items-center mt-4 mb-2">
                <h3 className="text-md font-medium">文档目录</h3>
                <button onClick={() => createNewDoc()} className="bg-green-600 text-white px-2 py-1 rounded text-sm flex items-center gap-1">
                  <FilePlus size={14} /> 新建
                </button>
              </div>
              <DocsTreeAdmin
                tree={tree}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onNewChild={(parentId) => createNewDoc(parentId)}
                onDelete={handleDelete}
                onReorder={handleReorder}
                onTreeChange={handleTreeChange}
              />
            </>
          )}
          {!currentLibId && docsLibs.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              <FolderOpen className="mx-auto mb-2" size={32} />
              <p>暂无文档库，请先前往</p>
              <a href="/admin/docs/docs-libs" className="text-blue-600 hover:underline">文档库管理</a>
              <p>创建文档库</p>
            </div>
          )}
        </div>
      </div>

      {/* 右侧编辑区 */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto">
          {loadingDoc && <div className="text-center py-20">加载中...</div>}
          {!loadingDoc && docData && (
            <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-6">
              {/* 基本信息卡片 */}
              <div className="border rounded-lg p-4 shadow-sm bg-white">
                <h3 className="font-medium text-lg mb-3">基本信息</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block font-medium mb-1">标题 *</label>
                    <input
                      type="text"
                      value={docData.title}
                      onChange={e => handleTitleChange(e.target.value)}
                      className="w-full border rounded p-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">内容</label>
                    <RichTextEditor
                      value={docData.content ?? ''}
                      onChange={val => setDocData({ ...docData, content: val })}
                    />
                  </div>
                </div>
              </div>

              {/* 相关商品卡片 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">相关商品</h2>
                {docData.id ? (
                  <ResourceAssociation
                    resourceType="document"
                    resourceId={docData.id}
                    locale={locale}
                  />
                ) : (
                  <div className="text-gray-400 text-sm text-center py-4 border border-dashed rounded">
                    保存文档后即可关联商品
                  </div>
                )}
              </div>

              {/* SEO 设置卡片 */}
              <div className="border rounded-lg p-4 shadow-sm bg-white">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-lg font-semibold">搜索引擎优化</h2>
                  <button type="button" onClick={handleAutoGenerate} className="text-blue-600 text-sm">
                    自动生成 SEO
                  </button>
                </div>
                <SeoFields
                  slug={docData.slug}
                  seoKeywords={docData.seo_keywords}
                  seoTitle={docData.seo_title}
                  seoDescription={docData.seo_description}
                  onChange={handleSeoChange}
                  autoGenerateFrom={docData.title}
                  showSlug
                  showKeywords
                  showTitle
                  showDescription
                  disabled={false}
                />
              </div>
            </form>
          )}
          {!loadingDoc && !docData && selectedId === null && currentLibId && (
            <div className="text-center text-gray-400 py-20">
              <FolderOpen size={48} className="mx-auto mb-4 opacity-50" />
              <p>请从左侧文档树选择要编辑的文档</p>
            </div>
          )}
        </div>
      </div>

      {/* 悬浮按钮条 */}
      {docData && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 flex justify-end gap-4 z-50">
          <button
            type="button"
            onClick={resetDocData}
            className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded transition"
          >
            重置
          </button>
          <button
            type="submit"
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded disabled:opacity-50 transition"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      )}
    </div>
  );
}