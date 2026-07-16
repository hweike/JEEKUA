'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { X, Info } from 'lucide-react';
import { PriceTiersInput } from '../components/PriceTiersInput';
import ProductImageManager from '@/components/ProductImageManager';
import InfoTooltip from '@/components/InfoTooltip';
import SeoFields from '@/components/common/SeoFields';
import { generateClientSlug } from '@/lib/utils/clientSlug';
import { toPinyin } from '@/lib/utils/pinyin';
import { TemplateSelector } from '@/components/webbuilder/TemplateSelector';
import ProductRelatedVideos from '@/components/admin/products/ProductRelatedVideos';
import { getLanguageDisplayName } from '@/lib/languages/config';
import Toast from '@/components/Toast';

const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), { ssr: false });

interface AttributeTemplate {
  id: string;
  name: string;
  attributes: Array<{ name: string; rule: string }>;
}

function SpecificationsInput({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const [tags, setTags] = useState<string[]>(() => {
    if (!value) return [];
    return value.split(',').map(s => s.trim()).filter(Boolean);
  });
  const [input, setInput] = useState('');

  useEffect(() => {
    const newTags = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];
    setTags(newTags);
  }, [value]);

  const updateTags = (newTags: string[]) => {
    setTags(newTags);
    onChange(newTags.join(','));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      if (!tags.includes(input.trim())) {
        updateTags([...tags, input.trim()]);
      }
      setInput('');
    }
  };

  const removeTag = (tag: string) => {
    updateTags(tags.filter(t => t !== tag));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1 bg-gray-100 hover:bg-gray-200 rounded-full px-3 py-1 text-sm group cursor-default">
            {tag}
            <button type="button" onClick={() => removeTag(tag)} className="text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
              <X size={14} />
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入规格后按回车添加，例如：颜色:红色"
        className="border rounded p-2 w-full text-base"
      />
      <p className="text-xs text-gray-500 mt-1">按回车添加规格，鼠标悬停在规格上可删除</p>
    </div>
  );
}

function generateSlugForProduct(text: string): string {
  if (!text) return '';
  const pinyinText = toPinyin(text);
  return generateClientSlug(pinyinText);
}

// ---------- 骨架屏组件 ----------
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

// ---------- 缓存静态数据（与变体页共享） ----------
const staticCache = {
  settings: null as any,
  categories: null as any,
  timestamp: 0,
  TTL: 5 * 60 * 1000,
};

