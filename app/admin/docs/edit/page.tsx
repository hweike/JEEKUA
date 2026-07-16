'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Save } from 'lucide-react';
import pinyin from 'pinyin';
import SeoFields from '@/components/common/SeoFields';
import { generateSeoTitle, generateSeoDescription } from '@/lib/products/seoGenerator';
import { useToast } from '@/contexts/ToastContext';
import ResourceAssociation from '@/components/admin/products/ResourceAssociation';
import { getLanguageDisplayName } from '@/lib/languages/config';

const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), { ssr: false });

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

export default function DocsEditPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const locale = searchParams.get('locale') || 'zh';
  const docsLibId = searchParams.get('docsLibId');
  const id = searchParams.get('id');
  const parentIdFromUrl = searchParams.get('parentId') || null; // 获取父文档 ID

  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [docData, setDocData] = useState<any>({
    id: id || '',
    title: '',
    slug: '',
    parentId: parentIdFromUrl, // 初始化时传入，但会被后续加载覆盖
    order: 0,
    content: '',
    seo_keywords: '',
    seo_title: '',
    seo_description: '',
  });
  const [isSlugAuto, setIsSlugAuto] = useState(true);
  const [docsLibName, setDocsLibName] = useState<string>('');

  // 加载文档库名称
  useEffect(() => {
    if (docsLibId) {
      fetch(`/api/admin/docs-libs?locale=zh`)
        .then(res => res.json())
        .then(data => {
          const lib = data.find((l: any) => l.id === docsLibId);
          if (lib) setDocsLibName(lib.name);
          else setDocsLibName(docsLibId);
        })
        .catch(() => setDocsLibName(docsLibId));
    }
  }, [docsLibId]);

  // 加载文档（编辑模式）
  useEffect(() => {
    if (id && docsLibId) {
      fetch(`/api/admin/docs?locale=${locale}&docsLibId=${docsLibId}&id=${id}`)
        .then(res => {
          if (res.status === 404) {
            // 文档不存在，视为新建（保留 id，并应用 parentId）
            setDocData(prev => ({
              ...prev,
              id: id,
              title: '',
              slug: '',
              parentId: parentIdFromUrl, // 使用 URL 中的 parentId
              order: 0,
              content: '',
              seo_keywords: '',
              seo_title: '',
              seo_description: '',
            }));
            setIsSlugAuto(true);
            setLoading(false);
            return null;
          }
          if (!res.ok) throw new Error('加载失败');
          return res.json();
        })
        .then(data => {
          if (data) {
            setDocData({
              id: data.id,
              title: data.title || '',
              slug: data.slug || '',
              parentId: data.parentId === null || data.parentId === '' ? null : data.parentId,
              order: data.order ?? 0,
              content: data.content || '',
              seo_keywords: data.seo_keywords || '',
              seo_title: data.seo_title || '',
              seo_description: data.seo_description || '',
            });
            setIsSlugAuto(!data.slug);
          }
        })
        .catch(err => {
          showToast('加载文档失败', 'error');
        })
        .finally(() => setLoading(false));
    } else {
      // 新建模式：初始化空白数据，使用 URL 中的 parentId
      setDocData(prev => ({
        ...prev,
        id: '',
        title: '',
        slug: '',
        parentId: parentIdFromUrl,
        order: 0,
        content: '',
        seo_keywords: '',
        seo_title: '',
        seo_description: '',
      }));
      setLoading(false);
    }
  }, [id, docsLibId, locale, showToast, parentIdFromUrl]);

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
    if (!docsLibId) {
      showToast('缺少文档库 ID', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/docs/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale,
          docsLibId,
          data: {
            ...docData,
            parentId: docData.parentId === null ? null : docData.parentId,
          },
          content: docData.content,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '保存失败');
      }
      const result = await res.json();
      showToast('保存成功', 'success');
      router.push(`/admin/docs?locale=${locale}&docsLibId=${docsLibId}`);
    } catch (err: any) {
      showToast(err.message || '保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-center">加载中...</div>;

  const siteDisplay = getLanguageDisplayName(locale, 'zh') || locale.toUpperCase();
  const pageTitle = id ? '编辑文档' : '新建文档';

  return (
    <div className="p-6 max-w-4xl mx-auto pb-24">
      {/* 头部 */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/admin/docs?locale=${locale}&docsLibId=${docsLibId}`)}
            className="text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold">{pageTitle}</h1>
        </div>
      </div>

      {/* 信息卡片 */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 flex flex-wrap gap-6">
        <div>
          <span className="text-sm text-gray-500">当前站点：</span>
          <span className="font-medium">{siteDisplay} ({locale})</span>
        </div>
        <div>
          <span className="text-sm text-gray-500">当前文档库：</span>
          <span className="font-medium">{docsLibName || docsLibId}</span>
        </div>
        {docData.parentId && (
          <div>
            <span className="text-sm text-gray-500">父文档 ID：</span>
            <span className="font-medium">{docData.parentId}</span>
          </div>
        )}
      </div>

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

      {/* 悬浮按钮条 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 flex justify-end gap-4 z-50">
        <button
          type="button"
          onClick={() => router.push(`/admin/docs?locale=${locale}&docsLibId=${docsLibId}`)}
          className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded transition"
        >
          取消
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
    </div>
  );
}