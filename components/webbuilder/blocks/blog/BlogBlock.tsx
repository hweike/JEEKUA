'use client';

import React from 'react';
import Link from 'next/link';
import type { BlogBlockProps } from '@/lib/webbuilder/types';

interface BlogBlockRenderProps extends BlogBlockProps {
  puck?: { dragRef: (el: HTMLElement | null) => void };
}

export function BlogBlock({
  showSidebar = true,
  postsPerRow = 1,
  __runtime,
  puck,
}: BlogBlockRenderProps) {
  // 编辑模式显示占位
  if (!__runtime || !__runtime.posts) {
    return (
      <div
        className="border-2 border-dashed border-border p-8 text-center text-muted-foreground"
        ref={puck?.dragRef}
      >
        〖博客展示区域〗
      </div>
    );
  }

  const { categories, posts, currentCategorySlug, locale, basePath } = __runtime;

  const getCategoryHref = (slug: string | null) => {
    if (!slug) return basePath;
    return `${basePath}?category=${slug}`;
  };

  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  }[postsPerRow] || 'grid-cols-1';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* 左侧分类栏 */}
        {showSidebar && (
          <aside className="lg:w-1/4">
            <div className="sticky top-24">
              <h2 className="text-lg font-semibold text-foreground mb-4">分类</h2>
              <ul className="space-y-1">
                <li>
                  <Link
                    href={getCategoryHref(null)}
                    className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                      !currentCategorySlug
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    全部
                  </Link>
                </li>
                {categories.map((cat) => (
                  <li key={cat.slug}>
                    <Link
                      href={getCategoryHref(cat.slug)}
                      className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                        currentCategorySlug === cat.slug
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                      }`}
                    >
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        )}

        {/* 右侧文章列表 */}
        <main className={showSidebar ? 'flex-1' : 'w-full'}>
          <h1 className="text-3xl font-bold text-foreground mb-8">博客</h1>
          {posts.length === 0 ? (
            <p className="text-muted-foreground">暂无文章</p>
          ) : (
            <div className={`grid ${gridCols} gap-8`}>
              {posts.map((post, index) => {
                const isLast = index === posts.length - 1;
                return (
                  <article
                    key={post.slug}
                    className={`${!isLast ? 'border-b border-border' : ''} pb-6`}
                  >
                    <Link href={`/${locale}/blog/${post.slug}`}>
                      <h2 className="text-2xl font-semibold text-foreground hover:text-primary transition-colors">
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