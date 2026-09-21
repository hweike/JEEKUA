// app/admin/products/manage/hooks/useProducts.ts
import { useState, useEffect, useCallback, useRef } from 'react';

interface Product {
  productId: string;
  product_name: string;
  sku: string;
  categoryId: string;
  seriesId?: string;
  status: 'published' | 'draft' | 'offline';
  main_image_url: string;
  price_tiers: any;
  currency: string;
  min_order_quantity: number;
  [key: string]: any;
}

interface StatusCount {
  published: number;
  draft: number;
  offline: number;
}

interface ProductQueryParams {
  locale: string;
  status: string;
  keyword: string;
  categoryId: string;
  seriesId: string;
  page: number;
  searchAll: boolean;
  uncategorized: boolean;
}

const PAGE_SIZE = 20;

export function useProducts(params: ProductQueryParams) {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [statusCount, setStatusCount] = useState<StatusCount>({ published: 0, draft: 0, offline: 0 });
  const [uncategorizedCount, setUncategorizedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 将 params 拆解为基本类型，确保依赖稳定
  const { locale, status, keyword, categoryId, seriesId, page, searchAll, uncategorized } = params;

  const fetchProducts = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL('/api/admin/products/manage', location.origin);
      url.searchParams.set('locale', locale);
      if (status !== 'all') url.searchParams.set('status', status);
      if (keyword) url.searchParams.set('keyword', keyword);
      if (uncategorized) {
        url.searchParams.set('uncategorized', 'true');
      } else {
        if (categoryId) url.searchParams.set('categoryId', categoryId);
        if (seriesId) url.searchParams.set('seriesId', seriesId);
      }
      if (searchAll) url.searchParams.set('searchAll', 'true');
      url.searchParams.set('page', String(page));
      url.searchParams.set('size', String(PAGE_SIZE));

      const res = await fetch(url.toString(), { signal });
      if (!res.ok) throw new Error('加载失败');
      const data = await res.json();
      setProducts(data.items || []);
      setTotal(data.total || 0);
      setStatusCount(data.statusCount || { published: 0, draft: 0, offline: 0 });
      if (data.uncategorizedCount !== undefined) {
        setUncategorizedCount(data.uncategorizedCount);
      } else if (!uncategorized) {
        const countRes = await fetch(`/api/admin/products/manage?locale=${locale}&uncategorized=true&size=1`);
        if (countRes.ok) {
          const countData = await countRes.json();
          setUncategorizedCount(countData.total || 0);
        }
      }
      setInitialized(true);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [locale, status, keyword, categoryId, seriesId, page, searchAll, uncategorized]); // 拆解依赖

  useEffect(() => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    fetchProducts(controller.signal);
    return () => controller.abort();
  }, [fetchProducts]);

  return {
    products,
    total,
    statusCount,
    uncategorizedCount,
    loading,
    error,
    initialized,
    refetch: fetchProducts,
    abortControllerRef,
  };
}