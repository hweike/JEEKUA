// app/admin/products/manage/hooks/useCategoryMap.ts
import { useState, useEffect } from 'react';

interface CategoryInfo {
  name: string;
  series: Map<string, string>;
}

const CATEGORY_CACHE_KEY = (locale: string) => `categoryMap_${locale}`;
const CACHE_TTL = 60 * 60 * 1000; // 1小时

export function useCategoryMap(locale: string) {
  const [categoryMap, setCategoryMap] = useState<Map<string, CategoryInfo>>(new Map());

  useEffect(() => {
    const cacheKey = CATEGORY_CACHE_KEY(locale);
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL) {
          const restoredMap = new Map<string, CategoryInfo>();
          data.forEach(([key, value]: [string, any]) => {
            const seriesMap = new Map(value.series);
            restoredMap.set(key, { name: value.name, series: seriesMap });
          });
          setCategoryMap(restoredMap);
          return;
        }
      } catch (e) {
        console.warn('解析分类缓存失败', e);
      }
    }

    fetch(`/api/admin/products/categories?locale=${locale}`)
      .then(res => res.json())
      .then(data => {
        const map = new Map<string, CategoryInfo>();
        (data.categories || []).forEach((cat: any) => {
          const seriesMap = new Map();
          (cat.series || []).forEach((s: any) => seriesMap.set(s.id, s.name));
          map.set(cat.id, { name: cat.name, series: seriesMap });
        });
        setCategoryMap(map);
        const serializableMap = Array.from(map.entries()).map(([key, value]) => [
          key,
          { name: value.name, series: Array.from(value.series.entries()) },
        ]);
        sessionStorage.setItem(cacheKey, JSON.stringify({ data: serializableMap, timestamp: Date.now() }));
      })
      .catch(console.error);
  }, [locale]);

  return categoryMap;
}