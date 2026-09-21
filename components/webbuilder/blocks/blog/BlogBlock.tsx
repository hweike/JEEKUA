'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface BlogPost {
  slug: string;
  title: string;
  date: string;
  category: string;
  author: string;
  excerpt: string;
  image?: string;
}

interface Category {
  id: string;
  slug: string;
  name: string;
}

interface BlogBlockProps {
  showSidebar?: boolean;
  postsPerRow?: number;
  __runtime?: {
    categories: Category[];
    posts: BlogPost[];
    locale: string;
    basePath: string;
    currentCategorySlug?: string | null;
  };
  puck?: { dragRef: (el: HTMLElement | null) => void };
}

function getProcessedImageUrl(url: string | null): string {
  if (!url) return '';
  if (url.startsWith('/')) return url;
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname;
    } catch {
      return url;
    }
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  }
  return url;
}

// ============================================================
// 公共样式常量
// ============================================================
const COLOR_TRANSITION = `color var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)`;
const BG_COLOR_TRANSITION = `background-color var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)`;

export function BlogBlock({
  showSidebar = true,
  postsPerRow = 1,
  __runtime,
  puck,
}: BlogBlockProps) {
  const t = useTranslations('Components.BlogBlock');
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentCategorySlug, setCurrentCategorySlug] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // ============================================================
  // ✅ 博客专属 CSS 变量（带最终 fallback）
  // ============================================================
  // ---- 容器 ----
  const containerBg = 'var(--blog-container-bg, var(--background, #ffffff))';
  const containerText = 'var(--blog-container-text, var(--foreground, #0f172a))';

  // ---- 标题 ----
  const titleColor = 'var(--blog-title-color, var(--foreground, #0f172a))';

  // ---- 文章卡片 ----
  const cardBorder = 'var(--blog-card-border, var(--border, #e2e8f0))';
  const postTitleColor = 'var(--blog-post-title-color, var(--foreground, #0f172a))';
  const postTitleHover = 'var(--blog-post-title-hover, var(--primary, #1e293b))';
  const postMetaColor = 'var(--blog-post-meta-color, var(--muted-foreground, #64748b))';
  const postExcerptColor = 'var(--blog-post-excerpt-color, var(--muted-foreground, #64748b))';

  // ---- 侧边栏 ----
  const sidebarBg = 'var(--blog-sidebar-bg, transparent)';
  const sidebarText = 'var(--blog-sidebar-text, var(--foreground, #0f172a))';
  const sidebarActiveBg = 'var(--blog-sidebar-active-bg, var(--accent, #f1f5f9))';
  const sidebarActiveText = 'var(--blog-sidebar-active-text, var(--accent-foreground, #0f172a))';
  const sidebarHoverBg = 'var(--blog-sidebar-hover-bg, var(--accent, #f1f5f9))';
  const sidebarHoverText = 'var(--blog-sidebar-hover-text, var(--accent-foreground, #0f172a))';

  // ---- 分页 ----
  const paginationBg = 'var(--blog-pagination-bg, transparent)';
  const paginationText = 'var(--blog-pagination-text, var(--foreground, #0f172a))';
  const paginationBorder = 'var(--blog-pagination-border, var(--border, #e2e8f0))';
  const paginationHoverBg = 'var(--blog-pagination-hover-bg, var(--accent, #f1f5f9))';
  const paginationDisabledOpacity = 'var(--blog-pagination-disabled-opacity, 0.5)';

  // ---- 图片 ----
  const imageRadius = 'var(--blog-image-radius, var(--radius, 0.625rem))';

  // ---- 与下一区块/页脚的间距 ----
  const marginBottom = 'var(--blog-margin-bottom, var(--section-gap, 100px))'; // ✅ 使用全局主题变量 section-gap

  const { categories, locale, basePath, posts: initialPosts } = __runtime || {};

  useEffect(() => {
    if (initialPosts && Array.isArray(initialPosts)) {
      setPosts(initialPosts);
      setPage(1);
    }
    if (__runtime?.currentCategorySlug) {
      setCurrentCategorySlug(__runtime.currentCategorySlug);
    }
  }, [initialPosts, __runtime?.currentCategorySlug]);

  const handleSelectCategory = useCallback(
    async (categorySlug: string | null) => {
      setCurrentCategorySlug(categorySlug);
      setLoading(true);
      setPage(1);

      try {
        let url: string;
        if (categorySlug) {
          const category = categories?.find((c) => c.slug === categorySlug);
          if (category) {
            url = `/api/blog/posts?category=${category.id}&locale=${locale}`;
          } else {
            url = `/api/blog/posts?locale=${locale}`;
          }
        } else {
          url = `/api/blog/posts?locale=${locale}`;
        }

        const res = await fetch(url);
        if (!res.ok) {
          throw new Error('Failed to fetch posts');
        }
        const data = await res.json();
        setPosts(data.posts || []);
      } catch (err) {
        console.error('[BlogBlock] Failed to fetch posts:', err);
        if (initialPosts) setPosts(initialPosts);
      } finally {
        setLoading(false);
      }
    },
    [categories, locale, initialPosts]
  );

  const totalPages = Math.ceil(posts.length / pageSize);
  const currentPosts = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return posts.slice(start, end);
  }, [posts, page, pageSize]);

  const handlePrevPage = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleNextPage = () => {
    if (page < totalPages) setPage(page + 1);
  };

  if (!categories || !initialPosts) {
    return (
      <div
        className="border-2 border-dashed"
        ref={puck?.dragRef}
        style={{
          padding: 'var(--spacing-8, 2rem)',
          textAlign: 'center',
          color: 'var(--muted-foreground, #64748b)',
          borderColor: 'var(--border, #e2e8f0)',
        }}
      >
        {t('placeholder')}
      </div>
    );
  }

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget;
    const originalUrl = img.getAttribute('data-original-src');
    if (img.src.includes('/api/proxy-image')) {
      img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%23999"%3E%3Crect x="2" y="2" width="20" height="20" rx="2"%3E%3C/rect%3E%3C/svg%3E';
    } else if (originalUrl && (originalUrl.startsWith('http://') || originalUrl.startsWith('https://'))) {
      img.src = `/api/proxy-image?url=${encodeURIComponent(originalUrl)}`;
    } else {
      img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%23999"%3E%3Crect x="2" y="2" width="20" height="20" rx="2"%3E%3C/rect%3E%3C/svg%3E';
    }
  };

  const truncateExcerpt = (text: string) => {
    if (!text) return '';
    return text.length > 200 ? text.slice(0, 200) + '...' : text;
  };

  return (
    <div
      className="mx-auto"
      style={{
        backgroundColor: containerBg,
        color: containerText,
        paddingLeft: 'var(--spacing-4, 1rem)',
        paddingRight: 'var(--spacing-4, 1rem)',
        paddingTop: 'var(--spacing-8, 2rem)',
        paddingBottom: 'var(--spacing-8, 2rem)',
        marginBottom: marginBottom, // ✅ 应用与下一区块/页脚的间距
        maxWidth: '80rem',
      }}
    >
      <div
        className="flex flex-col lg:flex-row"
        style={{ gap: 'var(--spacing-8, 2rem)' }}
      >
        {showSidebar && (
          <aside className="lg:w-1/4">
            <div
              className="sticky top-24"
              style={{
                backgroundColor: sidebarBg,
                padding: 'var(--spacing-4, 1rem)',
                borderRadius: 'var(--radius-lg, 0.75rem)',
              }}
            >
              <h2
                style={{
                  fontSize: 'var(--font-size-lg, 1.125rem)',
                  fontWeight: 'var(--font-weight-semibold, 600)',
                  color: sidebarText,
                  marginBottom: 'var(--spacing-4, 1rem)',
                }}
              >
                {t('categories')}
              </h2>
              <ul
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--spacing-1, 0.25rem)',
                }}
              >
                <li>
                  <button
                    onClick={() => handleSelectCategory(null)}
                    className="block w-full text-left"
                    style={{
                      paddingLeft: 'var(--spacing-3, 0.75rem)',
                      paddingRight: 'var(--spacing-3, 0.75rem)',
                      paddingTop: 'var(--spacing-2, 0.5rem)',
                      paddingBottom: 'var(--spacing-2, 0.5rem)',
                      borderRadius: 'var(--radius-md, 0.625rem)',
                      fontSize: 'var(--font-size-sm, 0.875rem)',
                      backgroundColor: !currentCategorySlug ? sidebarActiveBg : 'transparent',
                      color: !currentCategorySlug ? sidebarActiveText : sidebarText,
                      fontWeight: !currentCategorySlug ? 600 : 400,
                      transition: `${COLOR_TRANSITION}, ${BG_COLOR_TRANSITION}`,
                    }}
                    onMouseEnter={(e) => {
                      if (currentCategorySlug) {
                        e.currentTarget.style.backgroundColor = sidebarHoverBg;
                        e.currentTarget.style.color = sidebarHoverText;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentCategorySlug) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = sidebarText;
                      }
                    }}
                  >
                    {t('all')}
                  </button>
                </li>
                {categories.map((cat) => (
                  <li key={cat.slug}>
                    <button
                      onClick={() => handleSelectCategory(cat.slug)}
                      className="block w-full text-left"
                      style={{
                        paddingLeft: 'var(--spacing-3, 0.75rem)',
                        paddingRight: 'var(--spacing-3, 0.75rem)',
                        paddingTop: 'var(--spacing-2, 0.5rem)',
                        paddingBottom: 'var(--spacing-2, 0.5rem)',
                        borderRadius: 'var(--radius-md, 0.625rem)',
                        fontSize: 'var(--font-size-sm, 0.875rem)',
                        backgroundColor: currentCategorySlug === cat.slug ? sidebarActiveBg : 'transparent',
                        color: currentCategorySlug === cat.slug ? sidebarActiveText : sidebarText,
                        fontWeight: currentCategorySlug === cat.slug ? 600 : 400,
                        transition: `${COLOR_TRANSITION}, ${BG_COLOR_TRANSITION}`,
                      }}
                      onMouseEnter={(e) => {
                        if (currentCategorySlug !== cat.slug) {
                          e.currentTarget.style.backgroundColor = sidebarHoverBg;
                          e.currentTarget.style.color = sidebarHoverText;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (currentCategorySlug !== cat.slug) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = sidebarText;
                        }
                      }}
                    >
                      {cat.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        )}

        <main className={showSidebar ? 'flex-1' : 'w-full'}>
          <h1
            style={{
              fontSize: 'var(--font-size-3xl, 1.875rem)',
              fontWeight: 'var(--font-weight-bold, 700)',
              color: titleColor,
              marginBottom: 'var(--spacing-8, 2rem)',
            }}
          >
            {t('title')}
          </h1>

          {loading ? (
            <div
              className="text-center"
              style={{
                paddingTop: 'var(--spacing-8, 2rem)',
                paddingBottom: 'var(--spacing-8, 2rem)',
                color: 'var(--muted-foreground, #64748b)',
              }}
            >
              {t('loading')}
            </div>
          ) : posts.length === 0 ? (
            <p style={{ color: 'var(--muted-foreground, #64748b)' }}>{t('noPosts')}</p>
          ) : (
            <>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--spacing-8, 2rem)',
                }}
              >
                {currentPosts.map((post, index) => {
                  const rawImageUrl = post.image || '';
                  const processedImageUrl = getProcessedImageUrl(rawImageUrl);
                  const displayExcerpt = truncateExcerpt(post.excerpt || '');
                  const isLast = index === currentPosts.length - 1; // ✅ 判断是否为最后一条

                  return (
                    <article
                      key={post.slug}
                      className="flex flex-col md:flex-row"
                      style={{
                        gap: 'var(--spacing-6, 1.5rem)',
                        paddingBottom: isLast ? 0 : 'var(--spacing-8, 2rem)', // ✅ 最后一条无底部内边距
                        borderBottom: isLast ? 'none' : `1px solid ${cardBorder}`, // ✅ 最后一条无分割线
                      }}
                    >
                      {rawImageUrl && (
                        <div className="md:w-1/3 flex-shrink-0">
                          <Link
                            href={`/${locale}/blog/${post.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block overflow-hidden"
                            style={{ borderRadius: imageRadius }}
                          >
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

                      <div className={rawImageUrl ? 'flex-1' : 'w-full'}>
                        <Link
                          href={`/${locale}/blog/${post.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <h2
                            className="line-clamp-2"
                            style={{
                              fontSize: 'var(--font-size-2xl, 1.5rem)',
                              fontWeight: 'var(--font-weight-semibold, 600)',
                              color: postTitleColor,
                              transition: COLOR_TRANSITION,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = postTitleHover;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = postTitleColor;
                            }}
                          >
                            {post.title}
                          </h2>
                        </Link>

                        <div
                          style={{
                            fontSize: 'var(--font-size-sm, 0.875rem)',
                            color: postMetaColor,
                            marginTop: 'var(--spacing-2, 0.5rem)',
                          }}
                        >
                          {new Date(post.date).toLocaleDateString(locale)}
                        </div>

                        {displayExcerpt && (
                          <p
                            className="line-clamp-3"
                            style={{
                              color: postExcerptColor,
                              marginTop: 'var(--spacing-2, 0.5rem)',
                            }}
                          >
                            {displayExcerpt}
                          </p>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div
                  className="flex justify-center items-center"
                  style={{
                    gap: 'var(--spacing-4, 1rem)',
                    marginTop: 'var(--spacing-8, 2rem)',
                  }}
                >
                  <button
                    onClick={handlePrevPage}
                    disabled={page === 1}
                    className="border rounded-md"
                    style={{
                      paddingLeft: 'var(--spacing-4, 1rem)',
                      paddingRight: 'var(--spacing-4, 1rem)',
                      paddingTop: 'var(--spacing-2, 0.5rem)',
                      paddingBottom: 'var(--spacing-2, 0.5rem)',
                      borderRadius: 'var(--radius-md, 0.625rem)',
                      backgroundColor: paginationBg,
                      color: paginationText,
                      borderColor: paginationBorder,
                      opacity: page === 1 ? paginationDisabledOpacity : 1,
                      cursor: page === 1 ? 'not-allowed' : 'pointer',
                      transition: BG_COLOR_TRANSITION,
                    }}
                    onMouseEnter={(e) => {
                      if (page > 1) {
                        e.currentTarget.style.backgroundColor = paginationHoverBg;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (page > 1) {
                        e.currentTarget.style.backgroundColor = paginationBg;
                      }
                    }}
                  >
                    {t('prev') || '上一页'}
                  </button>
                  <span
                    style={{
                      fontSize: 'var(--font-size-sm, 0.875rem)',
                      color: paginationText,
                    }}
                  >
                    {t('page') || '第'} {page} / {totalPages} {t('of') || '页'}
                  </span>
                  <button
                    onClick={handleNextPage}
                    disabled={page === totalPages}
                    className="border rounded-md"
                    style={{
                      paddingLeft: 'var(--spacing-4, 1rem)',
                      paddingRight: 'var(--spacing-4, 1rem)',
                      paddingTop: 'var(--spacing-2, 0.5rem)',
                      paddingBottom: 'var(--spacing-2, 0.5rem)',
                      borderRadius: 'var(--radius-md, 0.625rem)',
                      backgroundColor: paginationBg,
                      color: paginationText,
                      borderColor: paginationBorder,
                      opacity: page === totalPages ? paginationDisabledOpacity : 1,
                      cursor: page === totalPages ? 'not-allowed' : 'pointer',
                      transition: BG_COLOR_TRANSITION,
                    }}
                    onMouseEnter={(e) => {
                      if (page < totalPages) {
                        e.currentTarget.style.backgroundColor = paginationHoverBg;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (page < totalPages) {
                        e.currentTarget.style.backgroundColor = paginationBg;
                      }
                    }}
                  >
                    {t('next') || '下一页'}
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}