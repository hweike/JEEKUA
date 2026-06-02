'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import SeoFields from '@/components/common/SeoFields';
import { TemplateSelector } from '@/components/webbuilder/TemplateSelector';

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
  const locale = searchParams.get('locale') || 'zh';
  const id = searchParams.get('id');

  const [formData, setFormData] = useState<CategoryForm>({
    title: '',
    comment_status: 'allowed',
    template: '',   // 默认值，若模板列表存在则可能被覆盖
    slug: '',
    seo_keywords: '',
    seo_title: '',
    seo_description: '',
  });
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(!!id);

  // 编辑模式加载数据
  useEffect(() => {
    if (id) {
      fetch(`/api/admin/blog/categories?locale=${locale}`)
        .then(res => res.json())
        .then(data => {
          const category = data.find((c: any) => c.id === id);
          if (category) {
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
            alert('分类不存在');
            router.push('/admin/blog/categories');
          }
        })
        .catch(() => alert('加载失败'))
        .finally(() => setFetchLoading(false));
    }
  }, [id, locale, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('请填写标题');
      return;
    }
    if (!formData.slug.trim()) {
      alert('请填写 URL 名称 (slug)');
      return;
    }
    if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      alert('URL 名称只能包含小写字母、数字和连字符');
      return;
    }

    setLoading(true);
    try {
      const url = '/api/admin/blog/categories';
      const method = id ? 'PUT' : 'POST';
      const payload = {
        locale,
        ...formData,
        ...(id && { id }),
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        alert(id ? '更新成功' : '创建成功');
        router.push('/admin/blog/categories');
      } else {
        alert(data.error || '操作失败');
      }
    } catch (err) {
      alert('网络错误');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) return <div className="p-6">加载中...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        {id ? '编辑分类' : '新建分类'}
      </h1>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-[65%_30%] gap-6">
          {/* 左侧列 */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">标题</h2>
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
                category="blog"   // ✅ 微调：改为 "blog"
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