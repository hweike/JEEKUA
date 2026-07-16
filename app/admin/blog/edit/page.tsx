'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { X } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';
import ResourceAssociation from '@/components/admin/products/ResourceAssociation';
import SeoFields from '@/components/common/SeoFields';
import Toast from '@/components/Toast';

const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), { ssr: false });

interface Category {
  id: string;
  title: string;
  template: string;
}

export default function BlogEdit() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = searchParams.get('locale') || 'zh';
  const id = searchParams.get('id');

  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryTemplateMap, setCategoryTemplateMap] = useState<Map<string, string>>(new Map());
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isExisting, setIsExisting] = useState(false);

  const [formData, setFormData] = useState({
    id: '',
    slug: '',
    title: '',
    excerpt: '',
    content: '',
    visibility: 'visible',
    featured_image: '',
    author: '',
    category_id: '',
    tags: [] as string[],
    seo_keywords: '',
    seo_title: '',
    seo_description: '',
  });

  const [tagInput, setTagInput] = useState('');

  // 加载分类列表
  useEffect(() => {
    fetch(`/api/admin/blog/categories?locale=${locale}`)
      .then(res => res.json())
      .then(data => {
        setCategories(data);
        const map = new Map<string, string>();
        data.forEach((cat: Category) => {
          map.set(cat.id, cat.template || 'default');
        });
        setCategoryTemplateMap(map);
      })
      .catch(console.error);
  }, [locale]);

  // 加载文章数据（编辑或新增其他语言版本）
  useEffect(() => {
    if (id) {
      fetch(`/api/admin/blog?locale=${locale}&id=${id}`)
        .then(res => {
          if (!res.ok) throw new Error('加载失败');
          return res.json();
        })
        .then(data => {
          if (data && data.id) {
            // 存在数据 -> 编辑模式
            setIsExisting(true);
            setFormData({
              id: data.id,
              slug: data.slug || '',
              title: data.title || '',
              excerpt: data.excerpt || '',
              content: data.content || '',
              visibility: data.visibility || 'visible',
              featured_image: data.featured_image || '',
              author: data.author || '',
              category_id: data.category_id || '',
              tags: data.tags ? JSON.parse(data.tags) : [],
              seo_keywords: data.seo_keywords || '',
              seo_title: data.seo_title || '',
              seo_description: data.seo_description || '',
            });
          } else {
            // 数据不存在（data 为 null）
            setIsExisting(false);
            setFormData({
              id: id,
              slug: '',
              title: '',
              excerpt: '',
              content: '',
              visibility: 'visible',
              featured_image: '',
              author: '',
              category_id: '',
              tags: [],
              seo_keywords: '',
              seo_title: '',
              seo_description: '',
            });
          }
        })
        .catch(err => {
          console.error(err);
          setToast({ message: '加载失败', type: 'error' });
          setIsExisting(false);
          setFormData({
            id: id || '',
            slug: '',
            title: '',
            excerpt: '',
            content: '',
            visibility: 'visible',
            featured_image: '',
            author: '',
            category_id: '',
            tags: [],
            seo_keywords: '',
            seo_title: '',
            seo_description: '',
          });
        })
        .finally(() => setLoading(false));
    } else {
      // 完全新建（无 id）
      setIsExisting(false);
      setFormData({
        id: '',
        slug: '',
        title: '',
        excerpt: '',
        content: '',
        visibility: 'visible',
        featured_image: '',
        author: '',
        category_id: '',
        tags: [],
        seo_keywords: '',
        seo_title: '',
        seo_description: '',
      });
      setLoading(false);
    }
  }, [id, locale]);

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (!formData.tags.includes(newTag)) {
        setFormData(prev => ({ ...prev, tags: [...prev.tags, newTag] }));
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  const handleSave = async () => {
    // 检测是否有产品选择弹窗存在
    const isDialogOpen = !!document.querySelector('.fixed.inset-0.bg-black.bg-opacity-50.flex.items-center.justify-center.z-50');
    if (isDialogOpen) {
      console.log('产品选择弹窗已打开，取消保存');
      return;
    }

    // 必填验证
    if (!formData.title.trim()) {
      setToast({ message: '请填写文章标题', type: 'error' });
      return;
    }
    if (!formData.slug.trim()) {
      setToast({ message: '请填写 URL 名称 (slug)', type: 'error' });
      return;
    }
    if (!formData.category_id) {
      setToast({ message: '请选择分类', type: 'error' });
      return;
    }

    const templateValue = formData.category_id && categoryTemplateMap.has(formData.category_id)
      ? categoryTemplateMap.get(formData.category_id)
      : 'default';

    setSaving(true);
    try {
      const payload = {
        locale,
        id: formData.id || undefined,
        slug: formData.slug,
        title: formData.title,
        excerpt: formData.excerpt,
        content: formData.content,
        visibility: formData.visibility,
        featured_image: formData.featured_image,
        author: formData.author,
        category_id: formData.category_id,
        tags: formData.tags,
        template: templateValue,
        seo_keywords: formData.seo_keywords,
        seo_title: formData.seo_title,
        seo_description: formData.seo_description,
      };

      const res = await fetch('/api/admin/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ message: isExisting ? '更新成功' : '创建成功', type: 'success' });
        router.push('/admin/blog');
      } else {
        setToast({ message: data.error || '保存失败', type: 'error' });
      }
    } catch {
      setToast({ message: '网络错误', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">加载中...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto pb-24">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <h1 className="text-2xl font-bold mb-6">
        {isExisting ? '编辑文章' : '新建文章'}
      </h1>

      <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
        <div className="grid grid-cols-1 lg:grid-cols-[65%_30%] gap-6">
          {/* 左侧列 */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">标题与内容</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="文章标题"
                  className="w-full border rounded p-2"
                  required
                />
                <RichTextEditor
                  value={formData.content}
                  onChange={val => setFormData({ ...formData, content: val })}
                />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">相关商品</h2>
              {formData.id ? (
                <ResourceAssociation
                  resourceType="blog"
                  resourceId={formData.id}
                  locale={locale}
                />
              ) : (
                <div className="text-gray-400 text-sm text-center py-4 border border-dashed rounded">
                  保存文章后即可关联商品
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">摘要</h2>
              <textarea
                value={formData.excerpt}
                onChange={e => setFormData({ ...formData, excerpt: e.target.value })}
                rows={4}
                className="w-full border rounded p-2"
                placeholder="简短摘要..."
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
              <h2 className="text-lg font-semibold mb-4">可见性</h2>
              <select
                value={formData.visibility}
                onChange={e => setFormData({ ...formData, visibility: e.target.value })}
                className="w-full border rounded p-2"
              >
                <option value="visible">可见</option>
                <option value="hidden">隐藏</option>
              </select>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">封面图片</h2>
              <ImageUpload
                value={formData.featured_image}
                onChange={(url) => {
                  const imageUrl = Array.isArray(url) ? url[0] : url;
                  setFormData({ ...formData, featured_image: imageUrl || '' });
                }}
                maxCount={1}
                label=""
                hint="支持上传本地图片或输入网络图片地址"
              />
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">其他信息</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  value={formData.author}
                  onChange={e => setFormData({ ...formData, author: e.target.value })}
                  placeholder="作者"
                  className="w-full border rounded p-2"
                />
                <select
                  value={formData.category_id}
                  onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full border rounded p-2"
                >
                  <option value="">请选择分类</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.title}</option>
                  ))}
                </select>

                <div>
                  <label className="block text-sm font-medium mb-1">标记</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.tags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-1 rounded-md text-sm group hover:bg-red-50 transition"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="text-gray-400 hover:text-red-600 focus:outline-none"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="输入标签后按回车添加"
                    className="w-full border rounded p-2"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* 悬浮按钮条 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 flex justify-end gap-4 z-50">
        <button
          type="button"
          onClick={() => router.back()}
          className="bg-gray-200 hover:bg-gray-300 px-6 py-2 rounded transition"
        >
          取消
        </button>
        <button
          type="button"
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