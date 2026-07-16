'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SeoFields from '@/components/common/SeoFields';
import { TemplateSelector } from '@/components/webbuilder/TemplateSelector';
import Toast from '@/components/Toast';

interface CategoryFormProps {
  mode: 'new' | 'edit';
  locale: string;
  initialKey?: string;
  initialData?: {
    name: string;
    slug: string;
    order: number;
    seo_keywords?: string;
    seo_title?: string;
    seo_description?: string;
    commentStatus?: 'disabled' | 'pending' | 'allowed';
    template?: string;
  };
}

export default function CategoryForm({
  mode,
  locale,
  initialKey,
  initialData,
}: CategoryFormProps) {
  const router = useRouter();

  // key 不显示在 UI 上，但作为隐藏状态
  const [key] = useState(() => {
    if (initialKey) return initialKey; // 新建其他语言版本时固定 key
    if (mode === 'edit' && initialKey) return initialKey; // 编辑时使用 URL 中的 key
    return Math.floor(10000000 + Math.random() * 90000000).toString(); // 全新创建时自动生成
  });

  const [name, setName] = useState(initialData?.name || '');
  const [order, setOrder] = useState<number>(initialData?.order ?? 0);
  const [commentStatus, setCommentStatus] = useState<'disabled' | 'pending' | 'allowed'>(
    initialData?.commentStatus || 'allowed'
  );
  const [template, setTemplate] = useState(initialData?.template || '');

  const [slug, setSlug] = useState(initialData?.slug || '');
  const [seoKeywords, setSeoKeywords] = useState(initialData?.seo_keywords || '');
  const [seoTitle, setSeoTitle] = useState(initialData?.seo_title || '');
  const [seoDescription, setSeoDescription] = useState(initialData?.seo_description || '');

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // 新建时自动计算 order
  useEffect(() => {
    if (mode === 'new' && !initialData) {
      const fetchOrder = async () => {
        const res = await fetch(`/api/admin/videosys-categories?locale=${locale}`);
        const data = await res.json();
        const count = Object.keys(data).length;
        setOrder(count + 1);
      };
      fetchOrder();
    }
  }, [locale, mode, initialData]);

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!name.trim()) newErrors.name = '分类名称不能为空';
    if (!slug.trim()) newErrors.slug = 'URL Slug 不能为空';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);

    const category = {
      name: name.trim(),
      slug: slug.trim(),
      order: order,
      commentStatus,
      template,
      seo_keywords: seoKeywords.trim() || '',
      seo_title: seoTitle.trim() || '',
      seo_description: seoDescription.trim() || '',
    };

    try {
      const res = await fetch('/api/admin/videosys-categories', {
        method: 'POST', // 统一使用 POST（支持 Upsert）
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale, key, category }),
      });

      const data = await res.json();
      if (res.ok) {
        setToast({ message: mode === 'edit' ? '更新成功' : '创建成功', type: 'success' });
        router.push(`/admin/videosys/categories?locale=${locale}`);
      } else {
        setToast({ message: data.error || '保存失败', type: 'error' });
      }
    } catch (error) {
      setToast({ message: '网络错误', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSeoChange = (seoData: any) => {
    if (seoData.slug !== undefined) setSlug(seoData.slug);
    if (seoData.seoKeywords !== undefined) setSeoKeywords(seoData.seoKeywords);
    if (seoData.seoTitle !== undefined) setSeoTitle(seoData.seoTitle);
    if (seoData.seoDescription !== undefined) setSeoDescription(seoData.seoDescription);
  };

  const title = mode === 'new' ? `新建视频分类 (站点: ${locale})` : `编辑视频分类 (站点: ${locale})`;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="flex gap-3">
          <Link href={`/admin/videosys/categories?locale=${locale}`} className="px-4 py-2 border rounded hover:bg-gray-50">
            返回分类列表
          </Link>
          <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="flex gap-6">
          <div className="w-2/3 space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">基本信息</h2>
              <div className="space-y-4">
                {/* 分类标识 (Key) 已隐藏，但仍在状态中 */}
                <div>
                  <label className="block text-sm font-medium">分类名称 *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border p-2 rounded"
                    required
                    autoFocus
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium">排序</label>
                  <input
                    type="number"
                    value={order}
                    onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
                    className="w-full border p-2 rounded"
                  />
                  <p className="text-xs text-gray-500 mt-1">数字越小，分类在列表中显示越靠前</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">搜索引擎优化</h2>
              <SeoFields
                slug={slug}
                seoKeywords={seoKeywords}
                seoTitle={seoTitle}
                seoDescription={seoDescription}
                onChange={handleSeoChange}
                autoGenerateFrom={name}
                showSlug
                showKeywords
                showTitle
                showDescription
              />
              {errors.slug && <p className="text-red-500 text-xs mt-1">{errors.slug}</p>}
            </div>
          </div>

          <div className="w-1/3 space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">评论设置</h2>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="commentStatus"
                    value="disabled"
                    checked={commentStatus === 'disabled'}
                    onChange={() => setCommentStatus('disabled')}
                  />
                  <span>禁用</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="commentStatus"
                    value="pending"
                    checked={commentStatus === 'pending'}
                    onChange={() => setCommentStatus('pending')}
                  />
                  <span>允许但待审核</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="commentStatus"
                    value="allowed"
                    checked={commentStatus === 'allowed'}
                    onChange={() => setCommentStatus('allowed')}
                  />
                  <span>允许</span>
                </label>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">模板样式</h2>
              <TemplateSelector
                category="video_category"
                value={template}
                onChange={(val) => setTemplate(val)}
                placeholder="选择模板"
              />
              <p className="text-xs text-gray-500 mt-2">选择分类页面的展示样式（后续扩展）</p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}