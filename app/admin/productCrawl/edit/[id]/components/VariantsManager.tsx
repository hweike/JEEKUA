// app/admin/productCrawl/edit/[id]/components/VariantsManager.tsx

'use client';

import { useState, useEffect, useMemo } from 'react';
import { Edit, Check, X, Trash2, Loader2 } from 'lucide-react';

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

interface VariantsManagerProps {
  variants: SkuVariant[];
  displayCurrency: string;
  onVariantsChange: (variants: SkuVariant[]) => void;
  onCurrencyChange?: (currency: string) => void;
  onSaveVariant?: (variant: SkuVariant) => Promise<void>;
  saving?: boolean;
}

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD (1 USD = 6.7 RMB)' },
  { value: 'CNY', label: 'CNY (1 USD = 6.7 RMB)' },
];

const EXCHANGE_RATE = 6.7;

function convertPrice(price: number, fromCurrency: string, toCurrency: string): number {
  if (!price || price === 0) return 0;
  if (fromCurrency === toCurrency) return price;
  
  if (fromCurrency === 'USD' && toCurrency === 'CNY') {
    return Math.round(price * EXCHANGE_RATE * 100) / 100;
  }
  if (fromCurrency === 'CNY' && toCurrency === 'USD') {
    return Math.round(price / EXCHANGE_RATE * 100) / 100;
  }
  return price;
}

// ============================================================
// 变体行组件
// ============================================================

