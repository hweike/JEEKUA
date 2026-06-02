'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCategoryTree from './ProductCategoryTree';

interface Product {
  productId: string;
  productName: string;
  sku: string;
  mainImage?: string;
  price?: number;
}

interface ProductSelectorDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (selectedIds: string[]) => void;
  maxSelection?: number;
  initialSelectedIds?: string[];
  locale: string;
}

export default function ProductSelectorDialog({
  open,
  onClose,
  onConfirm,
  maxSelection = 10,
  initialSelectedIds = [],
  locale,
}: ProductSelectorDialogProps) {
  const [mounted, setMounted] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialSelectedIds));
  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [seriesId, setSeriesId] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        locale,
        keyword,
        categoryId,
        page: String(page),
        size: String(pageSize),
      });
      if (seriesId) params.set('seriesId', seriesId);
      const res = await fetch(`/api/admin/products/search?${params.toString()}`);
      const data = await res.json();
      const items = (data.items || []).map((p: any) => ({
        productId: p.productId,
        productName: p.productName,
        sku: p.sku,
        mainImage: p.mainImage || p.main_image_url,
        price: p.price,
      }));
      setProducts(items);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [locale, keyword, categoryId, seriesId, page]);

  useEffect(() => {
    if (open) {
      fetchProducts();
    }
  }, [open, fetchProducts]);

  const handleSelect = (productId: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      if (selectedIds.size >= maxSelection) {
        alert(`最多只能选择 ${maxSelection} 个产品`);
        return;
      }
      newSet.add(productId);
    } else {
      newSet.delete(productId);
    }
    setSelectedIds(newSet);
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selectedIds));
    onClose();
  };

  const clearSearch = () => {
    setKeyword('');
    setCategoryId('');
    setSeriesId('');
    setPage(1);
  };

  if (!mounted || !open) return null;

  const dialogContent = (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-white rounded-lg shadow-xl w-[900px] max-w-[90vw] h-[70vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">选择产品（最多{maxSelection}个）</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 flex overflow-hidden">
          <div className="w-1/4 border-r overflow-y-auto p-2">
            <ProductCategoryTree
              locale={locale}
              onSelect={(catId, sId) => {
                setCategoryId(catId);
                setSeriesId(sId);
                setPage(1);
              }}
              selectedCategoryId={categoryId}
              selectedSeriesId={seriesId}
            />
          </div>
          <div className="flex-1 flex flex-col overflow-hidden p-4">
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="输入产品名称或SKU搜索"
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                className="border rounded px-2 py-1 flex-1"
              />
              <button onClick={() => { setPage(1); fetchProducts(); }} className="bg-blue-600 text-white px-3 py-1 rounded">
                搜索
              </button>
              {(keyword || categoryId) && (
                <button onClick={clearSearch} className="text-gray-500 text-sm">清除筛选</button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="text-center py-10">加载中...</div>
              ) : products.length === 0 ? (
                <div className="text-center py-10 text-gray-500">暂无产品</div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {products.map(p => (
                    <label key={p.productId} className="flex items-start gap-2 p-2 border rounded hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(p.productId)}
                        onChange={e => handleSelect(p.productId, e.target.checked)}
                        className="mt-1"
                      />
                      {p.mainImage ? (
                        <img src={p.mainImage} alt={p.productName} className="w-12 h-12 object-cover rounded" />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">无图</div>
                      )}
                      <div className="flex-1">
                        <div className="font-medium text-sm line-clamp-2">{p.productName}</div>
                        <div className="text-xs text-gray-500">SKU: {p.sku}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {total > pageSize && (
              <div className="flex justify-between items-center mt-3 text-sm">
                <span>共 {total} 项</span>
                <div className="flex gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    className="px-2 py-1 border rounded disabled:opacity-50"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span>第 {page} / {Math.ceil(total / pageSize)} 页</span>
                  <button
                    disabled={page >= Math.ceil(total / pageSize)}
                    onClick={() => setPage(p => p + 1)}
                    className="px-2 py-1 border rounded disabled:opacity-50"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="border-t p-3 flex justify-between items-center">
          <div className="text-sm text-gray-600">已选择 {selectedIds.size} 个产品</div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1 border rounded">取消</button>
            <button onClick={handleConfirm} className="px-3 py-1 bg-blue-600 text-white rounded">确定</button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
}