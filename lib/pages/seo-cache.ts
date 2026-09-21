// lib/pages/seo-cache.ts
import { cache } from 'react';
import { getPageBySlug } from './storage';
import type { PageData } from './types';

/**
 * 通用页数据获取
 *
 * - 底层走 storage.getPageBySlug → NodeCache（5 分钟 TTL）
 * - React cache 保证同一次请求内 generateMetadata 和 Page 只查一次
 * - 跨请求缓存靠 NodeCache，不再依赖 unstable_cache
 */
export const getCachedPageBySlug = cache(
  async (locale: string, slug: string): Promise<PageData | null> => {
    return getPageBySlug(locale, slug);
  }
);