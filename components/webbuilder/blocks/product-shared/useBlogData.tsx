'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ShowcaseBlogPost } from '@/lib/webbuilder/types';

// 模块级缓存：key = `${locale}|${ids.join(',')}`
const blogCache = new Map<string, { items: ShowcaseBlogPost[]; timestamp: number }>();
const CACHE_TTL = 60 * 1000;

interface UseBlogDataOptions {
  postIds: string[];
  locale: string;
  isEditMode?: boolean;
}

interface UseBlogDataResult {
  posts: ShowcaseBlogPost[];
  loading: boolean;
}

export function useBlogData({
  postIds,
  locale,
  isEditMode = false,
}: UseBlogDataOptions): UseBlogDataResult {
  const [posts, setPosts] = useState<ShowcaseBlogPost[]>([]);
  const [loading, setLoading] = useState(false);

  const postIdsKey = postIds.join(',');
  const stablePostIds = useMemo(() => postIds, [postIdsKey]); // eslint-disable-line

  useEffect(() => {
    if (!stablePostIds || stablePostIds.length === 0) {
      setPosts([]);
      return;
    }

    const cacheKey = `${locale}|${stablePostIds.join(',')}`;
    const cached = blogCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setPosts(cached.items);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const res = await fetch('/api/blog/posts/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: stablePostIds, locale }),
        });
        const data = await res.json();
        const items: ShowcaseBlogPost[] = (data.items || []).map((p: any) => ({
          id: p.id,
          slug: p.slug || '',
          title: p.title || '',
          excerpt: p.excerpt || '',
          featuredImage: p.featuredImage || '',
          categoryId: p.categoryId || '',
          author: p.author || '',
          updatedAt: p.updatedAt || '',
        }));

        const ordered = stablePostIds
          .map((id) => items.find((p) => p.id === id))
          .filter(Boolean) as ShowcaseBlogPost[];

        if (!cancelled) {
          blogCache.set(cacheKey, { items: ordered, timestamp: Date.now() });
          setPosts(ordered);
        }
      } catch (err) {
        console.error('[useBlogData] 加载文章失败', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [stablePostIds, locale]);

  return { posts, loading };
}

export function clearBlogCache() {
  blogCache.clear();
}