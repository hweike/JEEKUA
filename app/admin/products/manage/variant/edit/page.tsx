'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ProductImageManager from '@/components/ProductImageManager';
import InfoTooltip from '@/components/InfoTooltip';
import SeoFields from '@/components/common/SeoFields';
import { generateClientSlug } from '@/lib/utils/clientSlug';
import { toPinyin } from '@/lib/utils/pinyin';
import Toast from '@/components/Toast';
import { getLanguageDisplayName } from '@/lib/languages/config';

interface AttributeTemplate {
  id: string;
  name: string;
  attributes: Array<{ name: string; rule: string }>;
}

interface VariantForm {
  product_name: string;
  sku: string;
  short_description: string;
  main_image_url: string;
  additional_images: string[];
  attributes: Record<string, string>;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  slug: string;
}

function generateSlugForProduct(text: string): string {
  if (!text) return '';
  const pinyinText = toPinyin(text);
  return generateClientSlug(pinyinText);
}

// ---------- 骨架屏组件（模拟表单结构，带脉冲动画） ----------
function FormSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="border rounded-lg p-4 bg-white shadow-sm space-y-4">
        <div className="h-6 w-32 bg-gray-200 rounded"></div>
        <div className="space-y-3">
          <div>
            <div className="h-4 w-20 bg-gray-200 rounded mb-1"></div>
            <div className="h-10 bg-gray-200 rounded w-full"></div>
          </div>
          <div>
            <div className="h-4 w-16 bg-gray-200 rounded mb-1"></div>
            <div className="h-10 bg-gray-200 rounded w-full"></div>
          </div>
          <div>
            <div className="h-4 w-24 bg-gray-200 rounded mb-1"></div>
            <div className="h-20 bg-gray-200 rounded w-full"></div>
          </div>
        </div>
      </div>
      <div className="border rounded-lg p-4 bg-white shadow-sm">
        <div className="h-6 w-16 bg-gray-200 rounded mb-3"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
      <div className="border rounded-lg p-4 bg-white shadow-sm">
        <div className="h-6 w-24 bg-gray-200 rounded mb-3"></div>
        <div className="space-y-3">
          <div className="h-10 bg-gray-200 rounded w-full"></div>
          <div className="h-10 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    </div>
  );
}

// ---------- 缓存静态数据 ----------
const staticCache = {
  settings: null as any,
  categories: null as any,
  timestamp: 0,
  TTL: 5 * 60 * 1000,
};

