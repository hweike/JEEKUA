'use client';

import { useEffect, useState } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [productSettings, setProductSettings] = useState<any>({});
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [attributeTemplate, setAttributeTemplate] = useState<AttributeTemplate | null>(null);
  const [parentProduct, setParentProduct] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [titleLength, setTitleLength] = useState(0);

  // 加载系统设置
  useEffect(() => {
    fetch(`/api/admin/products/settings?locale=${locale}`)
      .then(res => res.json())
      .then(data => {
        setProductSettings(data);
        setSettingsLoaded(true);
      })
      .catch(console.error);
  }, [locale]);

  // 加载父产品及变体数据
  useEffect(() => {
    if (!settingsLoaded) return;
    if (!parentId) {
      setToast({ message: '缺少父产品 ID，即将返回', type: 'error' });
      setTimeout(() => router.back(), 1500);
      return;
    }
    const loadData = async () => {
      setLoading(true);
      try {
        const parentRes = await fetch(`/api/admin/products/manage?productId=${parentId}&locale=${locale}`);
        const parentData = await parentRes.json();
        setParentProduct(parentData);

        // 获取属性模板（从父产品的分类继承）
        if (parentData.categoryId && productSettings.attributeTemplates) {
          const categoriesRes = await fetch(`/api/admin/products/categories?locale=${locale}`);
          const categoriesData = await categoriesRes.json();
          const categories = categoriesData.categories || [];
          const cat = categories.find((c: any) => c.id === parentData.categoryId);
          if (cat && cat.attributeTemplateId) {
            const tpl = productSettings.attributeTemplates.find((t: any) => t.id === cat.attributeTemplateId);
            if (tpl) setAttributeTemplate(tpl);
          }
        }

        if (variantId) {
          // 编辑已有变体：从父产品的 variants 数组中读取
          const variant = parentData.variants?.find((v: any) => v.id === variantId);
          if (variant) {
            setForm({
              product_name: variant.product_name || '',
              sku: variant.sku || '',
              short_description: variant.short_description || '',
              main_image_url: variant.main_image_url || '',
              additional_images: variant.additional_images || [],
              attributes: variant.attributes || {},
              seo_title: variant.seo_title || '',
              seo_description: variant.seo_description || '',
              seo_keywords: variant.seo_keywords || '',
              slug: variant.slug || '',
            });
            setTitleLength(variant.product_name?.length || 0);
          } else {
            setToast({ message: '变体不存在，即将返回', type: 'error' });
            setTimeout(() => router.back(), 1500);
          }
        } else {
          // 新建变体
          setForm(prev => ({ ...prev }));
        }
      } catch (err) {
        console.error(err);
        setToast({ message: '加载失败，即将返回', type: 'error' });
        setTimeout(() => router.back(), 1500);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [parentId, variantId, locale, settingsLoaded, productSettings]);

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

    // SKU 改为选填，不再校验是否为空

    // 确保 slug 非空
    let finalSlug = form.slug;
    if (!finalSlug || finalSlug.trim() === '') {
      finalSlug = generateSlugForProduct(form.product_name);
      setForm(prev => ({ ...prev, slug: finalSlug }));
    }

    if (!parentProduct || !parentProduct.categoryId) {
      setToast({ message: '父产品分类信息缺失，无法保存变体', type: 'error' });
      return;
    }

    // ✅ 变体提交的 payload 只包含自身独立字段，不包含价格、库存、运费等继承字段
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
      parent_product_id: parentId,
    };

    setSaving(true);
    const url = variantId
      ? `/api/admin/products/manage?productId=${variantId}`
      : '/api/admin/products/manage';
    const method = variantId ? 'PUT' : 'POST';

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

  if (loading) return <div className="p-6">加载中...</div>;

  const MAX_TITLE = 128;

  return (
    <form onSubmit={handleSubmit} className="p-6 max-w-7xl mx-auto space-y-6 pb-24">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{variantId ? '编辑变体' : '新增变体'}<span>-{getLanguageDisplayName(locale, 'zh')}站</span></h1>
      </div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
        {parentProduct && <span>父产品：{parentProduct.product_name}</span>}
      </div>

      <div className="flex flex-wrap gap-6">
        {/* 左侧 60% */}
        <div className="w-[60%] space-y-6">
          {/* 基础信息卡片 */}
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

          {/* 媒体 */}
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

          {/* 自定义属性（从父产品继承的模板） */}
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
        </div>
      </div>

      {/* 悬浮按钮 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 flex justify-end gap-4 z-50">
        <button type="button" onClick={() => router.back()} className="bg-gray-300 px-4 py-2 rounded">取消</button>
        <button type="submit" disabled={saving} className="bg-blue-600 text-white px-6 py-2 rounded disabled:bg-gray-400">
          {saving ? '保存中...' : '保存变体'}
        </button>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </form>
  );
}