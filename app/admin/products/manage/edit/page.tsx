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

const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), { ssr: false });

interface AttributeTemplate {
  id: string;
  name: string;
  attributes: Array<{ name: string; rule: string }>;
}

function SpecificationsInput({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  // ... 原有代码保持不变（省略以节省篇幅）...
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [productSettings, setProductSettings] = useState<any>({});
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [categoryPath, setCategoryPath] = useState<string>('');
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [attributeTemplate, setAttributeTemplate] = useState<AttributeTemplate | null>(null);
  const [titleLength, setTitleLength] = useState(0);
  const [templateList, setTemplateList] = useState<any[]>([]);

  // 新建产品时，默认选中第一个产品模板
  useEffect(() => {
    if (!settingsLoaded) return;
    if (!productId && !parentId && !form.templateId) {
      const fetchDefaultTemplate = async () => {
        try {
          const res = await fetch('/api/webbuilder?category=product');
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const firstTemplateId = data[0].id;
            setForm(prev => ({ ...prev, templateId: firstTemplateId }));
          }
          setTemplateList(data);
        } catch (err) {
          console.error('获取模板列表失败', err);
        }
      };
      fetchDefaultTemplate();
    }
  }, [settingsLoaded, productId, parentId, form.templateId]);

  // 加载系统设置
  useEffect(() => {
    fetch(`/api/admin/products/settings?locale=${locale}`)
      .then(res => res.json())
      .then(data => {
        setProductSettings(data);
        setDefaultCurrency(data.defaultSettings?.default_currency || 'USD');
        setSettingsLoaded(true);
      })
      .catch(console.error);
  }, [locale]);

  // 获取分类路径和属性模板
  useEffect(() => {
    const catId = form.categoryId || urlCategoryId;
    if (!catId || !settingsLoaded) return;
    const fetchCategoryInfo = async () => {
      try {
        const res = await fetch(`/api/admin/products/categories?locale=${locale}`);
        const data = await res.json();
        const categories = data.categories || [];
        const productLines = data.productLines || [];
        const cat = categories.find((c: any) => c.id === catId);
        if (cat) {
          const productLine = productLines.find((pl: any) => pl.id === cat.productLineId);
          let seriesName = '';
          const sid = form.seriesId || urlSeriesId;
          if (sid) {
            const series = cat.series?.find((s: any) => s.id === sid);
            if (series) seriesName = series.name;
          }
          setCategoryPath(`${productLine?.name || '无'} >> ${cat.name}${seriesName ? ` >> ${seriesName}` : ''}`);
          if (cat.attributeTemplateId && productSettings.attributeTemplates) {
            const tpl = productSettings.attributeTemplates.find((t: any) => t.id === cat.attributeTemplateId);
            if (tpl) setAttributeTemplate(tpl);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchCategoryInfo();
  }, [form.categoryId, form.seriesId, urlCategoryId, urlSeriesId, locale, productSettings.attributeTemplates, settingsLoaded]);

  // 加载产品数据
  useEffect(() => {
    if (!settingsLoaded) return;
    const loadData = async () => {
      if (productId) {
        const res = await fetch(`/api/admin/products/manage?productId=${productId}&locale=${locale}`);
        const data = await res.json();
        setForm((prev: any) => ({
          ...prev,
          id: data.id || productId,
          ...data,
          categoryId: data.categoryId || '',
          seriesId: data.seriesId || '',
          variants: data.variants || [],
          templateId: data.templateId || '',
        }));
        setTitleLength(data.product_name?.length || 0);
      } else if (parentId) {
        const res = await fetch(`/api/admin/products/manage?productId=${parentId}&locale=${locale}`);
        const data = await res.json();
        setForm((prev: any) => ({
          ...prev,
          ...data,
          product_name: `${data.product_name} (变体)`,
          sku: '',
          parent_product_id: parentId,
          categoryId: data.categoryId || '',
          seriesId: data.seriesId || '',
          variants: [],
          templateId: data.templateId || '',
        }));
        setTitleLength(`${data.product_name} (变体)`.length);
      } else {
        const defaults = productSettings.defaultSettings || {};
        setForm(prev => ({
          ...prev,
          brand: defaults.default_brand || 'Neutral',
          availability: defaults.default_availability || 'in_stock',
          min_order_quantity: defaults.default_min_order_qty || 1,
          shipping_cost: defaults.default_shipping_cost !== undefined ? defaults.default_shipping_cost : 0,
          return_policy_days: defaults.default_return_days || 30,
          categoryId: urlCategoryId,
          seriesId: urlSeriesId,
        }));
      }
      setLoading(false);
    };
    loadData();
  }, [productId, parentId, locale, productSettings, settingsLoaded, urlCategoryId, urlSeriesId]);

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

  // 已删除 handleAutoGenerate 函数

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 修改校验：SKU 不再是必填
    if (!form.product_name || !form.price_tiers?.length) {
      alert('请填写产品名称和至少一个价格阶梯');
      return;
    }

    let finalSlug = form.slug;
    if (!finalSlug || finalSlug.trim() === '') {
      finalSlug = generateSlugForProduct(form.product_name);
      setForm(prev => ({ ...prev, slug: finalSlug }));
    }

    const finalCategoryId = form.categoryId || urlCategoryId;
    const finalSeriesId = form.seriesId || urlSeriesId;

    if (!finalCategoryId) {
      alert('分类信息缺失，请返回产品列表重新编辑');
      return;
    }

    const payload = {
      id: form.id,
      product_name: form.product_name,
      sku: form.sku || '',   // SKU 可选，为空则后端生成
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
        alert('保存成功');
        router.push(`/admin/products/manage?locale=${locale}`);
      } else {
        console.error('Save failed:', result);
        alert(result.error || `保存失败 (HTTP ${res.status})`);
      }
    } catch (err: any) {
      console.error('Network error:', err);
      alert('保存失败，请检查网络');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">加载中...</div>;
  const MAX_TITLE = 128;

  return (
    <form onSubmit={handleSubmit} className="p-6 max-w-7xl mx-auto space-y-6 pb-24">
      {categoryPath && <div className="text-sm text-gray-500 mb-2">当前类目：{categoryPath}</div>}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{productId ? '编辑产品' : '新建产品'}<span>-{getLanguageDisplayName(locale, 'zh')}站</span></h1>
      </div>

      <div className="flex flex-wrap gap-6">
        {/* 左侧 60% */}
        <div className="w-[60%] space-y-6">
          <div className="border rounded-lg p-4 bg-white shadow-sm">
            <h2 className="text-lg font-semibold mb-3">基础信息</h2>
            <div className="space-y-3">
              <div>
                <label className="block font-medium mb-1 flex items-center gap-2">产品名称 *<InfoTooltip content="*必填项，可输入字符长度为128个字符。建议控制在60-70个字符（约30-35个汉字）以内。推荐使用 '品牌 + 产品名称 + 关键属性/型号' 的结构。" /></label>
                <input type="text" value={form.product_name} onChange={e => handleChange('product_name', e.target.value)} required className="border rounded p-2 w-full" />
                <div className="text-xs text-gray-500 mt-1 flex justify-between"><span>{titleLength}/{MAX_TITLE} 字符</span></div>
              </div>
              <div>
                <label className="block font-medium mb-1 flex items-center gap-2">SKU<InfoTooltip content="选填。若留空，系统将按基本设置中的SKU生成规则自动生成。" /></label>
                <input type="text" value={form.sku} onChange={e => handleChange('sku', e.target.value)} className="border rounded p-2 w-full" placeholder={!productId && !parentId ? '自动生成' : ''} />
              </div>
              <div>
                <label className="block font-medium mb-1 flex items-center gap-2">品牌<InfoTooltip content="品牌对于商品辨识至关重要，谷歌GMC要求商品数据应包含品牌信息。可在基本设置中设置统一使用的品牌，如没填写，系统将按中性品牌'Neutral'存储。" /></label>
                <input type="text" value={form.brand} onChange={e => handleChange('brand', e.target.value)} className="border rounded p-2 w-full" />
              </div>
              <div>
                <label className="block font-medium mb-1 flex items-center gap-2">简短描述<InfoTooltip content="用简短几句话高度概括产品核心卖点、应用场景，建议100-300个字符。" /></label>
                <textarea value={form.short_description} onChange={e => handleChange('short_description', e.target.value)} rows={3} className="border rounded p-2 w-full" placeholder="简短介绍产品核心卖点..." />
                <div className="text-xs text-gray-500 mt-1 text-right">{form.short_description?.length || 0}/300</div>
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-4 bg-white shadow-sm">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">媒体与描述<InfoTooltip content="为提高用户体验和SEO，建议内容充实（如500-1000字），主图必须上传。" /></h2>
            <div className="space-y-4">
              <ProductImageManager mainImage={form.main_image_url} additionalImages={form.additional_images} onMainImageChange={url => handleChange('main_image_url', url)} onAdditionalImagesChange={urls => handleChange('additional_images', urls)} />
              <div><label className="block font-medium mb-1">详细描述</label><RichTextEditor value={form.description} onChange={val => handleChange('description', val)} /></div>
            </div>
          </div>

          {attributeTemplate && attributeTemplate.attributes.length > 0 && (
            <div className="border rounded-lg p-4 bg-white shadow-sm">
              <h2 className="text-lg font-semibold mb-3">自定义属性</h2>
              <div className="space-y-3">
                {attributeTemplate.attributes.map((attr) => (
                  <div key={attr.name}>
                    <label className="block font-medium mb-1">{attr.name}</label>
                    <input type="text" placeholder={attr.rule.replace('{属性名}', attr.name)} value={form.attributes[attr.name] || ''} onChange={(e) => handleAttributeChange(attr.name, e.target.value)} className="border rounded p-2 w-full" />
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
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">商品规格说明<InfoTooltip content="按回车添加商品规格说明，例如：颜色:红色、尺寸:XL等。" /></h2>
            <SpecificationsInput value={form.spec_text || ''} onChange={val => handleChange('spec_text', val)} />
          </div>
        </div>

        {/* 右侧 35% */}
        <div className="w-[35%] space-y-6">
          <div className="border rounded-lg p-4 bg-white shadow-sm">
            <h2 className="text-lg font-semibold mb-3">状态</h2>
            <div><label className="block font-medium mb-1">上架状态</label><select value={form.status || 'published'} onChange={e => handleChange('status', e.target.value)} className="border rounded p-2 w-full"><option value="published">上架</option><option value="draft">草稿</option></select></div>
          </div>

          <div className="border rounded-lg p-4 bg-white shadow-sm">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">阶梯价格 *<InfoTooltip content="建议至少设置一个阶梯价格，谷歌GMC强制要求。起始数量≥1的整数，结束数量不填表示无上限，单价为正值保留两位小数。" /></h2>
            <PriceTiersInput value={form.price_tiers} onChange={v => handleChange('price_tiers', v)} currency={defaultCurrency} />
          </div>

          <div className="border rounded-lg p-4 bg-white shadow-sm">
            <h2 className="text-lg font-semibold mb-3">库存与物流</h2>
            <div className="space-y-3">
              <div><label className="block font-medium mb-1 flex items-center gap-2">库存状态<InfoTooltip content="建议选择有货，表示当前可以购买此商品。" /></label><select value={form.availability} onChange={e => handleChange('availability', e.target.value)} className="border rounded p-2 w-full"><option value="in_stock">现货</option><option value="out_of_stock">缺货</option><option value="preorder">预定</option></select></div>
              <div><label className="block font-medium mb-1 flex items-center gap-2">运费<InfoTooltip content="默认0（包邮），运费可在Offer中声明。" /></label><input type="text" inputMode="decimal" value={form.shipping_cost} onChange={e => handleChange('shipping_cost', parseFloat(e.target.value) || 0)} className="border rounded p-2 w-full" /></div>
              <div><label className="block font-medium mb-1 flex items-center gap-2">退货天数<InfoTooltip content="依据GMC要求，退货期应为30天或更长。提供清晰的退货政策是建立用户信任和符合GMC购物体验要求的重要一环，可显著提升购买意愿。" /></label><input type="text" inputMode="numeric" value={form.return_policy_days} onChange={e => handleChange('return_policy_days', parseInt(e.target.value) || 0)} className="border rounded p-2 w-full" /></div>
            </div>
          </div>

          {/* SEO 设置卡片 - 移除了自动生成按钮 */}
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
              <p className="text-xs text-gray-500 mt-2">选择后，产品详情页将使用该模板渲染，留空则使用系统默认模板。</p>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 flex justify-end gap-4 z-50">
        <button type="button" onClick={() => router.back()} className="bg-gray-300 px-4 py-2 rounded">取消</button>
        <button type="submit" disabled={saving} className="bg-blue-600 text-white px-6 py-2 rounded disabled:bg-gray-400">{saving ? '保存中...' : '保存产品'}</button>
      </div>
    </form>
  );
}