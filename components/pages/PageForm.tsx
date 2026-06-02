// components/pages/PageForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Eye, EyeOff, Settings, FileText, Globe } from 'lucide-react';
import { createPageAction, updatePageAction } from '@/lib/pages/actions';
import { generateClientSlug } from '@/lib/utils/clientSlug';
import type { Visibility } from '@/types/page';
import SeoFields from '@/components/common/SeoFields';
import { TemplateSelector } from '@/components/webbuilder/TemplateSelector';

const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), { ssr: false });

interface PageFormProps {
  initialData?: any;
  pageId?: string;
  locale: string;
  isEditing?: boolean;
}

export default function PageForm({ initialData, pageId, locale, isEditing = false }: PageFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [visible, setVisible] = useState<Visibility>(initialData?.visible || 'hidden');
  const [template, setTemplate] = useState(initialData?.template || '');
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [seoKeywords, setSeoKeywords] = useState(initialData?.seo_keywords || '');
  const [seoTitle, setSeoTitle] = useState(initialData?.seo_title || '');
  const [seoDescription, setSeoDescription] = useState(initialData?.seo_description || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSeoChange = (seoData: {
    slug?: string;
    seoKeywords?: string;
    seoTitle?: string;
    seoDescription?: string;
  }) => {
    if (seoData.slug !== undefined) setSlug(seoData.slug);
    if (seoData.seoKeywords !== undefined) setSeoKeywords(seoData.seoKeywords);
    if (seoData.seoTitle !== undefined) setSeoTitle(seoData.seoTitle);
    if (seoData.seoDescription !== undefined) setSeoDescription(seoData.seoDescription);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = '标题不能为空';
    if (!slug.trim()) newErrors.slug = 'URL名称不能为空';
    if (seoTitle.length > 60) newErrors.seo_title = '元标题不能超过60字符';
    if (seoKeywords && !seoTitle.includes(seoKeywords)) newErrors.seo_title = '元标题必须包含核心关键词';
    if (seoDescription.length > 160) newErrors.seo_description = '元描述不能超过160字符';
    if (seoKeywords && !seoDescription.includes(seoKeywords)) newErrors.seo_description = '元描述必须包含核心关键词';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);

    const formData = {
      title,
      content,
      visible,
      template,
      slug,
      seo_keywords: seoKeywords,
      seo_title: seoTitle,
      seo_description: seoDescription,
    };

    let result;
    if (isEditing && pageId) {
      result = await updatePageAction(locale, pageId, formData);
    } else {
      result = await createPageAction(locale, formData);
    }

    if (result.success) {
      // 保存成功，将提示信息存入 sessionStorage，然后跳转
      sessionStorage.setItem('pageSaveToast', JSON.stringify({ message: '保存成功', type: 'success' }));
      router.push(`/admin/pages?locale=${locale}`);
    } else {
      alert(result.error || '保存失败，请重试');
    }
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-[65%_30%] gap-6">
        {/* 左侧列 */}
        <div className="space-y-6">
          {/* 标题与内容卡片 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 border-b pb-3 mb-4">
              <FileText size={20} className="text-blue-600" />
              <h2 className="text-lg font-semibold">标题与内容</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">标题 *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">内容</label>
                <RichTextEditor
                  value={content}
                  onChange={(val) => setContent(val)}
                />
              </div>
            </div>
          </div>

          {/* 搜索引擎优化卡片 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 border-b pb-3 mb-4">
              <Globe size={20} className="text-blue-600" />
              <h2 className="text-lg font-semibold">搜索引擎优化</h2>
            </div>
            <SeoFields
              slug={slug}
              seoKeywords={seoKeywords}
              seoTitle={seoTitle}
              seoDescription={seoDescription}
              onChange={handleSeoChange}
              autoGenerateFrom={title}
              showSlug
              showKeywords
              showTitle
              showDescription
            />
            {errors.slug && <p className="text-red-500 text-sm mt-1">{errors.slug}</p>}
            {errors.seo_title && <p className="text-red-500 text-sm mt-1">{errors.seo_title}</p>}
            {errors.seo_description && <p className="text-red-500 text-sm mt-1">{errors.seo_description}</p>}
          </div>
        </div>

        {/* 右侧列 */}
        <div className="space-y-6">
          {/* 可见性卡片 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 border-b pb-3 mb-4">
              <Settings size={20} className="text-blue-600" />
              <h2 className="text-lg font-semibold">页面设置</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">可见性</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="visible"
                      checked={visible === 'visible'}
                      onChange={() => setVisible('visible')}
                    />
                    <Eye size={16} /> 可见
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="hidden"
                      checked={visible === 'hidden'}
                      onChange={() => setVisible('hidden')}
                    />
                    <EyeOff size={16} /> 隐藏
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* 模板样式卡片 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 border-b pb-3 mb-4">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
              <h2 className="text-lg font-semibold">模板样式</h2>
            </div>
            <TemplateSelector
              category="page"
              value={template}
              onChange={(val) => setTemplate(val)}
              placeholder="选择模板"
            />
          </div>
        </div>
      </div>

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
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded disabled:opacity-50 transition"
        >
          {isSubmitting ? '保存中...' : '保存页面'}
        </button>
      </div>
    </form>
  );
}