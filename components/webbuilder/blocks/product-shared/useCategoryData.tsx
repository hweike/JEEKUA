'use client';

import { useEffect, useMemo, useState } from 'react';

export interface CategorySeries {
  id: string;
  name: string;
  slug: string;
  image: string;
  order: number;
}

export interface ShowcaseCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  order: number;
  series: CategorySeries[];
}

// 模块级缓存：key = `${locale}`
const categoryCache = new Map<string, { items: ShowcaseCategory[]; timestamp: number }>();
const CACHE_TTL = 60 * 1000;

interface UseCategoryDataOptions {
  categoryIds: string[];
  locale: string;
  isEditMode?: boolean;
}

interface UseCategoryDataResult {
  categories: ShowcaseCategory[];
  loading: boolean;
}

/**
 * 分类数据加载 Hook
 *
 * 与产品不同，分类数量少（通常 < 50），所以：
 * - 一次全量拉取（缓存 key = locale）
 * - 前端按 categoryIds 过滤 + 排序
 */
export function useCategoryData({
  categoryIds,
  locale,
  isEditMode = false,
}: UseCategoryDataOptions): UseCategoryDataResult {
  const [categories, setCategories] = useState<ShowcaseCategory[]>([]);
  const [loading, setLoading] = useState(false);

  // ✅ 稳定依赖
  const categoryIdsKey = categoryIds.join(',');
  const stableCategoryIds = useMemo(() => categoryIds, [categoryIdsKey]); // eslint-disable-line

  useEffect(() => {
    if (!stableCategoryIds || stableCategoryIds.length === 0) {
      setCategories([]);
      return;
    }

    // ✅ 缓存 key 用 locale（全量分类），和 ids 无关
    const cacheKey = `categories_${locale}`;
    const cached = categoryCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      // 从全量中按顺序过滤
      const filtered = stableCategoryIds
        .map((id) => cached.items.find((c) => c.id === id))
        .filter(Boolean) as ShowcaseCategory[];
      setCategories(filtered);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const res = await fetch(
          `/api/front/products/categories?locale=${encodeURIComponent(locale)}`
        );
        const data = await res.json();
        const all: ShowcaseCategory[] = (data.items || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description || '',
          image: c.image || '',
          order: c.order ?? 0,
          series: c.series || [],
        }));

        categoryCache.set(cacheKey, { items: all, timestamp: Date.now() });

        // 按传入顺序过滤
        const filtered = stableCategoryIds
          .map((id) => all.find((c) => c.id === id))
          .filter(Boolean) as ShowcaseCategory[];

        if (!cancelled) {
          setCategories(filtered);
        }
      } catch (err) {
        console.error('[useCategoryData] 加载分类失败', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [stableCategoryIds, locale]);

  return { categories, loading };
}

/** 手动清空缓存（调试用） */
export function clearCategoryCache() {
  categoryCache.clear();
}