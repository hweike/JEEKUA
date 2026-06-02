'use client';

import React from 'react';
import Link from 'next/link';
import type { BlogCollectionBlockProps } from '@/lib/webbuilder/types';

interface Props extends BlogCollectionBlockProps {
  puck?: { dragRef: (el: HTMLElement | null) => void };
}

/**
 * 智能处理图片 URL：
 * - 本地图片（以 / 开头或 localhost 域名）直接返回，不代理
 * - 外部 http/https 链接走代理（解决防盗链）
 */
function getProcessedImageUrl(url: string | null): string {
  if (!url) return '';
  // 本地图片：相对路径 /uploads/...
  if (url.startsWith('/')) return url;
  // 如果包含 localhost 或 127.0.0.1，尝试转换成相对路径
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname;
    } catch {
      return url;
    }
  }
  // 外部链接，走代理
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  }
  return url;
}

export function BlogCollectionBlock({
  showSidebar = true,
  postsPerRow = 1,
  __runtime,
  puck,
}: Props) {
  if (!__runtime?.posts) {
    return (
      <div
        className="border-2 border-dashed border-border p-8 text-center text-muted-foreground"
        ref={puck?.dragRef}
      >
        〖博客集合展示区域〗
      </div>
    );
  }

  const { categories, posts, currentCategorySlug, locale, basePath } = __runtime;

  // 图片加载失败时的处理（回退到占位图，避免重复请求代理）
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget;
    const originalUrl = img.getAttribute('data-original-src');
    // 如果当前 src 已经是代理链接，不再重试，直接显示占位图
    if (img.src.includes('/api/proxy-image')) {
      img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%23999"%3E%3Crect x="2" y="2" width="20" height="20" rx="2"%3E%3C/rect%3E%3C/svg%3E';
    } else if (originalUrl && (originalUrl.startsWith('http://') || originalUrl.startsWith('https://'))) {
      // 外部图片加载失败，尝试走代理
      img.src = `/api/proxy-image?url=${encodeURIComponent(originalUrl)}`;
    } else {
      // 本地图片加载失败，显示占位图
      img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%23999"%3E%3Crect x="2" y="2" width="20" height="20" rx="2"%3E%3C/rect%3E%3C/svg%3E';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* 侧边栏 */}
        {showSidebar && (
          <aside className="lg:w-1/4">
            <h2 className="text-lg font-semibold text-foreground mb-4">分类</h2>
            <ul className="space-y-1">
              <li>
                <Link
                  href={`/${locale}/blogs`}
                  className={`block px-3 py-2 rounded-md text-sm ${
                    !currentCategorySlug
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-foreground hover:bg-accent'
                  }`}
                >
                  全部
                </Link>
              </li>
              {categories.map((cat) => (
                <li key={cat.slug}>
                  <Link
                    href={`/${locale}/blogs/${cat.slug}`}
                    className={`block px-3 py-2 rounded-md text-sm ${
                      currentCategorySlug === cat.slug
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-foreground hover:bg-accent'
                    }`}
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        )}

        {/* 文章列表 */}
        <main className={showSidebar ? 'flex-1' : 'w-full'}>
          <h1 className="text-3xl font-bold text-foreground mb-8">博客</h1>
          {posts.length === 0 ? (
            <p className="text-muted-foreground">暂无文章</p>
          ) : (
            <div className="space-y-8">
              {posts.map((post) => {
                const rawImageUrl = post.image || '';
                const processedImageUrl = getProcessedImageUrl(rawImageUrl);
                return (
                  <article
                    key={post.slug}
                    className="flex flex-col md:flex-row gap-6 border-b border-border pb-8"
                  >
                    {/* 图片区域 */}
                    {rawImageUrl && (
                      <div className="md:w-1/4 flex-shrink-0">
                        <Link href={`${basePath}/${post.slug}`} className="block overflow-hidden rounded-lg">
                          <div className="relative aspect-video w-full">
                            <img
                              src={processedImageUrl}
                              alt={post.title}
                              className="w-full h-full object-cover transition-transform hover:scale-105"
                              data-original-src={rawImageUrl}
                              onError={handleImageError}
                              loading="lazy"
                            />
                          </div>
                        </Link>
                      </div>
                    )}
                    {/* 内容区域 */}
                    <div className={rawImageUrl ? 'flex-1' : 'w-full'}>
                      <Link href={`${basePath}/${post.slug}`}>
                        <h2 className="text-2xl font-semibold text-foreground hover:text-primary transition-colors line-clamp-2">
                          {post.title}
                        </h2>
                      </Link>
                      <div className="text-sm text-muted-foreground mt-2">
                        {new Date(post.date).toLocaleDateString(locale)}
                        {post.author && <span className="ml-4">作者：{post.author}</span>}
                      </div>
                      {post.excerpt && (
                        <p className="mt-2 text-muted-foreground line-clamp-3">{post.excerpt}</p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}