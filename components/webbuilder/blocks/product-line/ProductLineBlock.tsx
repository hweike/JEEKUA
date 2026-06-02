'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import CategoryTree from '@/components/front/CategoryTree';
import ProductCard from '@/components/front/ProductCard';

type SortOption = 'title-asc' | 'title-desc' | 'price-asc' | 'price-desc' | 'created-asc' | 'created-desc';

const SORT_LABELS: Record<SortOption, string> = {
  'title-asc': '按字母顺序，A-Z',
  'title-desc': '按字母顺序，Z-A',
  'price-asc': '价格，从低到高',
  'price-desc': '价格，从高到低',
  'created-asc': '日期，从旧到新',
  'created-desc': '日期，从新到旧',
};

export function ProductLineBlock({ showSidebar = true, productsPerRow = 3, __runtime, puck }: any) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 防御性检查
  if (!__runtime?.productLine || !__runtime?.categoryTree) {
    return (
      <div
        className="border-2 border-dashed border-border p-8 text-center text-muted-foreground"
        ref={puck?.dragRef}
      >
        〖产品线展示区域〗
      </div>
    );
  }

  // 稳定化产品线基本数据
  const productLine = useMemo(() => __runtime.productLine, [__runtime.productLine]);
  const categoryTree = useMemo(() => __runtime.categoryTree, [__runtime.categoryTree]);
  const locale = __runtime.locale;
  const urlPattern = __runtime.urlPattern;

  const productLineId = productLine.id;
  const productLineName = productLine.name;
  const productLineSlug = productLine.slug;

  // 从 URL 解析当前分类 slug
  const currentCategorySlug = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length >= 4 && segments[1] === 'products' && segments[2] === productLineSlug) {
      return segments[3];
    }
    return undefined;
  }, [pathname, productLineSlug]);

  // 根据分类 slug 获取 ID、系列 ID 和分类信息
  const { currentCategoryId, currentSeriesId, currentCategoryInfo } = useMemo(() => {
    if (!currentCategorySlug)
      return { currentCategoryId: undefined, currentSeriesId: undefined, currentCategoryInfo: null };
    for (const cat of categoryTree) {
      if (cat.slug === currentCategorySlug) {
        return {
          currentCategoryId: cat.id,
          currentSeriesId: undefined,
          currentCategoryInfo: { name: cat.name, description: cat.description },
        };
      }
      const series = cat.children?.find((s: any) => s.slug === currentCategorySlug);
      if (series) {
        return {
          currentCategoryId: cat.id,
          currentSeriesId: series.id,
          currentCategoryInfo: { name: series.name, description: series.description },
        };
      }
    }
    return { currentCategoryId: undefined, currentSeriesId: undefined, currentCategoryInfo: null };
  }, [categoryTree, currentCategorySlug]);

  // 筛选参数
  const sortBy = (searchParams.get('sort') as SortOption) || 'title-asc';
  const availability = searchParams.get('availability') as 'in-stock' | 'out-of-stock' | null;
  const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : null;
  const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : null;

  // 状态
  const [products, setProducts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 请求管理
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastRequestKeyRef = useRef<string>('');
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  // 生成当前请求的唯一标识（基于所有依赖）
  const requestKey = useMemo(() => {
    const targetId = currentCategoryId || productLineId;
    return JSON.stringify({
      targetId,
      currentSeriesId,
      isProductLine: !currentCategoryId,
      locale,
      availability,
      minPrice,
      maxPrice,
      sortBy,
    });
  }, [currentCategoryId, productLineId, currentSeriesId, locale, availability, minPrice, maxPrice, sortBy]);

  // 构建请求 URL
  const buildFetchUrl = useCallback(() => {
    let targetId = currentCategoryId || productLineId;
    const url = new URL(`/api/front/products/category/${targetId}`, window.location.origin);
    url.searchParams.set('locale', locale);
    if (currentSeriesId) url.searchParams.set('seriesId', currentSeriesId);
    if (!currentCategoryId) url.searchParams.set('isProductLine', 'true');
    if (availability) url.searchParams.set('availability', availability);
    if (minPrice !== null) url.searchParams.set('minPrice', String(minPrice));
    if (maxPrice !== null) url.searchParams.set('maxPrice', String(maxPrice));
    let sortColumn = 'product_name';
    let sortOrder = 'ASC';
    switch (sortBy) {
      case 'title-asc':
        sortColumn = 'product_name';
        sortOrder = 'ASC';
        break;
      case 'title-desc':
        sortColumn = 'product_name';
        sortOrder = 'DESC';
        break;
      case 'price-asc':
        sortColumn = 'first_price';
        sortOrder = 'ASC';
        break;
      case 'price-desc':
        sortColumn = 'first_price';
        sortOrder = 'DESC';
        break;
      case 'created-asc':
        sortColumn = 'createdAt';
        sortOrder = 'ASC';
        break;
      case 'created-desc':
        sortColumn = 'createdAt';
        sortOrder = 'DESC';
        break;
    }
    url.searchParams.set('sortColumn', sortColumn);
    url.searchParams.set('sortOrder', sortOrder);
    return url.toString();
  }, [currentCategoryId, productLineId, currentSeriesId, locale, availability, minPrice, maxPrice, sortBy]);

  // 核心请求函数
  const fetchProducts = useCallback(async (options?: { isInitial?: boolean; skipSameKey?: boolean }) => {
    const { isInitial = false, skipSameKey = true } = options || {};

    if (skipSameKey && requestKey === lastRequestKeyRef.current) {
      return;
    }
    lastRequestKeyRef.current = requestKey;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timeoutId = setTimeout(() => {
      if (!controller.signal.aborted) {
        controller.abort();
        setError('请求超时，请稍后重试');
        if (isInitial) setIsLoading(false);
        else setIsRefreshing(false);
      }
    }, 10000);
    timeoutIdRef.current = timeoutId;

    try {
      if (isInitial) setIsLoading(true);
      else setIsRefreshing(true);
      setError(null);

      const url = buildFetchUrl();
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!controller.signal.aborted) {
        setProducts(data.items || []);
        setTotal(data.total || 0);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error(err);
        if (!controller.signal.aborted) setError('加载失败，请稍后重试');
      }
    } finally {
      clearTimeout(timeoutId);
      if (!controller.signal.aborted) {
        if (isInitial) setIsLoading(false);
        else setIsRefreshing(false);
      }
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [buildFetchUrl, requestKey]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts({ isInitial: isLoading, skipSameKey: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [fetchProducts, isLoading]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
    };
  }, []);

  const updateFilters = (updates: any) => {
    const params = new URLSearchParams(searchParams);
    if (updates.sort !== undefined)
      updates.sort === 'title-asc' ? params.delete('sort') : params.set('sort', updates.sort);
    if (updates.availability !== undefined)
      updates.availability ? params.set('availability', updates.availability) : params.delete('availability');
    if (updates.minPrice !== undefined)
      updates.minPrice === null ? params.delete('minPrice') : params.set('minPrice', String(updates.minPrice));
    if (updates.maxPrice !== undefined)
      updates.maxPrice === null ? params.delete('maxPrice') : params.set('maxPrice', String(updates.maxPrice));
    router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false });
  };

  const clearFilters = () =>
    updateFilters({ sort: 'title-asc', availability: null, minPrice: null, maxPrice: null });

  const categories = useMemo(() => categoryTree.map((cat: any) => ({ slug: cat.slug, name: cat.name })), [categoryTree]);
  const seriesMap = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const cat of categoryTree) {
      map[cat.slug] = (cat.children || []).map((child: any) => ({ slug: child.slug, name: child.name }));
    }
    return map;
  }, [categoryTree]);

  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  }[productsPerRow] || 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="ml-2 text-muted-foreground">加载中...</span>
        </div>
      );
    }
    if (error) {
      return <div className="text-center py-12 text-destructive">{error}</div>;
    }
    if (products.length === 0) {
      return <div className="text-center py-12 text-muted-foreground">暂无产品</div>;
    }
    return (
      <>
        <div className="text-sm text-muted-foreground mb-4">共 {total} 件商品</div>
        <div className={`grid ${gridCols} gap-6`}>
          {products.map((product) => (
            <ProductCard key={product.productId} product={product} locale={locale} urlPattern={urlPattern} />
          ))}
        </div>
      </>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 bg-background text-foreground">
      <div className="flex flex-col lg:flex-row gap-8">
        {showSidebar && (
          <aside className="lg:w-1/4">
            <CategoryTree
              productLineNameEncoded={encodeURIComponent(productLineName)}
              categories={categories}
              seriesMap={seriesMap}
              currentSlug={currentCategorySlug}
              locale={locale}
              basePath="products"
            />
          </aside>
        )}
        <main className={showSidebar ? 'flex-1' : 'w-full'}>
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2 text-foreground">
              {currentCategoryInfo?.name || productLineName}
            </h1>
            {currentCategoryInfo?.description && (
              <p className="text-muted-foreground">{currentCategoryInfo.description}</p>
            )}
          </div>

          <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
            <div className="flex flex-wrap gap-3 items-center">
              <label className="flex items-center gap-1 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={availability === 'in-stock'}
                  onChange={(e) => updateFilters({ availability: e.target.checked ? 'in-stock' : null })}
                />{' '}
                有货
              </label>
              <label className="flex items-center gap-1 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={availability === 'out-of-stock'}
                  onChange={(e) => updateFilters({ availability: e.target.checked ? 'out-of-stock' : null })}
                />{' '}
                无货
              </label>
              <div className="flex items-center gap-1 border border-border rounded px-2 py-1 bg-background">
                <span className="text-foreground">¥</span>
                <input
                  type="number"
                  placeholder="最低"
                  value={minPrice ?? ''}
                  onChange={(e) => updateFilters({ minPrice: e.target.value ? Number(e.target.value) : null })}
                  className="w-20 text-sm border-none bg-transparent text-foreground focus:outline-none"
                />
                <span className="text-foreground">-</span>
                <span className="text-foreground">¥</span>
                <input
                  type="number"
                  placeholder="最高"
                  value={maxPrice ?? ''}
                  onChange={(e) => updateFilters({ maxPrice: e.target.value ? Number(e.target.value) : null })}
                  className="w-20 text-sm border-none bg-transparent text-foreground focus:outline-none"
                />
              </div>
              {(availability || minPrice !== null || maxPrice !== null || sortBy !== 'title-asc') && (
                <button onClick={clearFilters} className="text-sm text-primary hover:underline">
                  清除筛选
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">排序：</span>
              <select
                value={sortBy}
                onChange={(e) => updateFilters({ sort: e.target.value as SortOption })}
                className="border border-border rounded p-1 text-sm bg-background text-foreground"
              >
                {Object.entries(SORT_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isRefreshing && (
            <div className="flex justify-center items-center py-4 border-b border-border mb-4">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="ml-2 text-sm text-muted-foreground">更新中...</span>
            </div>
          )}

          {renderContent()}
        </main>
      </div>
    </div>
  );
}