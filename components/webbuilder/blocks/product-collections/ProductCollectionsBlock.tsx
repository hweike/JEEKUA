'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
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

export function ProductCollectionsBlock({ productsPerRow = 3, __runtime, puck }: any) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 从 __runtime 中提取所有必要数据
  const collectionId = __runtime?.collectionId || __runtime?.collection?.id;
  const seriesId = __runtime?.seriesId;  // 二级分类 ID（如果有）
  const locale = __runtime?.locale || 'zh';
  const urlPattern = __runtime?.urlPattern || '';

  // 状态
  const [collection, setCollection] = useState<any>(__runtime?.collection || null);
  const [products, setProducts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 筛选参数
  const sortBy = (searchParams.get('sort') as SortOption) || 'title-asc';
  const availability = searchParams.get('availability') as 'in-stock' | 'out-of-stock' | null;
  const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : null;
  const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : null;

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastRequestKeyRef = useRef<string>('');
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  // 请求唯一标识（包含 seriesId）
  const requestKey = useMemo(() => {
    if (!collectionId) return '';
    return JSON.stringify({
      collectionId,
      seriesId,
      locale,
      availability,
      minPrice,
      maxPrice,
      sortBy,
    });
  }, [collectionId, seriesId, locale, availability, minPrice, maxPrice, sortBy]);

  // 构建 API URL（包含 seriesId）
  const buildFetchUrl = useCallback(() => {
    if (!collectionId) return null;
    const url = new URL(`/api/front/products/category/${collectionId}`, window.location.origin);
    url.searchParams.set('locale', locale);
    if (seriesId) url.searchParams.set('seriesId', seriesId);
    if (availability) url.searchParams.set('availability', availability);
    if (minPrice !== null) url.searchParams.set('minPrice', String(minPrice));
    if (maxPrice !== null) url.searchParams.set('maxPrice', String(maxPrice));

    let sortColumn = 'product_name';
    let sortOrder = 'ASC';
    switch (sortBy) {
      case 'title-asc': sortColumn = 'product_name'; sortOrder = 'ASC'; break;
      case 'title-desc': sortColumn = 'product_name'; sortOrder = 'DESC'; break;
      case 'price-asc': sortColumn = 'first_price'; sortOrder = 'ASC'; break;
      case 'price-desc': sortColumn = 'first_price'; sortOrder = 'DESC'; break;
      case 'created-asc': sortColumn = 'createdAt'; sortOrder = 'ASC'; break;
      case 'created-desc': sortColumn = 'createdAt'; sortOrder = 'DESC'; break;
    }
    url.searchParams.set('sortColumn', sortColumn);
    url.searchParams.set('sortOrder', sortOrder);
    return url.toString();
  }, [collectionId, seriesId, locale, availability, minPrice, maxPrice, sortBy]);

  // 产品请求函数
  const fetchProducts = useCallback(async (options?: { isInitial?: boolean }) => {
    if (!collectionId) return;
    const { isInitial = true } = options || {};
    if (requestKey === lastRequestKeyRef.current && !isInitial) return;
    lastRequestKeyRef.current = requestKey;

    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timeoutId = setTimeout(() => {
      if (!controller.signal.aborted) {
        controller.abort();
        setError('请求超时，请稍后重试');
        if (isInitial) setLoading(false);
        else setIsRefreshing(false);
      }
    }, 10000);
    timeoutIdRef.current = timeoutId;

    try {
      if (isInitial) setLoading(true);
      else setIsRefreshing(true);
      setError(null);

      const url = buildFetchUrl();
      if (!url) throw new Error('Invalid URL');
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
        if (!controller.signal.aborted) setError('加载产品失败');
      }
    } finally {
      clearTimeout(timeoutId);
      if (!controller.signal.aborted) {
        if (isInitial) setLoading(false);
        else setIsRefreshing(false);
      }
      if (abortControllerRef.current === controller) abortControllerRef.current = null;
    }
  }, [collectionId, buildFetchUrl, requestKey]);

  // 获取分类详情（如果 __runtime 未提供）
  useEffect(() => {
    if (!collectionId || collection) return;
    const fetchCategoryDetail = async () => {
      try {
        const res = await fetch(`/api/front/categories/${collectionId}?locale=${locale}`);
        if (res.ok) {
          const data = await res.json();
          setCollection(data);
        }
      } catch (err) {
        console.error('获取分类信息失败', err);
      }
    };
    fetchCategoryDetail();
  }, [collectionId, locale, collection]);

  // 监听筛选变化，重新请求产品
  useEffect(() => {
    if (!collectionId) return;
    const timer = setTimeout(() => fetchProducts({ isInitial: false }), 100);
    return () => clearTimeout(timer);
  }, [fetchProducts, collectionId]);

  // 初始加载
  useEffect(() => {
    if (!collectionId) {
      setLoading(false);
      return;
    }
    fetchProducts({ isInitial: true });
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
    };
  }, [collectionId]);

  // 更新筛选（修改 URL）
  const updateFilters = (updates: any) => {
    const params = new URLSearchParams(searchParams);
    if (updates.sort !== undefined) {
      updates.sort === 'title-asc' ? params.delete('sort') : params.set('sort', updates.sort);
    }
    if (updates.availability !== undefined) {
      updates.availability ? params.set('availability', updates.availability) : params.delete('availability');
    }
    if (updates.minPrice !== undefined) {
      updates.minPrice === null ? params.delete('minPrice') : params.set('minPrice', String(updates.minPrice));
    }
    if (updates.maxPrice !== undefined) {
      updates.maxPrice === null ? params.delete('maxPrice') : params.set('maxPrice', String(updates.maxPrice));
    }
    router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false });
  };

  const clearFilters = () => updateFilters({
    sort: 'title-asc',
    availability: null,
    minPrice: null,
    maxPrice: null,
  });

  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  }[productsPerRow] || 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  // 条件渲染：没有分类 ID → 占位符
  if (!collectionId) {
    return (
      <div className="border-2 border-dashed border-gray-300 p-8 text-center text-gray-400" ref={puck?.dragRef}>
        〖产品集合展示区域（未指定分类）〗
      </div>
    );
  }

  // 加载中状态
  if (loading && products.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-gray-500">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin inline-block" />
        <span className="ml-2">加载中...</span>
      </div>
    );
  }

  const categoryName = collection?.name || '产品分类';
  const categoryDescription = collection?.description || '';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{categoryName}</h1>
        {categoryDescription && <p className="text-gray-600">{categoryDescription}</p>}
      </div>

      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <label className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={availability === 'in-stock'}
              onChange={(e) => updateFilters({ availability: e.target.checked ? 'in-stock' : null })}
            /> 有货
          </label>
          <label className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={availability === 'out-of-stock'}
              onChange={(e) => updateFilters({ availability: e.target.checked ? 'out-of-stock' : null })}
            /> 无货
          </label>
          <div className="flex items-center gap-1 border rounded px-2 py-1">
            <span>¥</span>
            <input
              type="number"
              placeholder="最低"
              value={minPrice ?? ''}
              onChange={(e) => updateFilters({ minPrice: e.target.value ? Number(e.target.value) : null })}
              className="w-20 text-sm border-none focus:outline-none"
            />
            <span>-</span>
            <span>¥</span>
            <input
              type="number"
              placeholder="最高"
              value={maxPrice ?? ''}
              onChange={(e) => updateFilters({ maxPrice: e.target.value ? Number(e.target.value) : null })}
              className="w-20 text-sm border-none focus:outline-none"
            />
          </div>
          {(availability || minPrice !== null || maxPrice !== null || sortBy !== 'title-asc') && (
            <button onClick={clearFilters} className="text-sm text-blue-600 hover:underline">
              清除筛选
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">排序：</span>
          <select
            value={sortBy}
            onChange={(e) => updateFilters({ sort: e.target.value as SortOption })}
            className="border rounded p-1 text-sm"
          >
            {Object.entries(SORT_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <div className="text-center py-12 text-red-600">{error}</div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 text-gray-500">暂无产品</div>
      ) : (
        <>
          <div className="text-sm text-gray-500 mb-4">共 {total} 件商品</div>
          <div className={`grid ${gridCols} gap-6`}>
            {products.map((product) => (
              <ProductCard key={product.productId} product={product} locale={locale} urlPattern={urlPattern} />
            ))}
          </div>
        </>
      )}

      {isRefreshing && (
        <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg px-3 py-1 text-sm text-gray-500 border">
          更新中...
        </div>
      )}
    </div>
  );
}