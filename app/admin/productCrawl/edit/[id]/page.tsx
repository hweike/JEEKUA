// app/admin/productCrawl/edit/[id]/page.tsx

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Save,
  ArrowLeft,
  Trash2,
  Loader2,
  Info,
  Plus,
  X,
  Edit,
  Check,
  AlertCircle
} from 'lucide-react';
import Toast from '@/components/Toast';
import ProductImageManager from '@/components/ProductImageManager';
import InfoTooltip from '@/components/InfoTooltip';
import dayjs from 'dayjs';
import VariantsManager from './components/VariantsManager';

// 🔥 动态导入富文本编辑器
const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), {
  ssr: false,
  loading: () => <div className="border rounded p-4 h-48 bg-gray-50 animate-pulse">加载编辑器...</div>
});

// ============================================================
// 常量
// ============================================================

const EXCHANGE_RATE = 6.7; // 1 USD = 6.7 RMB

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD (1 USD = 6.7 RMB)' },
  { value: 'CNY', label: 'CNY (1 USD = 6.7 RMB)' },
];

// ============================================================
// 货币换算工具函数
// ============================================================

function convertPrice(price: number, fromCurrency: string, toCurrency: string): number {
  if (!price || price === 0) {
    return 0;
  }
  if (fromCurrency === toCurrency) {
    return price;
  }
  
  let result = price;
  
  // USD → CNY: 乘以汇率
  if (fromCurrency === 'USD' && toCurrency === 'CNY') {
    result = price * EXCHANGE_RATE;
  }
  // CNY → USD: 除以汇率
  else if (fromCurrency === 'CNY' && toCurrency === 'USD') {
    result = price / EXCHANGE_RATE;
  }
  
  // 四舍五入保留2位小数
  return Math.round(result * 100) / 100;
}

// ============================================================
// 类型定义
// ============================================================

interface CrawlProduct {
  crawler_id: string;
  site_id: string;
  locale: string;
  product_id: string;
  product_line_id?: string;
  category_id: string;
  series_id?: string;
  parent_product_id?: string;
  sku: string;
  product_name: string;
  brand?: string;
  price_tiers: any;
  currency: string;
  availability: string;
  min_order_quantity: number;
  main_image_url?: string;
  additional_images?: string[];
  description?: string;
  short_description?: string;
  attributes?: Record<string, string>;
  spec_text?: string;
  slug?: string;
  platform: string;
  source_url: string;
  source_product_id?: string;
  source_locale: string;
  collected_at: string;
  collected_by: string;
  import_status: 'pending' | 'imported' | 'skipped' | 'failed';
  imported_at?: string;
  import_error?: string;
  created_at: string;
  updated_at: string;
  sku_list?: any[];
}

interface SkuVariant {
  id: string;
  name: string;
  price?: number | null;
  stock?: number | null;
  sku_code?: string;
  attributes?: Record<string, string>;
  image_url?: string;
  currency?: string;
}

