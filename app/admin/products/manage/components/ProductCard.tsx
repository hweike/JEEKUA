'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import ProxyImage from '@/components/ProxyImage';
import { Edit, Trash2, Plus, ChevronDown, ChevronRight } from 'lucide-react';

interface ProductCardProps {
  product: any;
  locale: string;
  onDelete: (productId: string) => void;
  onEditVariant: (parentId: string, variant: any) => void;
  isSelected: boolean;
  onSelectChange: (id: string) => void;
  categoryPath?: string;
}

function getPriceRange(p: any) {
  // 确保 price_tiers 是数组
  const tiers = Array.isArray(p.price_tiers) ? p.price_tiers : [];
  if (tiers.length === 0) return '联系客服报价';
  const prices = tiers.map((t: any) => t.price).filter((v: any) => typeof v === 'number');
  if (prices.length === 0) return '-';
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return `${min} ${p.currency}`;
  return `${min} - ${max} ${p.currency}`;
}

const statusMap: Record<string, { label: string; className: string }> = {
  published: { label: '上架', className: 'bg-green-100 text-green-800' },
  offline: { label: '下架', className: 'bg-red-100 text-red-800' },
  draft: { label: '草稿', className: 'bg-gray-100 text-gray-800' },
};

export function ProductCard({
  product,
  locale,
  onDelete,
  onEditVariant,
  isSelected,
  onSelectChange,
  categoryPath,
}: ProductCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<any[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(false);

  const imageUrl = product.main_image_url;
  const productName = product.product_name;
  const productSku = product.sku;
  const minOrderQty = product.min_order_quantity;

  const loadChildren = useCallback(async () => {
    if (children.length > 0 || loadingChildren) return;
    setLoadingChildren(true);
    try {
      const res = await fetch(`/api/admin/products/manage?parentId=${product.productId}&locale=${locale}`);
      const data = await res.json();
      setChildren(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingChildren(false);
    }
  }, [product.productId, locale, children.length, loadingChildren]);

  const toggleExpand = () => {
    if (!expanded && children.length === 0 && !loadingChildren) {
      loadChildren();
    }
    setExpanded(!expanded);
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onSelectChange(product.productId);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(product.productId);
  };

  const handleEditVariant = (e: React.MouseEvent, parentId: string, variant: any) => {
    e.stopPropagation();
    onEditVariant(parentId, variant);
  };

  const handleAddVariant = (e: React.MouseEvent) => {
    e.stopPropagation();
    // 直接通过 Link 跳转，无需额外处理
  };

  return (
    <div className="border rounded-lg bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* 整个卡片主体点击区域（除操作按钮、复选框） */}
      <div className="cursor-pointer" onClick={toggleExpand}>
        <div className="flex p-4 gap-4">
          {/* 复选框区域，阻止冒泡 */}
          <div className="flex-shrink-0 pt-2" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={handleCheckboxChange}
              className="w-4 h-4"
            />
          </div>

          {/* 图片 */}
          <div className="flex-shrink-0 w-[150px] h-[150px] bg-gray-100 rounded overflow-hidden relative">
            {imageUrl ? (
              <ProxyImage
                src={imageUrl}
                alt={productName}
                fill
                className="object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>

          {/* 信息区 */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex justify-between items-start gap-4">
              {/* 标题容器：限制宽度，2行截断 */}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 break-words line-clamp-2">
                  {productName}
                </h3>
              </div>
              {/* 右侧操作按钮，固定宽度不收缩 */}
              <div className="flex gap-2 items-center flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <span className={`text-xs px-2 py-1 rounded-full ${statusMap[product.status]?.className || 'bg-gray-100'}`}>
                  {statusMap[product.status]?.label || product.status}
                </span>
                <Link
                  href={`/admin/products/manage/edit?locale=${locale}&categoryId=${product.categoryId}&seriesId=${product.seriesId || ''}&productId=${product.productId}`}
                  className="text-blue-600 hover:text-blue-800"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Edit size={18} />
                </Link>
                <button onClick={handleDelete} className="text-red-600 hover:text-red-800">
                  <Trash2 size={18} />
                </button>
                <Link
                  href={`/admin/products/manage/variant/edit?parentId=${product.productId}&locale=${locale}`}
                  className="text-green-600 hover:text-green-800"
                  onClick={handleAddVariant}
                >
                  <Plus size={18} />
                </Link>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand();
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </button>
              </div>
            </div>

            <div className="mt-1 space-y-1">
              <div className="text-sm text-gray-600">SKU: {productSku}</div>
              <div className="text-gray-800">价格: {getPriceRange(product)}</div>
              <div className="text-sm text-gray-600">最小起订量: {minOrderQty} 件</div>
              {categoryPath && (
                <div className="text-sm text-gray-500">分类: {categoryPath}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 变体列表 */}
      {expanded && (
        <div className="border-t bg-gray-50 p-4 space-y-2">
          <div className="flex justify-between items-center">
            <div className="text-sm font-medium text-gray-700">变体列表</div>
            <Link
              href={`/admin/products/manage/variant/edit?parentId=${product.productId}&locale=${locale}`}
              className="text-green-700 hover:text-green-700 flex items-center gap-1 whitespace-nowrap flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <Plus size={16} /> 添加产品变体
            </Link>
          </div>
          {loadingChildren ? (
            <div className="text-center py-2 text-gray-500">加载中...</div>
          ) : children.length === 0 ? (
            <div className="text-center py-2 text-gray-400">暂无变体</div>
          ) : (
            children.map((child) => (
              <div key={child.productId} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden relative">
                    {child.main_image_url && (
                      <ProxyImage
                        src={child.main_image_url}
                        alt={child.product_name}
                        fill
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{child.product_name}</div>
                    <div className="text-gray-500">SKU: {child.sku}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={(e) => handleEditVariant(e, product.productId, child)} className="text-blue-600">
                    <Edit size={16} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onDelete(child.productId); }} className="text-red-600">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}