export default function VariantEditPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const variantId = searchParams.get('productId');
  const parentId = searchParams.get('parentId');
  const locale = searchParams.get('locale') || 'zh';

  const [form, setForm] = useState<VariantForm>({
    product_name: '',
    sku: '',
    short_description: '',
    main_image_url: '',
    additional_images: [],
    attributes: {},
    seo_title: '',
    seo_description: '',
    seo_keywords: '',
    slug: '',
  });
  const [loadingContent, setLoadingContent] = useState(true);
  const [saving, setSaving] = useState(false);
  const [productSettings, setProductSettings] = useState<any>({});
  const [attributeTemplate, setAttributeTemplate] = useState<AttributeTemplate | null>(null);
  const [parentProduct, setParentProduct] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [titleLength, setTitleLength] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // ---------- 主要数据加载 ----------
  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;

    const loadData = async () => {
      setLoadingContent(true);
      const startTime = Date.now();

      try {
        const cacheValid = Date.now() - staticCache.timestamp < staticCache.TTL;

        let settingsPromise: Promise<any>;
        if (cacheValid && staticCache.settings) {
          settingsPromise = Promise.resolve(staticCache.settings);
        } else {
          settingsPromise = fetch(`/api/admin/products/settings?locale=${locale}`, { signal })
            .then(res => res.json())
            .then(data => {
              staticCache.settings = data;
              staticCache.timestamp = Date.now();
              return data;
            });
        }

        let mainDataPromise: Promise<any>;
        if (variantId) {
          mainDataPromise = fetch(`/api/admin/products/manage?productId=${variantId}&locale=${locale}`, { signal })
            .then(res => res.json());
        } else {
          if (!parentId) throw new Error('缺少父产品 ID');
          mainDataPromise = fetch(`/api/admin/products/manage?productId=${parentId}&locale=${locale}`, { signal })
            .then(res => res.json());
        }

        const [settingsData, mainData] = await Promise.all([settingsPromise, mainDataPromise]);
        setProductSettings(settingsData);

        if (variantId) {
          if (!mainData || !mainData.id) throw new Error('变体不存在');
          setForm({
            product_name: mainData.product_name || '',
            sku: mainData.sku || '',
            short_description: mainData.short_description || '',
            main_image_url: mainData.main_image_url || '',
            additional_images: mainData.additional_images || [],
            attributes: mainData.attributes || {},
            seo_title: mainData.seo_title || '',
            seo_description: mainData.seo_description || '',
            seo_keywords: mainData.seo_keywords || '',
            slug: mainData.slug || '',
          });
          setTitleLength(mainData.product_name?.length || 0);
          setParentProduct({
            id: mainData.parent_product_id,
            product_name: mainData.parent_product_name || '',
            categoryId: mainData.categoryId,
            productLineId: mainData.productLineId,
            seriesId: mainData.seriesId,
          });
          if (mainData.categoryId) {
            await loadAttributeTemplate(mainData.categoryId, settingsData, signal);
          }
        } else {
          if (!mainData || !mainData.id) throw new Error('父产品不存在');
          setParentProduct({
            id: mainData.id,
            product_name: mainData.product_name || '',
            categoryId: mainData.categoryId,
            productLineId: mainData.productLineId,
            seriesId: mainData.seriesId,
          });
          if (mainData.categoryId) {
            await loadAttributeTemplate(mainData.categoryId, settingsData, signal);
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error('加载失败:', err);
        if (isMounted.current) {
          setToast({ message: err.message || '加载失败，即将返回', type: 'error' });
          setTimeout(() => router.back(), 1500);
        }
      } finally {
        // 确保骨架屏至少显示 500ms，避免一闪而过
        const elapsed = Date.now() - startTime;
        const minDisplay = 100;
        if (elapsed < minDisplay) {
          await new Promise(resolve => setTimeout(resolve, minDisplay - elapsed));
        }
        if (isMounted.current && !controller.signal.aborted) {
          setLoadingContent(false);
        }
      }
    };

    loadData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [variantId, parentId, locale, router]);

  // ---------- 加载属性模板（支持缓存） ----------
  const loadAttributeTemplate = async (categoryId: string, settingsData: any, signal: AbortSignal) => {
    try {
      const cacheValid = Date.now() - staticCache.timestamp < staticCache.TTL;
      let categoriesData = staticCache.categories;
      if (!cacheValid || !categoriesData) {
        const res = await fetch(`/api/admin/products/categories?locale=${locale}`, { signal });
        categoriesData = await res.json();
        staticCache.categories = categoriesData;
        staticCache.timestamp = Date.now();
      }
      const categories = categoriesData.categories || [];
      const cat = categories.find((c: any) => c.id === categoryId);
      if (cat && cat.attributeTemplateId) {
        const tpl = settingsData.attributeTemplates?.find((t: any) => t.id === cat.attributeTemplateId);
        if (tpl) setAttributeTemplate(tpl);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.warn('加载属性模板失败:', err);
    }
  };

  // ---------- 表单处理 ----------
  const handleChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === 'product_name') setTitleLength(value?.length || 0);
  };

  const handleAttributeChange = (key: string, value: string) => {
    setForm(prev => ({
      ...prev,
      attributes: { ...prev.attributes, [key]: value },
    }));
  };

  const handleSeoChange = (seoData: { slug: string; seoKeywords: string; seoTitle: string; seoDescription: string }) => {
    setForm(prev => ({
      ...prev,
      slug: seoData.slug,
      seo_keywords: seoData.seoKeywords,
      seo_title: seoData.seoTitle,
      seo_description: seoData.seoDescription,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.product_name) {
      setToast({ message: '请填写变体名称', type: 'error' });
      return;
    }
    let finalSlug = form.slug;
    if (!finalSlug || finalSlug.trim() === '') {
      finalSlug = generateSlugForProduct(form.product_name);
      setForm(prev => ({ ...prev, slug: finalSlug }));
    }
    if (!parentProduct || !parentProduct.categoryId) {
      setToast({ message: '父产品分类信息缺失，无法保存变体', type: 'error' });
      return;
    }

    const payload = {
      product_name: form.product_name,
      sku: form.sku,
      short_description: form.short_description,
      main_image_url: form.main_image_url,
      additional_images: form.additional_images,
      attributes: form.attributes,
      seo_title: form.seo_title,
      seo_description: form.seo_description,
      seo_keywords: form.seo_keywords,
      slug: finalSlug,
      locale,
      parent_product_id: parentId || parentProduct.id,
    };

    setSaving(true);
    const url = variantId
      ? `/api/admin/products/manage?productId=${variantId}`
      : '/api/admin/products/manage';
    const method = variantId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const responseText = await res.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch {
        result = { error: `服务器返回非JSON: ${responseText.substring(0, 200)}` };
      }
      if (res.ok) {
        setToast({ message: '保存成功', type: 'success' });
        setTimeout(() => {
          setSaving(false);
          router.push(`/admin/products/manage?locale=${locale}`);
        }, 1500);
      } else {
        console.error('Save failed:', result);
        setToast({ message: result.error || `保存失败 (HTTP ${res.status})`, type: 'error' });
        setSaving(false);
      }
    } catch (err: any) {
      console.error('Network error:', err);
      setToast({ message: '保存失败，请检查网络', type: 'error' });
      setSaving(false);
    }
  };

  const MAX_TITLE = 128;

  return (
    <form onSubmit={handleSubmit} className="p-6 max-w-7xl mx-auto space-y-6 pb-24">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          {variantId ? '编辑变体' : '新增变体'}
          <span>-{getLanguageDisplayName(locale, 'zh')}站</span>
        </h1>
      </div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
        {parentProduct ? (
          <span>父产品：{parentProduct.product_name}</span>
        ) : (
          <span className="h-4 w-40 bg-gray-200 animate-pulse rounded"></span>
        )}
      </div>

      {loadingContent ? (
        <FormSkeleton />
      ) : (
        <div className="flex flex-wrap gap-6">
          {/* 左侧 60% */}
          <div className="w-[60%] space-y-6">
            <div className="border rounded-lg p-4 bg-white shadow-sm">
              <h2 className="text-lg font-semibold mb-3">基础信息</h2>
              <div className="space-y-3">
                <div>
                  <label className="block font-medium mb-1 flex items-center gap-2">
                    变体名称 *
                    <InfoTooltip content="建议格式：产品名 + 规格描述（如：iPhone 14 Pro - 256GB 深空黑）" />
                  </label>
                  <input
                    type="text"
                    value={form.product_name}
                    onChange={e => handleChange('product_name', e.target.value)}
                    required
                    className="border rounded p-2 w-full"
                  />
                  <div className="text-xs text-gray-500 mt-1 flex justify-between">
                    <span>{titleLength}/{MAX_TITLE} 字符</span>
                  </div>
                </div>
                <div>
                  <label className="block font-medium mb-1 flex items-center gap-2">
                    SKU
                    <InfoTooltip content="选填，可重复。若留空系统将自动生成" />
                  </label>
                  <input
                    type="text"
                    value={form.sku}
                    onChange={e => handleChange('sku', e.target.value)}
                    className="border rounded p-2 w-full"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 flex items-center gap-2">
                    简短描述
                    <InfoTooltip content="用简短几句话概括该变体的核心卖点" />
                  </label>
                  <textarea
                    value={form.short_description}
                    onChange={e => handleChange('short_description', e.target.value)}
                    rows={3}
                    className="border rounded p-2 w-full"
                    placeholder="例如：256GB存储空间，深空黑配色..."
                  />
                  <div className="text-xs text-gray-500 mt-1 text-right">
                    {form.short_description?.length || 0}/300
                  </div>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4 bg-white shadow-sm">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                媒体
                <InfoTooltip content="上传变体的差异化图片（可选）" />
              </h2>
              <ProductImageManager
                mainImage={form.main_image_url}
                additionalImages={form.additional_images}
                onMainImageChange={url => handleChange('main_image_url', url)}
                onAdditionalImagesChange={urls => handleChange('additional_images', urls)}
              />
            </div>

            {attributeTemplate && attributeTemplate.attributes.length > 0 && (
              <div className="border rounded-lg p-4 bg-white shadow-sm">
                <h2 className="text-lg font-semibold mb-3">自定义属性</h2>
                <div className="space-y-3">
                  {attributeTemplate.attributes.map((attr) => (
                    <div key={attr.name}>
                      <label className="block font-medium mb-1">{attr.name}</label>
                      <input
                        type="text"
                        placeholder={attr.rule.replace('{属性名}', attr.name)}
                        value={form.attributes[attr.name] || ''}
                        onChange={(e) => handleAttributeChange(attr.name, e.target.value)}
                        className="border rounded p-2 w-full"
                      />
                      <p className="text-xs text-gray-500 mt-0.5">{attr.rule}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 右侧 35% */}
          <div className="w-[35%] space-y-6">
            <div className="border rounded-lg p-4 bg-white shadow-sm">
              <h2 className="text-lg font-semibold mb-3">搜索引擎优化</h2>
              <SeoFields
                slug={form.slug}
                seoKeywords={form.seo_keywords}
                seoTitle={form.seo_title}
                seoDescription={form.seo_description}
                onChange={handleSeoChange}
                autoGenerateFrom={form.product_name}
                showSlug
                showKeywords
                showTitle
                showDescription
                disabled={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* 悬浮按钮 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 flex justify-end gap-4 z-50">
        <button type="button" onClick={() => router.back()} className="bg-gray-300 px-4 py-2 rounded">
          取消
        </button>
        <button type="submit" disabled={saving} className="bg-blue-600 text-white px-6 py-2 rounded disabled:bg-gray-400">
          {saving ? '保存中...' : '保存变体'}
        </button>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </form>
  );
}