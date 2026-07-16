// app/admin/blog/categories/edit/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import SeoFields from '@/components/common/SeoFields';
import { TemplateSelector } from '@/components/webbuilder/TemplateSelector';
import { useToast } from '@/contexts/ToastContext';
import { getLanguageDisplayName } from '@/lib/languages/config';

interface CategoryForm {
  id?: string;
  title: string;
  comment_status: 'disabled' | 'moderate' | 'allowed';
  template: string;
  slug: string;
  seo_keywords: string;
  seo_title: string;
  seo_description: string;
}

export default function CategoryEdit() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const localeFromUrl = searchParams.get('locale') || 'zh';
  const idFromUrl = searchParams.get('id');

  const [formData, setFormData] = useState<CategoryForm>({
    title: '',
    comment_status: 'allowed',
    template: '',
    slug: '',
    seo_keywords: '',
    seo_title: '',
    seo_description: '',
  });
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(!!idFromUrl);
  const [isExisting, setIsExisting] = useState(false);

  // 编辑模式加载数据（如果 id 存在且该语言有数据）
  useEffect(() => {
    if (idFromUrl) {
      fetch(`/api/admin/blog/categories?locale=${localeFromUrl}`)
        .then(res => res.json())
        .then(data => {
          const category = data.find((c: any) => c.id === idFromUrl);
          if (category) {
            setIsExisting(true);
            setFormData({
              id: category.id,
              title: category.title,
              comment_status: category.comment_status,
              template: category.template || '',
              slug: category.slug,
              seo_keywords: category.seo_keywords || '',
              seo_title: category.seo_title || '',
              seo_description: category.seo_description || '',
            });
          } else {
            // 该语言下不存在此 id，视为新建（但保留 id）
            setIsExisting(false);
            setFormData(prev => ({ ...prev, id: idFromUrl }));
          }
        })
        .catch(() => showToast('加载失败', 'error'))
        .finally(() => setFetchLoading(false));
    } else {
      setIsExisting(false);
    }
  }, [idFromUrl, localeFromUrl, showToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast('请填写标题', 'error');
      return;
    }
    if (!formData.slug.trim()) {
      showToast('请填写 URL 名称 (slug)', 'error');
      return;
    }
    if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      showToast('URL 名称只能包含小写字母、数字和连字符', 'error');
      return;
    }

    setLoading(true);
    try {
      // 根据是否已存在决定方法
      const method = isExisting ? 'PUT' : 'POST';
      const payload = {
        locale: localeFromUrl,
        ...formData,
        ...(idFromUrl && { id: formData.id || idFromUrl }),
      };

      const res = await fetch('/api/admin/blog/categories', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(isExisting ? '更新成功' : '创建成功', 'success');
        router.push('/admin/blog/categories');
      } else {
        showToast(data.error || '操作失败', 'error');
      }
    } catch {
      showToast('网络错误', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) return <div className="p-6">加载中...</div>;

  const localeDisplayName = getLanguageDisplayName(localeFromUrl, 'zh');
  const pageTitle = isExisting ? '编辑分类' : '新建分类';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{pageTitle}</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-[65%_30%] gap-6">
          {/* 左侧列 */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">标题</h2>

              {/* 适用站点（只读，从 URL 获取） */}
              <div className="mb-4 text-sm text-gray-600">
                适用站点：{localeDisplayName} ({localeFromUrl})
              </div>

              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="w-full border rounded p-2"
                placeholder="请输入分类标题"
                required
              />
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">搜索引擎优化</h2>
              <SeoFields
                slug={formData.slug}
                seoKeywords={formData.seo_keywords}
                seoTitle={formData.seo_title}
                seoDescription={formData.seo_description}
                onChange={(seoData) => setFormData({
                  ...formData,
                  slug: seoData.slug !== undefined ? seoData.slug : formData.slug,
                  seo_keywords: seoData.seoKeywords !== undefined ? seoData.seoKeywords : formData.seo_keywords,
                  seo_title: seoData.seoTitle !== undefined ? seoData.seoTitle : formData.seo_title,
                  seo_description: seoData.seoDescription !== undefined ? seoData.seoDescription : formData.seo_description,
                })}
                autoGenerateFrom={formData.title}
                showSlug
                showKeywords
                showTitle
                showDescription
              />
            </div>
          </div>

          {/* 右侧列 */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">评论</h2>
              <select
                value={formData.comment_status}
                onChange={e => setFormData({ ...formData, comment_status: e.target.value as any })}
                className="w-full border rounded p-2"
              >
                <option value="allowed">允许</option>
                <option value="moderate">允许,但待审核</option>
                <option value="disabled">已禁用</option>
              </select>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">模板样式</h2>
              <TemplateSelector
                category="blog"
                value={formData.template}
                onChange={(val) => setFormData({ ...formData, template: val })}
                placeholder="选择模板"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <button type="button" onClick={() => router.back()} className="bg-gray-300 px-5 py-2 rounded">
            取消
          </button>
          <button type="submit" disabled={loading} className="bg-blue-600 text-white px-5 py-2 rounded disabled:opacity-50">
            {loading ? '保存中...' : '保存'}
          </button>
        </div>
      </form>
    </div>
  );
}