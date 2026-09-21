// components/pages/PageForm.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Eye, EyeOff, Settings, FileText, Globe, CheckCircle, XCircle, Loader2, LayoutTemplate } from 'lucide-react';
import { ensureUniqueSlugAsync } from '@/lib/utils/clientSlug';
import type { Visibility } from '@/types/page';
import SeoFields, { type SlugStatus } from '@/components/common/SeoFields';
import { TemplateSelector } from '@/components/webbuilder/TemplateSelector';
import Toast from '@/components/Toast';
import ContentTemplatePicker from './ContentTemplatePicker';
import { useSaveWithTransfer, hasRemoteImages } from '@/lib/files/hooks/useSaveWithTransfer';

const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), { ssr: false });

// ========== 保存阶段 ==========
type SaveStage = 'idle' | 'saving' | 'updating-template' | 'success' | 'error';

interface ActionResult {
  success: boolean;
  data?: {
    id: string;
    title: string;
    slug: string;
    updatedAt: string;
  };
  error?: string;
  errors?: Record<string, string>;
}

interface PageFormProps {
  initialData?: any;
  pageId?: string;
  locale: string;
  isEditing?: boolean;
  initialId?: string;
  initialType?: string;
  pageType?: string;
}

export default function PageForm({
  initialData,
  pageId,
  locale,
  isEditing = false,
  initialId = '',
  initialType = 'custom',
  pageType,
}: PageFormProps) {
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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // ✅ 保存阶段状态
  const [saveStage, setSaveStage] = useState<SaveStage>('idle');

  // ✅ 内容模板选择器状态
  const [showContentTemplatePicker, setShowContentTemplatePicker] = useState(false);

  // ✅ 保存前转存 Hook
  const { prepareContent, transferring } = useSaveWithTransfer();

  // ========== slug 唯一性检查状态 ==========
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle');
  const [suggestedSlug, setSuggestedSlug] = useState<string | null>(null);
  const slugCheckTimer = useRef<NodeJS.Timeout | null>(null);
  const lastCheckedSlug = useRef<string>('');

  // ========== slug 唯一性检查 ==========
  const checkSlugAvailability = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setSlugStatus('idle');
      setSuggestedSlug(null);
      return;
    }

    if (lastCheckedSlug.current === trimmed && slugStatus === 'available') {
      return;
    }

    setSlugStatus('checking');
    lastCheckedSlug.current = trimmed;

    try {
      const uniqueSlug = await ensureUniqueSlugAsync(trimmed, locale, pageId);

      if (uniqueSlug === trimmed) {
        setSlugStatus('available');
        setSuggestedSlug(null);
      } else {
        setSlugStatus('taken');
        setSuggestedSlug(uniqueSlug);
      }
    } catch (err) {
      console.warn('[PageForm] slug 检查失败:', err);
      setSlugStatus('error');
      setSuggestedSlug(null);
    }
  };

  const handleSlugChange = (value: string) => {
    setSlug(value);

    if (slugCheckTimer.current) clearTimeout(slugCheckTimer.current);
    slugCheckTimer.current = setTimeout(() => {
      checkSlugAvailability(value);
    }, 500);
  };

  const handleSlugBlur = () => {
    if (slugCheckTimer.current) clearTimeout(slugCheckTimer.current);
    checkSlugAvailability(slug);
  };

  const applySuggestedSlug = () => {
    if (suggestedSlug) {
      setSlug(suggestedSlug);
      setSlugStatus('available');
      setSuggestedSlug(null);
      lastCheckedSlug.current = suggestedSlug;
    }
  };

  const handleSeoChange = (seoData: {
    slug?: string;
    seoKeywords?: string;
    seoTitle?: string;
    seoDescription?: string;
  }) => {
    if (seoData.slug !== undefined) {
      handleSlugChange(seoData.slug);
    }
    if (seoData.seoKeywords !== undefined) setSeoKeywords(seoData.seoKeywords);
    if (seoData.seoTitle !== undefined) setSeoTitle(seoData.seoTitle);
    if (seoData.seoDescription !== undefined) setSeoDescription(seoData.seoDescription);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = '标题不能为空';
    if (!slug.trim()) newErrors.slug = 'URL名称不能为空';
    if (slugStatus === 'taken') newErrors.slug = 'URL名称已被占用，请更换或使用建议值';
    if (seoTitle.length > 60) newErrors.seo_title = '元标题不能超过60字符';
    if (seoDescription.length > 160) newErrors.seo_description = '元描述不能超过160字符';
    // ✅ 核心关键词包含性改为提示，不再作为错误
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ✅ 计算 SEO 提示文案（非错误，仅建议）
  const seoTitleHint =
    seoKeywords && seoTitle && !seoTitle.includes(seoKeywords)
      ? '提示：元标题未包含核心关键词（非必填，仅建议）'
      : undefined;

  const seoDescriptionHint =
    seoKeywords && seoDescription && !seoDescription.includes(seoKeywords)
      ? '提示：元描述未包含核心关键词（非必填，仅建议）'
      : undefined;

  const getBackUrl = () => {
    const tab = pageType === 'policy' ? 'policies' : 'pages';
    return `/admin/pages?locale=${locale}&tab=${tab}&refresh=true`;
  };

  const getSaveButtonText = () => {
    switch (saveStage) {
      case 'saving':
        return '正在保存...';
      case 'updating-template':
        return '正在转存图片...';
      case 'success':
        return '保存成功';
      case 'error':
        return '保存失败';
      default:
        return '保存页面';
    }
  };

  const getSaveButtonClass = () => {
    const base = 'px-6 py-2 rounded transition text-white disabled:opacity-50';
    switch (saveStage) {
      case 'success':
        return `${base} bg-green-600`;
      case 'error':
        return `${base} bg-red-600`;
      case 'saving':
      case 'updating-template':
        return `${base} bg-blue-400 cursor-not-allowed`;
      default:
        return `${base} bg-blue-600 hover:bg-blue-700`;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSaveStage('saving');

    // ✅ 只有有远程图片时，才设置转存状态
    if (hasRemoteImages(content)) {
      setSaveStage('updating-template');
    }

    // ✅ 保存前转存远程图片
    const finalContent = await prepareContent(content);

    // ✅ 转存完成，恢复 saving
    setSaveStage('saving');

    const formData: any = {
      title,
      content: finalContent,
      visible,
      template,
      slug,
      seo_keywords: seoKeywords,
      seo_title: seoTitle,
      seo_description: seoDescription,
    };

    if (!isEditing && initialType) {
      formData.type = initialType;
    }

    try {
      let result: ActionResult;

      if (isEditing && pageId) {
        const res = await fetch(
          `/api/admin/pages/${encodeURIComponent(pageId)}?locale=${encodeURIComponent(locale)}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
          }
        );
        result = await res.json();
      } else {
        const body: any = { locale, ...formData };
        if (initialId) {
          body.id = initialId;
        }
        const res = await fetch('/api/admin/pages/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        result = await res.json();
      }

      if (result && result.success) {
        setSaveStage('success');
        await new Promise(resolve => setTimeout(resolve, 300));

        sessionStorage.setItem('pageSaveToast', JSON.stringify({ message: '保存成功', type: 'success' }));
        router.push(`/admin/pages?locale=${locale}&refresh=true`);
      } else {
        setSaveStage('error');
        const errorMsg = result?.error || '保存失败';
        console.error('[PageForm] 保存失败:', errorMsg);
        alert(errorMsg);
        setTimeout(() => setSaveStage('idle'), 1000);
      }
    } catch (error: any) {
      console.error('[PageForm] 保存异常:', error?.message);
      setSaveStage('error');
      alert('保存失败，请重试');
      setTimeout(() => setSaveStage('idle'), 1000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const slugExtraContent = (
    <>
      {slugStatus === 'checking' && (
        <p className="text-gray-500 text-sm flex items-center gap-1">
          <Loader2 size={14} className="animate-spin" /> 正在检查 URL 名称是否可用...
        </p>
      )}
      {slugStatus === 'available' && (
        <p className="text-green-600 text-sm flex items-center gap-1">
          <CheckCircle size={14} /> URL 名称可用
        </p>
      )}
      {slugStatus === 'taken' && (
        <div className="text-red-500 text-sm">
          <p className="flex items-center gap-1">
            <XCircle size={14} /> URL 名称已被占用
          </p>
          {suggestedSlug && (
            <p className="mt-1">
              建议使用：
              <button
                type="button"
                onClick={applySuggestedSlug}
                className="text-blue-600 hover:underline font-medium ml-1"
              >
                {suggestedSlug}
              </button>
            </p>
          )}
        </div>
      )}
      {slugStatus === 'error' && (
        <p className="text-yellow-600 text-sm">
          ⚠️ 无法检查 URL 名称，保存时请留意
        </p>
      )}
    </>
  );

  const isSaving = saveStage === 'saving' || saveStage === 'updating-template' || transferring;

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <form onSubmit={handleSubmit} className="p-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[65%_30%] gap-6">
          <div className="space-y-6">
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
                    disabled={isSaving}
                  />
                  {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">内容</label>
                    <button
                      type="button"
                      onClick={() => setShowContentTemplatePicker(true)}
                      className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      disabled={isSaving}
                    >
                      <LayoutTemplate className="w-4 h-4" />
                      选择内容模板
                    </button>
                  </div>
                  <RichTextEditor
                    value={content}
                    onChange={(val) => setContent(val)}
                  />
                </div>
              </div>
            </div>

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
                onSlugBlur={handleSlugBlur}
                slugStatus={slugStatus}
                slugExtra={slugExtraContent}
                seoTitleHint={seoTitleHint}
                seoDescriptionHint={seoDescriptionHint}
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

          <div className="space-y-6">
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
                        disabled={isSaving}
                      />
                      可见
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        value="hidden"
                        checked={visible === 'hidden'}
                        onChange={() => setVisible('hidden')}
                        disabled={isSaving}
                      />
                       隐藏
                    </label>
                  </div>
                </div>
              </div>
            </div>

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
                onChange={(val) => {
                  setTemplate(val);
                }}
                placeholder="选择模板"
              />
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 flex justify-end gap-4 z-50">
          <button
            type="button"
            onClick={() => router.push(getBackUrl())}
            disabled={isSaving}
            className="bg-gray-200 hover:bg-gray-300 px-6 py-2 rounded transition disabled:opacity-50"
          >
            {isEditing ? '返回页面列表' : '取消'}
          </button>
          <button
            type="submit"
            disabled={isSaving || slugStatus === 'taken'}
            className={getSaveButtonClass()}
          >
            {getSaveButtonText()}
          </button>
        </div>
      </form>

      {/* ✅ 内容模板选择器 */}
      {showContentTemplatePicker && (
        <ContentTemplatePicker
          locale={locale}
          onSelect={(templateContent) => {
            setContent(templateContent);
            setShowContentTemplatePicker(false);
          }}
          onClose={() => setShowContentTemplatePicker(false)}
        />
      )}
    </>
  );
}