'use client';

import React from 'react';
import Link from 'next/link';
import type { VideoCategoryBlockProps } from '@/lib/webbuilder/types';

interface Props extends VideoCategoryBlockProps {
  puck?: { dragRef: (el: HTMLElement | null) => void };
}

function getImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('/')) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  }
  return url;
}

export function VideoCategoryBlock({
  videosPerRow = 3,
  __runtime,
  puck,
}: Props) {
  if (!__runtime?.videos) {
    return (
      <div
        className="border-2 border-dashed border-border p-8 text-center text-muted-foreground"
        ref={puck?.dragRef}
      >
        〖视频分类展示区域〗
      </div>
    );
  }

  const { categories, videos, currentCategorySlug, locale } = __runtime;

  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  }[videosPerRow] || 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  // 生成视频详情链接：优先使用视频自己的 categorySlug，否则使用当前页面的 categorySlug，最后回退到单层
  const getVideoHref = (video: any) => {
    if (video.categorySlug) {
      return `/${locale}/video/${video.categorySlug}/${video.slug}`;
    }
    if (currentCategorySlug) {
      return `/${locale}/video/${currentCategorySlug}/${video.slug}`;
    }
    return `/${locale}/video/${video.slug}`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-6">视频频道</h1>
        <div className="flex flex-wrap items-center gap-2 border-b pb-2">
          <Link
            key="all"
            href={`/${locale}/video`}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              !currentCategorySlug
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            全部
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.slug || cat.key}
              href={`/${locale}/video/${cat.slug || cat.key}`}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                currentCategorySlug === (cat.slug || cat.key)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </div>

      {videos.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">暂无视频</p>
      ) : (
        <div className={`grid ${gridCols} gap-6`}>
          {videos.map((video) => {
            const imageUrl = getImageUrl(video.thumbnail);
            const href = getVideoHref(video);
            return (
              <Link
                key={video.id || video.slug}
                href={href}
                className="group block border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="relative aspect-video bg-muted">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={video.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      暂无封面
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                    {video.title}
                  </h3>
                  <div className="text-sm text-muted-foreground mt-2">
                    {new Date(video.published_at).toLocaleDateString(locale)}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}