// ============================================================
// 子组件
// ============================================================

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-blue-100', text: 'text-blue-700', label: '待导入' },
    imported: { bg: 'bg-green-100', text: 'text-green-700', label: '已导入' },
    skipped: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '已跳过' },
    failed: { bg: 'bg-red-100', text: 'text-red-700', label: '导入失败' }
  };
  const s = config[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

function PlatformBadge({ platform }: { platform: string }) {
  const config: Record<string, string> = {
    alibaba: '阿里国际站',
    '1688': '1688',
    amazon: 'Amazon',
    ebay: 'eBay'
  };
  return <span>{config[platform] || platform}</span>;
}

// ============================================================
// 确认对话框
// ============================================================

function ConfirmDialog({
  open,
  title,
  content,
  confirmText = '确认',
  cancelText = '取消',
  danger = false,
  onConfirm,
  onCancel
}: {
  open: boolean;
  title: string;
  content: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-6">{content}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 属性行组件
// ============================================================

function AttributeRow({
  keyName,
  value,
  onKeyChange,
  onValueChange,
  onRemove
}: {
  keyName: string;
  value: string;
  onKeyChange: (val: string) => void;
  onValueChange: (val: string) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="text"
        value={keyName}
        onChange={(e) => onKeyChange(e.target.value)}
        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        placeholder="属性名称（如：材质）"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        placeholder="属性值（如：EVA）"
      />
      <button
        onClick={onRemove}
        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
        type="button"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ============================================================
// 主编辑组件
// ============================================================

export default function ProductCrawlEditPage() {
  const router = useRouter();
  const params = useParams();
  const crawlerId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingVariant, setSavingVariant] = useState(false);
  const [product, setProduct] = useState<CrawlProduct | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [activeTab, setActiveTab] = useState<'product' | 'variants'>('product');
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    content: string;
    danger?: boolean;
    onConfirm: () => void;
  }>({
    open: false,
    title: '',
    content: '',
    onConfirm: () => {}
  });

  // 属性行状态
  const [newAttributeKey, setNewAttributeKey] = useState('');
  const [newAttributeValue, setNewAttributeValue] = useState('');

  // 🔥 变体状态
  const [variants, setVariants] = useState<SkuVariant[]>([]);

  // 🔥 显示货币（全局）
  const [displayCurrency, setDisplayCurrency] = useState<string>('USD');

  // 🔥 产品价格状态
  const [productPrice, setProductPrice] = useState<string>('');
  const [productCurrency, setProductCurrency] = useState<string>('USD');

  // ============================================================
  // 🔥 数据加载 - 从 variants API 获取变体
  // ============================================================

  const loadProduct = useCallback(async () => {
    setLoading(true);
    try {
      // 1. 加载父商品数据
      const response = await fetch(`/api/admin/productCrawl/${crawlerId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('商品不存在');
        }
        const result = await response.json();
        throw new Error(result.error || '加载失败');
      }

      const result = await response.json();
      console.log('[loadProduct] 父商品加载成功, crawlerId:', crawlerId);
      
      // 2. 🔥 从 variants API 加载变体
      let skuList: SkuVariant[] = [];
      try {
        const variantsResponse = await fetch(`/api/admin/productCrawl/${crawlerId}/variants`);
        if (variantsResponse.ok) {
          const variantsData = await variantsResponse.json();
          if (variantsData.variants && variantsData.variants.length > 0) {
            skuList = variantsData.variants;
            console.log('[loadProduct] 从 variants API 加载变体:', skuList.length);
          }
        }
      } catch (e) {
        console.warn('[loadProduct] 从 variants API 加载失败', e);
      }
      
      // 3. 如果 variants API 没有数据，使用 sku_list 作为降级
      if (skuList.length === 0 && result.sku_list) {
        let fallbackList = result.sku_list;
        if (typeof fallbackList === 'string') {
          try {
            fallbackList = JSON.parse(fallbackList);
          } catch (e) {
            fallbackList = [];
          }
        }
        skuList = fallbackList.map((v: any, idx: number) => ({
          ...v,
          id: v.id || v.sku_code || `variant_${idx}`,
          currency: v.currency || result.currency || 'USD'
        }));
        console.log('[loadProduct] 从 sku_list 降级加载变体:', skuList.length);
      }
      
      console.log('[loadProduct] 最终变体数量:', skuList.length);
      
      // 4. 设置状态
      setProduct({
        ...result,
        sku_list: skuList
      });
      setVariants(skuList);
      
      // 5. 设置货币和价格
      const currency = result.currency || 'USD';
      setDisplayCurrency(currency);
      setProductCurrency(currency);
      
      const priceTiers = result.price_tiers || [];
      let price = 0;
      if (priceTiers.length > 0) {
        price = priceTiers[0].price || 0;
      }
      setProductPrice(price > 0 ? price.toString() : '');
      
    } catch (error) {
      console.error('加载商品失败:', error);
      setToast({ 
        message: '加载商品失败: ' + (error instanceof Error ? error.message : '未知错误'), 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  }, [crawlerId]);

  useEffect(() => {
    if (crawlerId) {
      loadProduct();
    }
  }, [crawlerId, loadProduct]);

  // ============================================================
  // 字段更新
  // ============================================================

  const updateField = (field: string, value: any) => {
    if (product) {
      setProduct({ ...product, [field]: value });
    }
  };

  // ============================================================
  // 🔥 货币切换（全局）- 同时通知 VariantsManager
  // ============================================================

  const handleDisplayCurrencyChange = (newCurrency: string) => {
    console.log(`[handleDisplayCurrencyChange] 切换显示货币: ${displayCurrency} -> ${newCurrency}`);
    setDisplayCurrency(newCurrency);
  };

  // ============================================================
  // 🔥 产品价格处理
  // ============================================================

  const handleProductPriceChange = (value: string) => {
    setProductPrice(value);
    
    const priceNum = parseFloat(value);
    if (!isNaN(priceNum) && priceNum > 0 && product) {
      const newPriceTiers = [...(product.price_tiers || [])];
      if (newPriceTiers.length === 0) {
        newPriceTiers.push({ min_qty: 1, max_qty: null, price: priceNum, currency: displayCurrency });
      } else {
        newPriceTiers[0].price = priceNum;
        newPriceTiers[0].currency = displayCurrency;
      }
      updateField('price_tiers', newPriceTiers);
      updateField('currency', displayCurrency);
      setProductCurrency(displayCurrency);
    }
  };

  // ============================================================
  // 属性管理
  // ============================================================

  const addAttribute = () => {
    if (!product) return;
    const key = newAttributeKey.trim();
    const value = newAttributeValue.trim();
    
    if (!key) {
      setToast({ message: '请输入属性名称', type: 'info' });
      return;
    }
    
    const newAttributes = { ...(product.attributes || {}) };
    newAttributes[key] = value || '';
    updateField('attributes', newAttributes);
    
    setNewAttributeKey('');
    setNewAttributeValue('');
  };

  const removeAttribute = (key: string) => {
    if (product) {
      const newAttributes = { ...(product.attributes || {}) };
      delete newAttributes[key];
      updateField('attributes', newAttributes);
    }
  };

  const updateAttributeKey = (oldKey: string, newKey: string) => {
    if (!product || !newKey.trim()) return;
    const attrs = { ...(product.attributes || {}) };
    const value = attrs[oldKey];
    delete attrs[oldKey];
    attrs[newKey.trim()] = value || '';
    updateField('attributes', attrs);
  };

  const updateAttributeValue = (key: string, value: string) => {
    if (!product) return;
    const newAttributes = { ...(product.attributes || {}) };
    newAttributes[key] = value;
    updateField('attributes', newAttributes);
  };

  // ============================================================
  // 🔥 保存单个变体
  // ============================================================

  const handleSaveSingleVariant = async (variant: SkuVariant) => {
    console.log('[handleSaveSingleVariant] 保存单个变体:', variant);
    
    setSavingVariant(true);
    try {
      const updatedVariants = variants.map(v => {
        if (v.id === variant.id) {
          return {
            ...v,
            name: variant.name,
            price: variant.price,
            currency: variant.currency,
            stock: variant.stock,
            sku_code: variant.sku_code,
            attributes: variant.attributes,
            image_url: variant.image_url,
          };
        }
        return v;
      });

      console.log('[handleSaveSingleVariant] 完整变体列表数量:', updatedVariants.length);
      console.log('[handleSaveSingleVariant] 更新的变体 ID:', variant.id);
      
      const response = await fetch(`/api/admin/productCrawl/${crawlerId}/variants`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variants: updatedVariants,
          displayCurrency: displayCurrency
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '保存变体失败');
      }

      console.log('[handleSaveSingleVariant] 保存成功, 共', result.count, '个变体');
      
      setVariants(updatedVariants);
      
      setToast({ message: `变体 "${variant.name}" 保存成功！`, type: 'success' });
      
    } catch (error) {
      console.error('[handleSaveSingleVariant] 失败:', error);
      setToast({ message: '保存变体失败: ' + (error instanceof Error ? error.message : '未知错误'), type: 'error' });
      throw error;
    } finally {
      setSavingVariant(false);
    }
  };

  // ============================================================
  // 🔥 保存全部
  // ============================================================

  const handleSave = async () => {
    if (!product) return;

    setSaving(true);
    try {
      const saveData = {
        ...product,
        sku_list: variants,
        price_tiers: product.price_tiers || [{ min_qty: 1, max_qty: null, price: parseFloat(productPrice) || 0, currency: displayCurrency }],
        currency: displayCurrency
      };

      const response = await fetch(`/api/admin/productCrawl/${crawlerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saveData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '保存失败');
      }

      setToast({ message: '保存成功！', type: 'success' });
      
      await loadProduct();
      
    } catch (error) {
      console.error('保存失败:', error);
      setToast({ message: '保存失败: ' + (error instanceof Error ? error.message : '未知错误'), type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setConfirmDialog({
      open: true,
      title: '确认删除',
      content: '确定要删除这条采集数据吗？此操作不可恢复！',
      danger: true,
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, open: false });
        try {
          const response = await fetch(`/api/admin/productCrawl/${crawlerId}`, {
            method: 'DELETE'
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error || '删除失败');
          }

          setToast({ message: '删除成功！', type: 'success' });
          setTimeout(() => router.push('/admin/productCrawl'), 500);
        } catch (error) {
          console.error('删除失败:', error);
          setToast({ message: '删除失败: ' + (error instanceof Error ? error.message : '未知错误'), type: 'error' });
        }
      }
    });
  };

  // ============================================================
  // 计算产品显示价格
  // ============================================================

  const productDisplayPrice = useMemo(() => {
    const price = parseFloat(productPrice);
    if (isNaN(price) || price === 0) return '';
    if (productCurrency !== displayCurrency) {
      return convertPrice(price, productCurrency, displayCurrency).toFixed(2);
    }
    return price.toFixed(2);
  }, [productPrice, productCurrency, displayCurrency]);

  // ============================================================
  // 渲染
  // ============================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-gray-400">
          <p>商品不存在</p>
          <button
            onClick={() => router.push('/admin/productCrawl')}
            className="mt-4 text-blue-600 hover:underline"
          >
            返回列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        content={confirmDialog.content}
        danger={confirmDialog.danger}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, open: false })}
      />

      {/* ===== 头部 ===== */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/productCrawl')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">编辑采集商品</h1>
            <p className="text-sm text-gray-500">ID: {product.crawler_id}</p>
          </div>
          <StatusBadge status={product.import_status} />
          <PlatformBadge platform={product.platform} />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            删除
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? '保存中...' : '保存全部'}
          </button>
        </div>
      </div>

      {/* ===== Tab 切换 ===== */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('product')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'product'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            产品信息
          </button>
          <button
            onClick={() => setActiveTab('variants')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'variants'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            产品变体 ({variants.length})
          </button>
        </div>
      </div>

      {/* ===== 内容 ===== */}
      {activeTab === 'product' ? (
        <div className="flex flex-wrap gap-6">
          {/* 左侧 60% */}
          <div className="w-[60%] space-y-6">
            {/* 基础信息卡片 */}
            <div className="border rounded-lg p-4 bg-white shadow-sm">
              <h2 className="text-lg font-semibold mb-3">基础信息</h2>
              <div className="space-y-3">
                <div>
                  <label className="block font-medium mb-1 flex items-center gap-2">
                    产品名称 *
                    <InfoTooltip content="从源平台采集的产品标题" />
                  </label>
                  <input
                    type="text"
                    value={product.product_name || ''}
                    onChange={(e) => updateField('product_name', e.target.value)}
                    className="border rounded p-2 w-full"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 flex items-center gap-2">
                    SKU
                    <InfoTooltip content="从源平台采集的SKU" />
                  </label>
                  <input
                    type="text"
                    value={product.sku || ''}
                    onChange={(e) => updateField('sku', e.target.value)}
                    className="border rounded p-2 w-full"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 flex items-center gap-2">
                    品牌
                    <InfoTooltip content="从源平台采集的品牌信息" />
                  </label>
                  <input
                    type="text"
                    value={product.brand || ''}
                    onChange={(e) => updateField('brand', e.target.value)}
                    className="border rounded p-2 w-full"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 flex items-center gap-2">
                    Slug
                    <InfoTooltip content="URL友好标识" />
                  </label>
                  <input
                    type="text"
                    value={product.slug || ''}
                    onChange={(e) => updateField('slug', e.target.value)}
                    className="border rounded p-2 w-full"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 flex items-center gap-2">
                    简易描述
                    <InfoTooltip content="从属性拼接的简短描述" />
                  </label>
                  <textarea
                    value={product.short_description || ''}
                    onChange={(e) => updateField('short_description', e.target.value)}
                    rows={4}
                    className="border rounded p-2 w-full"
                  />
                </div>
              </div>
            </div>

            {/* 媒体与描述卡片 */}
            <div className="border rounded-lg p-4 bg-white shadow-sm">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                媒体与描述
                <InfoTooltip content="从源平台采集的图片和描述" />
              </h2>
              <div className="space-y-4">
                <ProductImageManager
                  mainImage={product.main_image_url || ''}
                  additionalImages={product.additional_images || []}
                  onMainImageChange={(url) => updateField('main_image_url', url)}
                  onAdditionalImagesChange={(urls) => updateField('additional_images', urls)}
                />
                <div>
                  <label className="block font-medium mb-1">完整描述</label>
                  <RichTextEditor
                    value={product.description || ''}
                    onChange={(val) => updateField('description', val)}
                  />
                </div>
              </div>
            </div>

            {/* 属性卡片 */}
            <div className="border rounded-lg p-4 bg-white shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">产品属性</h2>
              </div>
              <div className="space-y-3">
                {product.attributes && Object.keys(product.attributes).length > 0 ? (
                  Object.entries(product.attributes).map(([key, value]) => (
                    <AttributeRow
                      key={key}
                      keyName={key}
                      value={value}
                      onKeyChange={(newKey) => updateAttributeKey(key, newKey)}
                      onValueChange={(newValue) => updateAttributeValue(key, newValue)}
                      onRemove={() => removeAttribute(key)}
                    />
                  ))
                ) : (
                  <p className="text-gray-400 text-sm">暂无属性，请在下方添加</p>
                )}

                <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                  <input
                    type="text"
                    value={newAttributeKey}
                    onChange={(e) => setNewAttributeKey(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="新属性名称（如：材质）"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addAttribute();
                      }
                    }}
                  />
                  <input
                    type="text"
                    value={newAttributeValue}
                    onChange={(e) => setNewAttributeValue(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="新属性值（如：EVA）"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addAttribute();
                      }
                    }}
                  />
                  <button
                    onClick={addAttribute}
                    className="flex items-center gap-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap"
                    type="button"
                  >
                    <Plus className="w-4 h-4" />
                    添加
                  </button>
                </div>
                <p className="text-xs text-gray-400">按 Enter 键快速添加属性</p>
              </div>
            </div>
          </div>

          {/* 右侧 35% */}
          <div className="w-[35%] space-y-6">
            {/* 🔥 价格卡片 */}
            <div className="border rounded-lg p-4 bg-white shadow-sm">
              <h2 className="text-lg font-semibold mb-3">价格与库存</h2>
              <div className="space-y-3">
                <div>
                  <label className="block font-medium mb-1">货币</label>
                  <select
                    value={displayCurrency}
                    onChange={(e) => handleDisplayCurrencyChange(e.target.value)}
                    className="border rounded p-2 w-full"
                  >
                    {CURRENCY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">价格 ({displayCurrency})</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={productDisplayPrice}
                      onChange={(e) => handleProductPriceChange(e.target.value)}
                      className="flex-1 border rounded p-2"
                      placeholder="输入价格"
                    />
                    <span className="flex items-center text-sm text-gray-500">{displayCurrency}</span>
                  </div>
                  {productCurrency !== displayCurrency && (
                    <p className="text-xs text-gray-400 mt-1">
                      存储货币: {productCurrency}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block font-medium mb-1">最小起订量</label>
                  <input
                    type="number"
                    value={product.min_order_quantity || 1}
                    onChange={(e) => updateField('min_order_quantity', parseInt(e.target.value) || 1)}
                    className="border rounded p-2 w-full"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">库存状态</label>
                  <select
                    value={product.availability || 'in_stock'}
                    onChange={(e) => updateField('availability', e.target.value)}
                    className="border rounded p-2 w-full"
                  >
                    <option value="in_stock">现货</option>
                    <option value="out_of_stock">缺货</option>
                    <option value="preorder">预定</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 平台信息卡片 */}
            <div className="border rounded-lg p-4 bg-white shadow-sm">
              <h2 className="text-lg font-semibold mb-3">平台信息</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">平台</span>
                  <span><PlatformBadge platform={product.platform} /></span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">采集时间</span>
                  <span>{dayjs(product.collected_at).format('YYYY-MM-DD HH:mm:ss')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">来源产品ID</span>
                  <span className="font-mono text-xs truncate max-w-[150px]">{product.source_product_id}</span>
                </div>
                <div>
                  <span className="text-gray-500 block mb-1">来源URL</span>
                  <a
                    href={product.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-xs break-all"
                  >
                    {product.source_url}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ===== 变体标签 - 使用独立组件，传递 displayCurrency 和 onCurrencyChange ===== */
        <VariantsManager
          key={`variants-${displayCurrency}`}
          variants={variants}
          displayCurrency={displayCurrency}
          onVariantsChange={setVariants}
          onCurrencyChange={handleDisplayCurrencyChange}
          onSaveVariant={handleSaveSingleVariant}
          saving={savingVariant}
        />
      )}
    </div>
  );
}