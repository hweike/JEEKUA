'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCategoryTree from './ProductCategoryTree';

export interface Product {
  productId: string;
  productName: string;
  sku: string;
  mainImage?: string;
  price?: number;
}

// ✅ 模块级缓存：key = `${locale}|${keyword}|${categoryId}|${seriesId}|${page}`
const productsCache = new Map<string, { items: Product[]; total: number; timestamp: number }>();
const PRODUCTS_TTL = 60 * 1000; // 1 分钟

// ✅ 请求去重：同 key 同时只发一次
const inflightRequests = new Map<string, Promise<{ items: Product[]; total: number }>>();

interface ProductSelectorDialogProps {
  open: boolean;
  onClose: () => void;
  /** ✅ 改造：回调返回完整产品对象数组 */
  onConfirm: (products: Product[]) => void;
  maxSelection?: number;
  /** ✅ 改造：传入完整产品对象数组作为初始选中项 */
  initialSelectedProducts?: Product[];
  locale: string;
}

export default function ProductSelectorDialog({
  open,
  onClose,
  onConfirm,
  maxSelection = 10,
  initialSelectedProducts = [],
  locale,
}: ProductSelectorDialogProps) {
  const [mounted, setMounted] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // ✅ 用 Map 保存所有已选中的产品对象（跨页保留）
  const [selectedProductsMap, setSelectedProductsMap] = useState<Map<string, Product>>(
    () => new Map(initialSelectedProducts.map((p) => [p.productId, p]))
  );

  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [seriesId, setSeriesId] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // ✅ 用 ref 保存最新请求的 key，防止旧响应覆盖新响应
  const lastRequestKeyRef = useRef<string>('');

  useEffect(() => {
    setMounted(true);
  }, []);

  // ✅ 当外部 initialSelectedProducts 变化时（例如属性面板重新打开对话框），同步到内部状态
  useEffect(() => {
    if (open) {
      setSelectedProductsMap(new Map(initialSelectedProducts.map((p) => [p.productId, p])));
    }
    // 仅在 open 变化时重置，避免因 initialSelectedProducts 引用变化而反复重置
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fetchProducts = useCallback(async () => {
    const cacheKey = `${locale}|${keyword}|${categoryId}|${seriesId}|${page}`;
    lastRequestKeyRef.current = cacheKey;

    // ✅ 1. 命中模块级缓存，直接用
    const cached = productsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < PRODUCTS_TTL) {
      setProducts(cached.items);
      setTotal(cached.total);
      setLoading(false);
      return;
    }

    // ✅ 2. 同 key 已有请求在飞，复用它（去重）
    let promise = inflightRequests.get(cacheKey);
    if (!promise) {
      setLoading(true);
      promise = (async () => {
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
          const result = { items, total: data.total || 0 };
          productsCache.set(cacheKey, { ...result, timestamp: Date.now() });
          return result;
        } finally {
          inflightRequests.delete(cacheKey);
        }
      })();
      inflightRequests.set(cacheKey, promise);
    }

    try {
      const result = await promise;
      // ✅ 防止旧响应覆盖新响应
      if (lastRequestKeyRef.current !== cacheKey) return;
      setProducts(result.items);
      setTotal(result.total);
    } catch (err) {
      console.error(err);
    } finally {
      if (lastRequestKeyRef.current === cacheKey) {
        setLoading(false);
      }
    }
  }, [locale, keyword, categoryId, seriesId, page]);

  useEffect(() => {
    if (open) {
      fetchProducts();
    }
  }, [open, fetchProducts]);

  // ✅ 改造：接收完整产品对象
  const handleSelect = (product: Product, checked: boolean) => {
    const newMap = new Map(selectedProductsMap);
    if (checked) {
      if (newMap.size >= maxSelection && !newMap.has(product.productId)) {
        alert(`最多只能选择 ${maxSelection} 个产品`);
        return;
      }
      newMap.set(product.productId, product);
    } else {
      newMap.delete(product.productId);
    }
    setSelectedProductsMap(newMap);
  };

  // ✅ 改造：传出完整产品对象数组
  const handleConfirm = () => {
    onConfirm(Array.from(selectedProductsMap.values()));
    onClose();
  };

  // ✅ 用于显示已选数量
  const selectedIds = new Set(selectedProductsMap.keys());

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
                onChange={(e) => setKeyword(e.target.value)}
                className="border rounded px-2 py-1 flex-1"
              />
              <button
                onClick={() => {
                  setPage(1);
                  fetchProducts();
                }}
                className="bg-blue-600 text-white px-3 py-1 rounded"
              >
                搜索
              </button>
              {(keyword || categoryId) && (
                <button onClick={clearSearch} className="text-gray-500 text-sm">
                  清除筛选
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="text-center py-10">加载中...</div>
              ) : products.length === 0 ? (
                <div className="text-center py-10 text-gray-500">暂无产品</div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {products.map((p) => (
                    <label
                      key={p.productId}
                      className="flex items-start gap-2 p-2 border rounded hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(p.productId)}
                        onChange={(e) => handleSelect(p, e.target.checked)}
                        className="mt-1"
                      />
                      {p.mainImage ? (
                        <img
                          src={p.mainImage}
                          alt={p.productName}
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">
                          无图
                        </div>
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
                    onClick={() => setPage((p) => p - 1)}
                    className="px-2 py-1 border rounded disabled:opacity-50"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span>
                    第 {page} / {Math.ceil(total / pageSize)} 页
                  </span>
                  <button
                    disabled={page >= Math.ceil(total / pageSize)}
                    onClick={() => setPage((p) => p + 1)}
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
          <div className="text-sm text-gray-600">
            已选择 {selectedProductsMap.size} 个产品
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1 border rounded">
              取消
            </button>
            <button
              onClick={handleConfirm}
              className="px-3 py-1 bg-blue-600 text-white rounded"
            >
              确定
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
}