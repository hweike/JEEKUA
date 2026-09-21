'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ShowcaseProduct } from './ProductCard';

// 模块级缓存：key = `${locale}|${ids.join(',')}`
const productCache = new Map<string, { items: ShowcaseProduct[]; timestamp: number }>();
const CACHE_TTL = 60 * 1000;

interface UseProductDataOptions {
  productIds: string[];
  locale: string;
  /** 编辑模式：跳过 loading 提示，直接显示 */
  isEditMode?: boolean;
}

interface UseProductDataResult {
  products: ShowcaseProduct[];
  loading: boolean;
}

/**
 * 产品数据加载 Hook（带缓存）
 *
 * 用法：
 * const { products, loading } = useProductData({
 *   productIds: productSelection.ids,
 *   locale: activeLocale,
 *   isEditMode,
 * });
 */
export function useProductData({
  productIds,
  locale,
  isEditMode = false,
}: UseProductDataOptions): UseProductDataResult {
  const [products, setProducts] = useState<ShowcaseProduct[]>([]);
  const [loading, setLoading] = useState(false);

  // ✅ 用 join 做稳定依赖，避免数组引用变化
  const productIdsKey = productIds.join(',');
  const stableProductIds = useMemo(() => productIds, [productIdsKey]); // eslint-disable-line

  useEffect(() => {
    if (!stableProductIds || stableProductIds.length === 0) {
      setProducts([]);
      return;
    }

    const cacheKey = `${locale}|${stableProductIds.join(',')}`;
    const cached = productCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setProducts(cached.items);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const res = await fetch('/api/front/products/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: stableProductIds, locale }),
        });
        const data = await res.json();
        const items: ShowcaseProduct[] = (data.items || []).map((p: any) => ({
          productId: p.productId,
          productName: p.productName,
          sku: p.sku,
          mainImage: p.mainImage || '',
          price: p.price,
          slug: p.slug || '',   // ✅ 新增
        }));

        // 按传入顺序排序
        const ordered = stableProductIds
          .map((id) => items.find((p) => p.productId === id))
          .filter(Boolean) as ShowcaseProduct[];

        if (!cancelled) {
          productCache.set(cacheKey, { items: ordered, timestamp: Date.now() });
          setProducts(ordered);
        }
      } catch (err) {
        console.error('[useProductData] 加载产品失败', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [stableProductIds, locale]);

  return { products, loading };
}

/** 手动清空缓存（调试用） */
export function clearProductCache() {
  productCache.clear();
}