function VariantRow({
  variant,
  index,
  displayCurrency,
  onUpdate,
  onDelete,
  onEditToggle,
  onSaveVariant,
  isEditing,
  isSaving,
}: {
  variant: SkuVariant;
  index: number;
  displayCurrency: string;
  onUpdate: (index: number, field: string, value: any) => void;
  onDelete: (index: number) => void;
  onEditToggle: (index: number) => void;
  onSaveVariant: (variant: SkuVariant) => Promise<void>;
  isEditing: boolean;
  isSaving: boolean;
}) {
  // 🔥 修复：编辑货币初始值使用 displayCurrency（与顶部货币保持一致）
  const [editName, setEditName] = useState(variant.name || '');
  const [editPrice, setEditPrice] = useState(variant.price?.toString() || '');
  const [editCurrency, setEditCurrency] = useState(displayCurrency);
  const [localSaving, setLocalSaving] = useState(false);

  // 🔥 当 variant 变化时同步编辑状态（名称同步）
  useEffect(() => {
    setEditName(variant.name || '');
    // 如果是编辑状态，价格显示为当前显示货币的价格
    if (isEditing) {
      if (variant.price !== null && variant.price !== undefined && variant.price > 0) {
        const displayPrice = convertPrice(variant.price, variant.currency || displayCurrency, displayCurrency);
        setEditPrice(displayPrice.toString());
      } else {
        setEditPrice('');
      }
      // 🔥 编辑时货币始终与顶部显示货币一致
      setEditCurrency(displayCurrency);
    } else {
      setEditPrice(variant.price?.toString() || '');
    }
  }, [variant, displayCurrency, isEditing]);

  // 🔥 当 displayCurrency 变化时，更新编辑状态中的货币和价格（关键修复）
  useEffect(() => {
    if (isEditing) {
      setEditCurrency(displayCurrency);
      // 重新计算价格（换算为当前显示货币）
      if (variant.price !== null && variant.price !== undefined && variant.price > 0) {
        const displayPrice = convertPrice(variant.price, variant.currency || displayCurrency, displayCurrency);
        setEditPrice(displayPrice.toString());
      }
    }
  }, [displayCurrency, isEditing, variant.price, variant.currency]);

  // 显示价格（换算）
  const displayPrice = useMemo(() => {
    if (variant.price !== null && variant.price !== undefined && variant.price > 0) {
      return convertPrice(variant.price, variant.currency || displayCurrency, displayCurrency);
    }
    return null;
  }, [variant.price, variant.currency, displayCurrency]);

  const handleSaveEdit = async () => {
    const priceNum = parseFloat(editPrice);
    if (isNaN(priceNum) || priceNum < 0) return;
    
    // 构建更新后的变体数据
    const updatedVariant = {
      ...variant,
      id: variant.id || `variant_${Date.now()}`,
      name: editName,
      price: priceNum,
      currency: editCurrency,
      stock: variant.stock || 0,
      sku_code: variant.sku_code || '',
      attributes: variant.attributes || {},
      image_url: variant.image_url || '',
    };
    
    // 🔥 1. 先更新本地状态（立即显示）
    onUpdate(index, 'name', editName);
    onUpdate(index, 'price', priceNum);
    onUpdate(index, 'currency', editCurrency);
    onEditToggle(index);
    
    // 🔥 2. 保存到数据库（传递完整变体数据）
    setLocalSaving(true);
    try {
      await onSaveVariant(updatedVariant);
      console.log('[VariantRow] 变体保存成功:', updatedVariant.name);
    } catch (error) {
      console.error('[VariantRow] 变体保存失败:', error);
    } finally {
      setLocalSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditName(variant.name || '');
    setEditPrice(variant.price?.toString() || '');
    // 🔥 取消时，货币设置为当前显示货币
    setEditCurrency(displayCurrency);
    onEditToggle(index);
  };

  const isLoading = isSaving || localSaving;

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="px-4 py-3 text-gray-500 text-sm">{index + 1}</td>
      <td className="px-4 py-3">
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="变体名称"
            disabled={isLoading}
          />
        ) : (
          <span className="text-sm">{variant.name || '-'}</span>
        )}
      </td>
      <td className="px-4 py-3">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.01"
              value={editPrice}
              onChange={(e) => setEditPrice(e.target.value)}
              className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="价格"
              disabled={isLoading}
            />
            <select
              value={editCurrency}
              onChange={(e) => setEditCurrency(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            >
              {CURRENCY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.value}</option>
              ))}
            </select>
          </div>
        ) : (
          <span className="text-sm font-medium">
            {displayPrice !== null ? `${displayCurrency} ${displayPrice.toFixed(2)}` : '-'}
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        {isEditing ? (
          <div className="flex items-center gap-1">
            <button
              onClick={handleSaveEdit}
              disabled={isLoading}
              className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
              title="保存"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={handleCancelEdit}
              disabled={isLoading}
              className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors disabled:opacity-50"
              title="取消"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEditToggle(index)}
              className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
              title="编辑"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(index)}
              className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
              title="删除"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

// ============================================================
// 主组件
// ============================================================

export default function VariantsManager({
  variants,
  displayCurrency,
  onVariantsChange,
  onCurrencyChange,
  onSaveVariant,
  saving = false,
}: VariantsManagerProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // 更新变体
  const handleUpdate = (index: number, field: string, value: any) => {
    const updated = variants.map((v, i) => {
      if (i === index) {
        return { ...v, [field]: value };
      }
      return v;
    });
    onVariantsChange(updated);
  };

  // 🔥 删除变体 - 直接从 variants 中移除
  const handleDelete = (index: number) => {
    const updatedVariants = variants.filter((_, i) => i !== index);
    onVariantsChange(updatedVariants);
    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  // 切换编辑状态
  const handleEditToggle = (index: number) => {
    setEditingIndex(editingIndex === index ? null : index);
  };

  // 🔥 保存单个变体到数据库 - 只传递变体数据
  const handleSaveVariant = async (variantData: SkuVariant) => {
    if (onSaveVariant) {
      await onSaveVariant(variantData);
    }
  };

  // 当 variants 从外部变化时，重置编辑状态
  useEffect(() => {
    setEditingIndex(null);
  }, [variants]);

  // 处理货币切换
  const handleCurrencyChange = (newCurrency: string) => {
    if (onCurrencyChange) {
      onCurrencyChange(newCurrency);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-700">变体列表</h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">显示货币:</span>
            <select
              value={displayCurrency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="text-sm border border-gray-300 rounded px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {CURRENCY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          {saving && (
            <span className="flex items-center gap-1 text-xs text-blue-600">
              <Loader2 className="w-3 h-3 animate-spin" />
              保存中...
            </span>
          )}
        </div>
      </div>

      {variants.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-gray-600 w-12">#</th>
                <th className="px-4 py-2 text-left text-gray-600">变体名称</th>
                <th className="px-4 py-2 text-left text-gray-600">价格 ({displayCurrency})</th>
                <th className="px-4 py-2 text-left text-gray-600 w-24">操作</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((variant, index) => (
                <VariantRow
                  key={variant.id || `variant-${index}`}
                  variant={variant}
                  index={index}
                  displayCurrency={displayCurrency}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  onEditToggle={handleEditToggle}
                  onSaveVariant={handleSaveVariant}
                  isEditing={editingIndex === index}
                  isSaving={saving}
                />
              ))}
            </tbody>
          </table>
          <div className="mt-2 text-xs text-gray-400">
            共 {variants.length} 个变体
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400">
          <p className="text-sm">暂无变体数据</p>
        </div>
      )}
    </div>
  );
}