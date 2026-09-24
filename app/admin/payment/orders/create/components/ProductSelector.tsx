// app/admin/payment/orders/create/components/ProductSelector.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Loader2, Layers } from 'lucide-react';

interface Product {
  id: string;
  product_name: string;
  sku: string;
  price: number;
  currency: string;
  main_image_url: string;
  status: string;
  _isVariant?: boolean;
  parent_product_id?: string;
  parent_product_name?: string;
  categoryId?: string;
  productLineId?: string;
  seriesId?: string;
  additional_images?: string[];
  price_tiers?: any[];
}

interface ProductSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (products: Product[]) => void;
  mode?: 'single' | 'multiple';
  maxSelect?: number;
  initialSelected?: string[];
  locale?: string;
}

const DEFAULT_IMAGE = '/images/no-image.png';

export default function ProductSelector({
  open,
  onClose,
  onSelect,
  mode = 'multiple',
  maxSelect = 10,
  initialSelected = [],
  locale = 'en',
}: ProductSelectorProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialSelected));
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ 使用 ref 管理状态，避免触发 re-render 循环
  const loadingRef = useRef(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadRef = useRef(false);
  const currentPageRef = useRef(1);
  const searchTermRef = useRef('');
  const isMountedRef = useRef(true);

  const size = 20;

  // ✅ 核心加载函数 - 通过后端 API 查询
  const loadProducts = useCallback(
    async (resetPage: boolean = true) => {
      if (!isMountedRef.current || loadingRef.current) return;

      const currentPage = resetPage ? 1 : currentPageRef.current;
      const currentSearch = searchTermRef.current;

      loadingRef.current = true;
      setLoading(resetPage);
      setLoadingMore(!resetPage);
      setError(null);

      try {
        // ✅ 通过后端 API 查询（避免浏览器端直连 Supabase 被 CF 拦截）
        const params = new URLSearchParams({
          locale,
          search: currentSearch,
          page: String(currentPage),
          size: String(size),
        });

        const res = await fetch(`/api/admin/products/selector?${params}`);
        if (!res.ok) {
          throw new Error(`请求失败: ${res.status}`);
        }

        const data = await res.json();
        const sortedItems: Product[] = data.items || [];
        const totalCount: number = data.total || 0;
        const hasMoreData: boolean = data.hasMore || false;

        if (isMountedRef.current) {
          if (resetPage) {
            setProducts(sortedItems);
          } else {
            setProducts((prev) => {
              const existingIds = new Set(prev.map((p) => p.id));
              const newItems = sortedItems.filter((p) => !existingIds.has(p.id));
              return [...prev, ...newItems];
            });
          }

          setTotal(totalCount);
          setHasMore(hasMoreData);
          currentPageRef.current = currentPage + 1;
          setPage(currentPage + 1);
        }
      } catch (err: any) {
        console.error('加载产品失败:', err);
        if (isMountedRef.current) {
          setError(err.message || '加载产品失败，请重试');
        }
      } finally {
        loadingRef.current = false;
        if (isMountedRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [locale, size]
  );

  // ✅ 搜索防抖
  useEffect(() => {
    if (!open) return;

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchTermRef.current = searchTerm;
      currentPageRef.current = 1;
      loadProducts(true);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, open, loadProducts]);

  // ✅ 首次加载 - 只在 open 从 false 变为 true 时触发
  useEffect(() => {
    if (open && !initialLoadRef.current) {
      initialLoadRef.current = true;
      searchTermRef.current = '';
      currentPageRef.current = 1;
      setPage(1);
      setProducts([]);
      setSelectedIds(new Set(initialSelected));
      const timer = setTimeout(() => {
        loadProducts(true);
      }, 50);
      return () => clearTimeout(timer);
    }

    if (!open) {
      initialLoadRef.current = false;
      loadingRef.current = false;
    }
  }, [open, initialSelected, loadProducts]);

  // ✅ 组件卸载时清理
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // 加载更多
  const loadMore = () => {
    if (hasMore && !loadingMore && !loadingRef.current && isMountedRef.current) {
      loadProducts(false);
    }
  };

  // 切换选择
  const toggleSelect = (product: Product) => {
    const id = product.id;
    const newSet = new Set(selectedIds);

    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      if (mode === 'single') {
        newSet.clear();
        newSet.add(id);
      } else {
        if (newSet.size >= maxSelect) {
          alert(`最多只能选择 ${maxSelect} 个商品`);
          return;
        }
        newSet.add(id);
      }
    }
    setSelectedIds(newSet);
  };

  // 确认选择
  const handleConfirm = () => {
    const selectedProducts = products.filter((p) => selectedIds.has(p.id));
    onSelect(selectedProducts);
    onClose();
  };

  // 获取商品显示名
  const getProductDisplayName = (product: Product) => {
    let name = product.product_name || '未命名产品';
    if (product._isVariant && product.parent_product_name) {
      if (product.product_name !== product.parent_product_name) {
        name = `${product.parent_product_name} (${product.product_name})`;
      }
    }
    return name;
  };

  // 获取商品状态标签
  const getStatusBadge = (product: Product) => {
    if (product._isVariant) {
      return (
        <span className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded whitespace-nowrap">
          <Layers size={12} /> 变体
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded whitespace-nowrap">
        父商品
      </span>
    );
  };

  // 获取商品价格显示
  const getPriceDisplay = (product: Product) => {
    return `${product.currency || 'USD'} ${product.price?.toFixed(2) || '0.00'}`;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <div>
            <h3 className="text-lg font-semibold">📦 选择商品</h3>
            <p className="text-sm text-gray-400 mt-0.5">
              {mode === 'single' ? '选择一个商品' : `已选 ${selectedIds.size} / ${maxSelect} 个商品`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* 搜索栏 */}
        <div className="px-6 py-4 border-b flex-shrink-0">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索商品名称、SKU..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 商品列表 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-blue-500" />
              <span className="ml-3 text-gray-500">加载商品...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">{error}</div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-2">📦</div>
              <p>暂无商品</p>
              <p className="text-sm mt-1">
                {searchTerm ? '请尝试其他关键词' : '请先添加商品'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {products.map((product) => {
                const isSelected = selectedIds.has(product.id);
                const displayName = getProductDisplayName(product);
                const imageUrl = product.main_image_url || DEFAULT_IMAGE;

                return (
                  <div
                    key={product.id}
                    onClick={() => toggleSelect(product)}
                    className={`border rounded-lg p-3 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-blue-300 hover:shadow'
                    }`}
                  >
                    <div className="flex gap-3">
                      {/* 商品图片 */}
                      <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imageUrl}
                          alt={displayName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = DEFAULT_IMAGE;
                          }}
                        />
                      </div>

                      {/* 商品信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate" title={displayName}>
                              {displayName}
                            </div>
                            <div className="text-xs text-gray-400">{product.sku || '无SKU'}</div>
                          </div>
                          <div className="flex-shrink-0">{getStatusBadge(product)}</div>
                        </div>

                        {/* 价格 */}
                        <div className="text-sm font-semibold text-blue-600 mt-1">
                          {getPriceDisplay(product)}
                        </div>

                        {/* 选中标识 */}
                        {isSelected && (
                          <div className="mt-1 text-xs text-blue-600 font-medium">✓ 已选</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 加载更多 */}
          {!loading && hasMore && (
            <div className="text-center mt-4">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 mx-auto disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> 加载中...
                  </>
                ) : (
                  '加载更多'
                )}
              </button>
            </div>
          )}

          {/* 总数提示 */}
          {!loading && products.length > 0 && (
            <div className="text-center text-xs text-gray-400 mt-3">
              共 {total} 个商品，已显示 {products.length} 个
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className="px-6 py-4 border-t flex justify-between items-center flex-shrink-0">
          <span className="text-sm text-gray-500">
            {mode === 'single' ? '请选择一个商品' : `已选 ${selectedIds.size} / ${maxSelect} 个`}
          </span>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedIds.size === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {mode === 'single' ? '选择商品' : `添加 ${selectedIds.size} 个商品`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}