export default function ProductEditPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const productId = searchParams.get('productId');
  const parentId = searchParams.get('parentId');
  const locale = searchParams.get('locale') || 'zh';
  const urlCategoryId = searchParams.get('categoryId') || '';
  const urlSeriesId = searchParams.get('seriesId') || '';

  const [form, setForm] = useState<any>({
    id: '',
    product_name: '',
    sku: '',
    brand: '',
    price_tiers: [{ min_qty: 1, max_qty: null, price: 0 }],
    availability: 'in_stock',
    min_order_quantity: 1,
    main_image_url: '',
    additional_images: [],
    description: '',
    short_description: '',
    attributes: {},
    spec_text: '',
    product_type: '',
    google_product_category: 0,
    seo_title: '',
    seo_description: '',
    seo_keywords: '',
    slug: '',
    shipping_cost: 0,
    return_policy_days: 30,
    content: '',
    status: 'published',
    categoryId: '',
    seriesId: '',
    variants: [],
    templateId: '',
  });
  const [loadingContent, setLoadingContent] = useState(true);
  const [saving, setSaving] = useState(false);
  const [productSettings, setProductSettings] = useState<any>({});
  const [categoryPath, setCategoryPath] = useState<string>('');
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [attributeTemplate, setAttributeTemplate] = useState<AttributeTemplate | null>(null);
  const [titleLength, setTitleLength] = useState(0);
  const [templateList, setTemplateList] = useState<any[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const isMounted = useRef(true);

  // 组件卸载时取消请求
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
        // 1. 并行获取设置和产品数据（或新建默认值）
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

        // 产品数据请求（编辑或新建）
        let productDataPromise: Promise<any>;
        if (productId) {
          // 编辑模式
          productDataPromise = fetch(`/api/admin/products/manage?productId=${productId}&locale=${locale}`, { signal })
            .then(res => res.json());
        } else if (parentId) {
          // 新建变体（但此页面是父商品编辑，parentId 可能是变体复制？保留原有逻辑）
          productDataPromise = fetch(`/api/admin/products/manage?productId=${parentId}&locale=${locale}`, { signal })
            .then(res => res.json());
        } else {
          // 新建产品，无需请求产品数据
          productDataPromise = Promise.resolve(null);
        }

        const [settingsData, productData] = await Promise.all([settingsPromise, productDataPromise]);
        setProductSettings(settingsData);
        setDefaultCurrency(settingsData.defaultSettings?.default_currency || 'USD');

        // 处理产品数据
        if (productId) {
          // 编辑已有产品
          if (!productData || !productData.id) throw new Error('产品不存在');
          setForm((prev: any) => ({
            ...prev,
            id: productData.id || productId,
            ...productData,
            categoryId: productData.categoryId || '',
            seriesId: productData.seriesId || '',
            variants: productData.variants || [],
            templateId: productData.templateId || '',
          }));
          setTitleLength(productData.product_name?.length || 0);
          // 获取分类路径和属性模板（使用缓存的分类）
          if (productData.categoryId) {
            await loadCategoryInfo(productData.categoryId, productData.seriesId, settingsData, signal);
          }
        } else if (parentId) {
          // 从父产品复制（新建变体，但此页面是父商品编辑，可能是创建类似产品？保留原有逻辑）
          if (!productData || !productData.id) throw new Error('父产品不存在');
          setForm((prev: any) => ({
            ...prev,
            ...productData,
            product_name: `${productData.product_name} (变体)`,
            sku: '',
            parent_product_id: parentId,
            categoryId: productData.categoryId || '',
            seriesId: productData.seriesId || '',
            variants: [],
            templateId: productData.templateId || '',
          }));
          setTitleLength(`${productData.product_name} (变体)`.length);
          if (productData.categoryId) {
            await loadCategoryInfo(productData.categoryId, productData.seriesId, settingsData, signal);
          }
        } else {
          // 新建产品：应用默认设置和 URL 参数
          const defaults = settingsData.defaultSettings || {};
          setForm((prev: any) => ({
            ...prev,
            brand: defaults.default_brand || 'Neutral',
            availability: defaults.default_availability || 'in_stock',
            min_order_quantity: defaults.default_min_order_qty || 1,
            shipping_cost: defaults.default_shipping_cost !== undefined ? defaults.default_shipping_cost : 0,
            return_policy_days: defaults.default_return_days || 30,
            categoryId: urlCategoryId,
            seriesId: urlSeriesId,
          }));
          if (urlCategoryId) {
            await loadCategoryInfo(urlCategoryId, urlSeriesId, settingsData, signal);
          }
        }

        // 获取模板列表（用于新建产品默认选中）
        if (!productId && !parentId && !form.templateId) {
          try {
            const res = await fetch('/api/webbuilder?category=product', { signal });
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              setTemplateList(data);
              setForm((prev: any) => ({ ...prev, templateId: data[0].id }));
            }
          } catch (err: any) {
            if (err.name !== 'AbortError') console.error('获取模板列表失败', err);
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
  }, [productId, parentId, locale, router, urlCategoryId, urlSeriesId]);

  // ---------- 加载分类信息（路径 + 属性模板，使用缓存） ----------
  const loadCategoryInfo = async (
    categoryId: string,
    seriesId: string | undefined,
    settingsData: any,
    signal: AbortSignal
  ) => {
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
      const productLines = categoriesData.productLines || [];
      const cat = categories.find((c: any) => c.id === categoryId);
      if (cat) {
        const productLine = productLines.find((pl: any) => pl.id === cat.productLineId);
        let seriesName = '';
        const sid = seriesId || urlSeriesId;
        if (sid) {
          const series = cat.series?.find((s: any) => s.id === sid);
          if (series) seriesName = series.name;
        }
        setCategoryPath(`${productLine?.name || '无'} >> ${cat.name}${seriesName ? ` >> ${seriesName}` : ''}`);
        if (cat.attributeTemplateId && settingsData.attributeTemplates) {
          const tpl = settingsData.attributeTemplates.find((t: any) => t.id === cat.attributeTemplateId);
          if (tpl) setAttributeTemplate(tpl);
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('加载分类信息失败:', err);
    }
  };

  // ---------- 表单处理函数（不变） ----------
  const handleChange = (field: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [field]: value }));
    if (field === 'product_name') setTitleLength(value?.length || 0);
  };

  const handleAttributeChange = (key: string, value: string) => {
    setForm((prev: any) => ({
      ...prev,
      attributes: { ...prev.attributes, [key]: value },
    }));
  };

  const handleSeoChange = (seoData: { slug: string; seoKeywords: string; seoTitle: string; seoDescription: string }) => {
    setForm((prev: any) => ({
      ...prev,
      slug: seoData.slug,
      seo_keywords: seoData.seoKeywords,
      seo_title: seoData.seoTitle,
      seo_description: seoData.seoDescription,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.product_name || !form.price_tiers?.length) {
      setToast({ message: '请填写产品名称和至少一个价格阶梯', type: 'error' });
      return;
    }

    let finalSlug = form.slug;
    if (!finalSlug || finalSlug.trim() === '') {
      finalSlug = generateSlugForProduct(form.product_name);
      setForm((prev: any) => ({ ...prev, slug: finalSlug }));
    }

    const finalCategoryId = form.categoryId || urlCategoryId;
    const finalSeriesId = form.seriesId || urlSeriesId;

    if (!finalCategoryId) {
      setToast({ message: '分类信息缺失，请返回产品列表重新编辑', type: 'error' });
      return;
    }

    const payload = {
      id: form.id,
      product_name: form.product_name,
      sku: form.sku || '',
      brand: form.brand,
      price_tiers: form.price_tiers,
      availability: form.availability,
      min_order_quantity: form.min_order_quantity,
      main_image_url: form.main_image_url,
      additional_images: form.additional_images,
      description: form.description,
      short_description: form.short_description,
      attributes: form.attributes,
      spec_text: form.spec_text,
      product_type: form.product_type,
      google_product_category: form.google_product_category,
      seo_title: form.seo_title,
      seo_description: form.seo_description,
      seo_keywords: form.seo_keywords,
      slug: finalSlug,
      shipping_cost: form.shipping_cost,
      return_policy_days: form.return_policy_days,
      content: form.content,
      status: form.status,
      categoryId: finalCategoryId,
      seriesId: finalSeriesId,
      locale,
      currency: defaultCurrency,
      variants: form.variants,
      templateId: form.templateId,
    };
    if (parentId) (payload as any).parent_product_id = parentId;

    setSaving(true);
    const url = productId
      ? `/api/admin/products/manage?productId=${productId}`
      : '/api/admin/products/manage';
    const method = productId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
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
      {categoryPath && <div className="text-sm text-gray-500 mb-2">当前类目：{categoryPath}</div>}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          {productId ? '编辑产品' : '新建产品'}
          <span>-{getLanguageDisplayName(locale, 'zh')}站</span>
        </h1>
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
                    产品名称 *
                    <InfoTooltip content="*必填项，可输入字符长度为128个字符。建议控制在60-70个字符（约30-35个汉字）以内。推荐使用 '品牌 + 产品名称 + 关键属性/型号' 的结构。" />
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
                    <InfoTooltip content="选填。若留空，系统将按基本设置中的SKU生成规则自动生成。" />
                  </label>
                  <input
                    type="text"
                    value={form.sku}
                    onChange={e => handleChange('sku', e.target.value)}
                    className="border rounded p-2 w-full"
                    placeholder={!productId && !parentId ? '自动生成' : ''}
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 flex items-center gap-2">
                    品牌
                    <InfoTooltip content="品牌对于商品辨识至关重要，谷歌GMC要求商品数据应包含品牌信息。可在基本设置中设置统一使用的品牌，如没填写，系统将按中性品牌'Neutral'存储。" />
                  </label>
                  <input
                    type="text"
                    value={form.brand}
                    onChange={e => handleChange('brand', e.target.value)}
                    className="border rounded p-2 w-full"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 flex items-center gap-2">
                    简短描述
                    <InfoTooltip content="用简短几句话高度概括产品核心卖点、应用场景，建议100-300个字符。" />
                  </label>
                  <textarea
                    value={form.short_description}
                    onChange={e => handleChange('short_description', e.target.value)}
                    rows={3}
                    className="border rounded p-2 w-full"
                    placeholder="简短介绍产品核心卖点..."
                  />
                  <div className="text-xs text-gray-500 mt-1 text-right">
                    {form.short_description?.length || 0}/300
                  </div>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4 bg-white shadow-sm">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                媒体与描述
                <InfoTooltip content="为提高用户体验和SEO，建议内容充实（如500-1000字），主图必须上传。" />
              </h2>
              <div className="space-y-4">
                <ProductImageManager
                  mainImage={form.main_image_url}
                  additionalImages={form.additional_images}
                  onMainImageChange={url => handleChange('main_image_url', url)}
                  onAdditionalImagesChange={urls => handleChange('additional_images', urls)}
                />
                <div>
                  <label className="block font-medium mb-1">详细描述</label>
                  <RichTextEditor value={form.description} onChange={val => handleChange('description', val)} />
                </div>
              </div>
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

            {/* 相关视频卡片 */}
            <div className="border rounded-lg p-4 bg-white shadow-sm">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">相关视频</h2>
              {productId ? (
                <ProductRelatedVideos productId={productId} locale={locale} />
              ) : (
                <div className="text-gray-400 text-sm text-center py-4 border border-dashed rounded">
                  保存产品后即可关联视频
                </div>
              )}
            </div>

            <div className="border rounded-lg p-4 bg-white shadow-sm">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                商品规格说明
                <InfoTooltip content="按回车添加商品规格说明，例如：颜色:红色、尺寸:XL等。" />
              </h2>
              <SpecificationsInput value={form.spec_text || ''} onChange={val => handleChange('spec_text', val)} />
            </div>
          </div>

          {/* 右侧 35% */}
          <div className="w-[35%] space-y-6">
            <div className="border rounded-lg p-4 bg-white shadow-sm">
              <h2 className="text-lg font-semibold mb-3">状态</h2>
              <div>
                <label className="block font-medium mb-1">上架状态</label>
                <select
                  value={form.status || 'published'}
                  onChange={e => handleChange('status', e.target.value)}
                  className="border rounded p-2 w-full"
                >
                  <option value="published">上架</option>
                  <option value="draft">草稿</option>
                </select>
              </div>
            </div>

            <div className="border rounded-lg p-4 bg-white shadow-sm">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                阶梯价格 *
                <InfoTooltip content="建议至少设置一个阶梯价格，谷歌GMC强制要求。起始数量≥1的整数，结束数量不填表示无上限，单价为正值保留两位小数。" />
              </h2>
              <PriceTiersInput
                value={form.price_tiers}
                onChange={v => handleChange('price_tiers', v)}
                currency={defaultCurrency}
              />
            </div>

            <div className="border rounded-lg p-4 bg-white shadow-sm">
              <h2 className="text-lg font-semibold mb-3">库存与物流</h2>
              <div className="space-y-3">
                <div>
                  <label className="block font-medium mb-1 flex items-center gap-2">
                    库存状态
                    <InfoTooltip content="建议选择有货，表示当前可以购买此商品。" />
                  </label>
                  <select
                    value={form.availability}
                    onChange={e => handleChange('availability', e.target.value)}
                    className="border rounded p-2 w-full"
                  >
                    <option value="in_stock">现货</option>
                    <option value="out_of_stock">缺货</option>
                    <option value="preorder">预定</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1 flex items-center gap-2">
                    运费
                    <InfoTooltip content="默认0（包邮），运费可在Offer中声明。" />
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.shipping_cost}
                    onChange={e => handleChange('shipping_cost', parseFloat(e.target.value) || 0)}
                    className="border rounded p-2 w-full"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 flex items-center gap-2">
                    退货天数
                    <InfoTooltip content="依据GMC要求，退货期应为30天或更长。提供清晰的退货政策是建立用户信任和符合GMC购物体验要求的重要一环，可显著提升购买意愿。" />
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.return_policy_days}
                    onChange={e => handleChange('return_policy_days', parseInt(e.target.value) || 0)}
                    className="border rounded p-2 w-full"
                  />
                </div>
              </div>
            </div>

            {/* SEO 设置卡片 */}
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

            <div className="border rounded-lg p-4 bg-white shadow-sm">
              <h2 className="text-lg font-semibold mb-3">关联模板</h2>
              <div>
                <TemplateSelector
                  category="product"
                  value={form.templateId}
                  onChange={val => handleChange('templateId', val)}
                  placeholder="选择产品详情页模板"
                />
                <p className="text-xs text-gray-500 mt-2">
                  选择后，产品详情页将使用该模板渲染，留空则使用系统默认模板。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 flex justify-end gap-4 z-50">
        <button type="button" onClick={() => router.back()} className="bg-gray-300 px-4 py-2 rounded">
          取消
        </button>
        <button type="submit" disabled={saving} className="bg-blue-600 text-white px-6 py-2 rounded disabled:bg-gray-400">
          {saving ? '保存中...' : '保存产品'}
        </button>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </form>
  );
}