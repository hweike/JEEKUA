'use client';

import React, { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { getImageUrl } from '@/lib/files/url';

interface RuntimeData {
  categories: { key?: string; slug: string; name: string }[];
  videos: any[];
  currentCategorySlug?: string | null;
  locale: string;
  basePath?: string;
}

interface Props {
  videosPerRow?: number;
  __runtime?: RuntimeData;
  puck?: { dragRef: (el: HTMLElement | null) => void };
}

// ============================================================
// 公共样式常量
// ============================================================
const COLOR_TRANSITION = `color var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)`;
const BG_COLOR_TRANSITION = `background-color var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)`;
const SHADOW_TRANSITION = `box-shadow var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)`;
const TRANSFORM_TRANSITION = `transform var(--transition-duration-300, 300ms) var(--transition-timing-ease, ease)`;

export function VideoCategoryBlock({
  videosPerRow = 3,
  __runtime,
  puck,
}: Props) {
  const t = useTranslations('Components.VideoCategory');
  const runtime = __runtime || {
    categories: [],
    videos: [],
    currentCategorySlug: null,
    locale: 'zh',
    basePath: '',
  };

  const initialVideos = runtime.videos || [];
  const categories = runtime.categories || [];
  const initialCategorySlug = runtime.currentCategorySlug || null;
  const locale = runtime.locale || 'zh';

  // ============================================================
  // ✅ 视频分类列表专属 CSS 变量（带最终 fallback）
  // ============================================================
  // ---- 容器 ----
  const containerBg = 'var(--video-category-bg, var(--background, #ffffff))';
  const containerText = 'var(--video-category-text, var(--foreground, #0f172a))';

  // ---- 标题 ----
  const titleColor = 'var(--video-category-title-color, var(--foreground, #0f172a))';

  // ---- 分类按钮 ----
  const categoryBg = 'var(--video-category-btn-bg, var(--muted, #f1f5f9))';
  const categoryText = 'var(--video-category-btn-text, var(--muted-foreground, #64748b))';
  const categoryHoverBg = 'var(--video-category-btn-hover-bg, var(--accent, #f1f5f9))';
  const categoryHoverText = 'var(--video-category-btn-hover-text, var(--accent-foreground, #0f172a))';
  const categoryActiveBg = 'var(--video-category-btn-active-bg, var(--primary, #1e293b))';
  const categoryActiveText = 'var(--video-category-btn-active-text, var(--primary-foreground, #f8fafc))';

  // ---- 视频卡片 ----
  const cardBorder = 'var(--video-card-border, var(--border, #edeef3))';
  const cardShadow = 'var(--video-card-shadow, var(--shadow-md, 0 4px 6px -1px rgb(0 0 0 / 0.1)))';
  const cardHoverShadow = 'var(--video-card-hover-shadow, var(--shadow-lg, 0 10px 15px -3px rgb(0 0 0 / 0.1)))';
  const cardRadius = 'var(--video-card-radius, var(--radius, 0.625rem))';

  // ---- 视频标题 ----
  const videoTitleColor = 'var(--video-title-color, var(--foreground, #0f172a))';
  const videoTitleHover = 'var(--video-title-hover, var(--primary, #1e293b))';

  // ---- 视频元数据 ----
  const videoMetaColor = 'var(--video-meta-color, var(--muted-foreground, #64748b))';

  // ---- 图片占位 ----
  const placeholderBg = 'var(--video-placeholder-bg, var(--muted, #f1f5f9))';
  const placeholderText = 'var(--video-placeholder-text, var(--muted-foreground, #64748b))';

  // ---- 播放按钮 ----
  const playBtnBg = 'var(--video-play-btn-bg, rgba(255,255,255,0.8))';
  const playBtnColor = 'var(--video-play-btn-color, var(--primary, #1e293b))';
  const playBtnHoverScale = 'var(--video-play-btn-hover-scale, 1.1)';

  // ---- 分页 ----
  const paginationBg = 'var(--video-pagination-bg, transparent)';
  const paginationText = 'var(--video-pagination-text, var(--foreground, #0f172a))';
  const paginationBorder = 'var(--video-pagination-border, var(--border, #edeef3))';
  const paginationHoverBg = 'var(--video-pagination-hover-bg, var(--accent, #f1f5f9))';
  const paginationDisabledOpacity = 'var(--video-pagination-disabled-opacity, 0.5)';

  // ---- 加载状态 ----
  const loadingColor = 'var(--video-loading-color, var(--muted-foreground, #64748b))';

  // ---- 与下一区块/页脚的间距 ----
  const marginBottom = 'var(--video-category-margin-bottom, var(--section-gap, 100px))'; // ✅ 使用全局主题变量 section-gap

  // 建立 key ↔ slug 双向映射
  const keyToSlug = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach((cat) => {
      if (cat.key && cat.slug) map[cat.key] = cat.slug;
    });
    return map;
  }, [categories]);

  const slugToKey = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach((cat) => {
      if (cat.slug && cat.key) map[cat.slug] = cat.key;
    });
    return map;
  }, [categories]);

  const [videos, setVideos] = useState<any[]>(initialVideos);
  const [currentCategorySlug, setCurrentCategorySlug] = useState<string | null>(initialCategorySlug);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const handleSelectCategory = useCallback(
    async (slug: string | null) => {
      if (slug === currentCategorySlug) return;
      setCurrentCategorySlug(slug);
      setLoading(true);
      setPage(1);

      try {
        const categoryKey = slug ? (slugToKey[slug] || '') : '';
        const url = `/api/front/videos?locale=${locale}${categoryKey ? `&category=${categoryKey}` : ''}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch videos');
        const data = await res.json();
        const videoList = Array.isArray(data) ? data : (data.videos || []);
        setVideos(videoList);
      } catch (err) {
        console.error('[VideoCategoryBlock] Failed to fetch videos:', err);
        setVideos(initialVideos);
      } finally {
        setLoading(false);
      }
    },
    [locale, currentCategorySlug, slugToKey, initialVideos]
  );

  const getVideoHref = useCallback(
    (video: any) => {
      let categorySlug = video.categorySlug;
      if (!categorySlug && video.category_key) {
        categorySlug = keyToSlug[video.category_key] || '';
      }
      if (!categorySlug) {
        categorySlug = currentCategorySlug || '';
      }
      if (!categorySlug) {
        return `/${locale}/video/${video.slug}`;
      }
      return `/${locale}/video/${categorySlug}/${video.slug}`;
    },
    [locale, keyToSlug, currentCategorySlug]
  );

  const totalPages = Math.ceil(videos.length / pageSize);
  const currentVideos = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return videos.slice(start, end);
  }, [videos, page, pageSize]);

  const handlePrevPage = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleNextPage = () => {
    if (page < totalPages) setPage(page + 1);
  };

  if (!__runtime || !initialVideos) {
    return (
      <div
        className="border-2 border-dashed text-center"
        ref={puck?.dragRef}
        style={{
          padding: 'var(--spacing-8, 2rem)',
          borderColor: 'var(--border, #edeef3)',
          color: 'var(--muted-foreground, #64748b)',
        }}
      >
        {t('placeholder')}
      </div>
    );
  }

  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  }[videosPerRow] || 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

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
      <div style={{ marginBottom: 'var(--spacing-8, 2rem)' }}>
        <h1
          style={{
            fontSize: 'var(--font-size-3xl, 1.875rem)',
            fontWeight: 'var(--font-weight-bold, 700)',
            marginBottom: 'var(--spacing-6, 1.5rem)',
            color: titleColor,
          }}
        >
          {t('title')}
        </h1>
        <div
          className="flex flex-wrap items-center border-b"
          style={{
            gap: 'var(--spacing-2, 0.5rem)',
            paddingBottom: 'var(--spacing-2, 0.5rem)',
            borderColor: cardBorder,
          }}
        >
          <button
            onClick={() => handleSelectCategory(null)}
            className="rounded-full"
            style={{
              paddingLeft: 'var(--spacing-4, 1rem)',
              paddingRight: 'var(--spacing-4, 1rem)',
              paddingTop: 'var(--spacing-2, 0.5rem)',
              paddingBottom: 'var(--spacing-2, 0.5rem)',
              borderRadius: 'var(--radius-full, 9999px)',
              fontSize: 'var(--font-size-sm, 0.875rem)',
              fontWeight: 'var(--font-weight-medium, 500)',
              backgroundColor: !currentCategorySlug ? categoryActiveBg : categoryBg,
              color: !currentCategorySlug ? categoryActiveText : categoryText,
              transition: `${COLOR_TRANSITION}, ${BG_COLOR_TRANSITION}`,
            }}
            onMouseEnter={(e) => {
              if (currentCategorySlug) {
                e.currentTarget.style.backgroundColor = categoryHoverBg;
                e.currentTarget.style.color = categoryHoverText;
              }
            }}
            onMouseLeave={(e) => {
              if (currentCategorySlug) {
                e.currentTarget.style.backgroundColor = categoryBg;
                e.currentTarget.style.color = categoryText;
              }
            }}
          >
            {t('all')}
          </button>

          {categories.map((cat) => {
            const slug = cat.slug || cat.key;
            if (!slug) return null;
            const isActive = currentCategorySlug === slug;
            return (
              <button
                key={slug}
                onClick={() => handleSelectCategory(slug)}
                className="rounded-full"
                style={{
                  paddingLeft: 'var(--spacing-4, 1rem)',
                  paddingRight: 'var(--spacing-4, 1rem)',
                  paddingTop: 'var(--spacing-2, 0.5rem)',
                  paddingBottom: 'var(--spacing-2, 0.5rem)',
                  borderRadius: 'var(--radius-full, 9999px)',
                  fontSize: 'var(--font-size-sm, 0.875rem)',
                  fontWeight: 'var(--font-weight-medium, 500)',
                  backgroundColor: isActive ? categoryActiveBg : categoryBg,
                  color: isActive ? categoryActiveText : categoryText,
                  transition: `${COLOR_TRANSITION}, ${BG_COLOR_TRANSITION}`,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = categoryHoverBg;
                    e.currentTarget.style.color = categoryHoverText;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = categoryBg;
                    e.currentTarget.style.color = categoryText;
                  }
                }}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div
          className="text-center"
          style={{
            paddingTop: 'var(--spacing-12, 3rem)',
            paddingBottom: 'var(--spacing-12, 3rem)',
            color: loadingColor,
          }}
        >
          {t('loading')}
        </div>
      ) : videos.length === 0 ? (
        <p
          className="text-center"
          style={{
            paddingTop: 'var(--spacing-12, 3rem)',
            paddingBottom: 'var(--spacing-12, 3rem)',
            color: loadingColor,
          }}
        >
          {t('noVideos')}
        </p>
      ) : (
        <>
          <div
            className={`grid ${gridCols}`}
            style={{ gap: 'var(--spacing-6, 1.5rem)' }}
          >
            {currentVideos.map((video) => {
              const imageUrl = getImageUrl(video.thumbnail);
              const href = getVideoHref(video);
              return (
                <Link
                  key={video.id || video.slug}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block overflow-hidden"
                  style={{
                    border: `1px solid ${cardBorder}`,
                    borderRadius: cardRadius,
                    boxShadow: cardShadow,
                    transition: SHADOW_TRANSITION,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = cardHoverShadow;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = cardShadow;
                  }}
                >
                  <div
                    className="relative aspect-video"
                    style={{ backgroundColor: placeholderBg }}
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={video.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105"
                        style={{ transition: TRANSFORM_TRANSITION }}
                      />
                    ) : (
                      <div
                        className="flex items-center justify-center h-full"
                        style={{ color: placeholderText }}
                      >
                        {t('noCover')}
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center group-hover:scale-110"
                        style={{
                          backgroundColor: playBtnBg,
                          transition: TRANSFORM_TRANSITION,
                        }}
                      >
                        <div
                          className="w-0 h-0 border-y-8 border-y-transparent border-l-12 ml-1"
                          style={{ borderLeftColor: playBtnColor }}
                        />
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: 'var(--spacing-4, 1rem)' }}>
                    <h3
                      className="line-clamp-2"
                      style={{
                        fontWeight: 'var(--font-weight-semibold, 600)',
                        color: videoTitleColor,
                        transition: COLOR_TRANSITION,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = videoTitleHover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = videoTitleColor;
                      }}
                    >
                      {video.title}
                    </h3>
                    <div
                      style={{
                        fontSize: 'var(--font-size-sm, 0.875rem)',
                        marginTop: 'var(--spacing-2, 0.5rem)',
                        color: videoMetaColor,
                      }}
                    >
                      {video.published_at ? new Date(video.published_at).toLocaleDateString(locale) : ''}
                    </div>
                  </div>
                </Link>
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
                className="border"
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
                className="border"
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
    </div>
  );
}