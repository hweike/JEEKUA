'use client';

import React, { useEffect, useRef, useState } from 'react';
import { getImageUrl } from '@/lib/files/url';
import { useBlogData } from '@/components/webbuilder/blocks/product-shared/useBlogData';
import type { ShowcaseBlogPost } from '@/lib/webbuilder/types';

interface BlogPostsBlockProps {
  blogSelection: {
    ids: string[];
    locale: string;
  };
  bannerType: 'standard' | 'fullwidth';
  backgroundColor: string;
  titleGroup: {
    title: string;
    subtitle: string;
    titleColor: string;
    titleFontSize: number;
    subtitleColor: string;
    subtitleFontSize: number;
    titleAlign: 'left' | 'center' | 'right';
  };
  layoutGroup: {
    columns: 2 | 3 | 4;
    gap: number;
    cardRadius: number;
    cardBgColor: string;
    cardBorderColor: string;
    cardHoverShadow: boolean;
    cardHoverLift: boolean;
    cardLayout: 'vertical' | 'horizontal';
    imageWidth: number;
  };
  imageGroup: {
    aspectRatio: '1:1' | '4:3' | '16:9';
    objectFit: 'cover' | 'contain';
    hoverZoom: boolean;
  };
  textGroup: {
    titleColor: string;
    titleFontSize: number;
    excerptColor: string;
    excerptFontSize: number;
    dateColor: string;
    dateFontSize: number;
    excerptLines: 1 | 2 | 3;
    dateVisible: boolean;
    dateFormat: 'YYYY-MM-DD' | 'YYYY/MM/DD' | 'relative';
  };
  linkPattern: string;
  openInNewTab: boolean;
  animationGroup: {
    enabled: boolean;
    duration: number;
    delayStep: number;
  };
  paddingGroup: {
    paddingTop: number;
    paddingBottom: number;
  };
  locale?: string;
  __runtime?: { locale?: string };
  puck?: any;
}

const ASPECT_MAP: Record<string, string> = {
  '1:1': '100%',
  '4:3': '75%',
  '16:9': '56.25%',
};

// ✅ 日期格式化
function formatDate(dateStr: string, format: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');

  if (format === 'YYYY/MM/DD') return `${yyyy}/${mm}/${dd}`;

  if (format === 'relative') {
    const diff = Date.now() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days} 天前`;
    if (days < 30) return `${Math.floor(days / 7)} 周前`;
    if (days < 365) return `${Math.floor(days / 30)} 个月前`;
    return `${Math.floor(days / 365)} 年前`;
  }

  return `${yyyy}-${mm}-${dd}`;
}

export function BlogPostsBlock(props: BlogPostsBlockProps) {
  const {
    blogSelection = { ids: [], locale: 'zh' },
    bannerType = 'standard',
    backgroundColor = '#ffffff',
    titleGroup = {
      title: '博客文章',
      subtitle: '',
      titleColor: '#000000',
      titleFontSize: 32,
      subtitleColor: '#666666',
      subtitleFontSize: 16,
      titleAlign: 'center',
    },
    layoutGroup = {
      columns: 3,
      gap: 24,
      cardRadius: 12,
      cardBgColor: '#ffffff',
      cardBorderColor: '#e5e7eb',
      cardHoverShadow: true,
      cardHoverLift: true,
      cardLayout: 'vertical',
      imageWidth: 200,
    },
    imageGroup = { aspectRatio: '16:9', objectFit: 'cover', hoverZoom: true },
    textGroup = {
      titleColor: '#000000',
      titleFontSize: 18,
      excerptColor: '#666666',
      excerptFontSize: 14,
      dateColor: '#999999',
      dateFontSize: 12,
      excerptLines: 2,
      dateVisible: true,
      dateFormat: 'YYYY-MM-DD',
    },
    linkPattern = '/{locale}/blog/{slug}',
    openInNewTab = true,
    animationGroup = { enabled: true, duration: 600, delayStep: 80 },
    paddingGroup = { paddingTop: 48, paddingBottom: 48 },
    locale,
    __runtime,
    puck,
  } = props;

  const activeLocale = locale || __runtime?.locale || blogSelection.locale || 'zh';
  const isEditMode = !!puck?.isEditing;

  // ✅ 复用数据 Hook
  const { posts, loading } = useBlogData({
    postIds: blogSelection.ids,
    locale: activeLocale,
    isEditMode,
  });

  // ===== 规范化 =====
  const safeLayout = {
    columns: ([2, 3, 4].includes(layoutGroup?.columns as number)
      ? layoutGroup.columns
      : 3) as 2 | 3 | 4,
    gap: layoutGroup?.gap ?? 24,
    cardRadius: layoutGroup?.cardRadius ?? 12,
    cardBgColor: layoutGroup?.cardBgColor ?? '#ffffff',
    cardBorderColor: layoutGroup?.cardBorderColor ?? '#e5e7eb',
    cardHoverShadow: layoutGroup?.cardHoverShadow !== false,
    cardHoverLift: layoutGroup?.cardHoverLift !== false,
    cardLayout: (layoutGroup?.cardLayout === 'horizontal' ? 'horizontal' : 'vertical') as
      | 'vertical'
      | 'horizontal',
    imageWidth: layoutGroup?.imageWidth ?? 200,
  };

  const safeImage = {
    aspectRatio: imageGroup?.aspectRatio ?? '16:9',
    objectFit: imageGroup?.objectFit ?? 'cover',
    hoverZoom: imageGroup?.hoverZoom !== false,
  };

  const safeText = {
    titleColor: textGroup?.titleColor ?? '#000000',
    titleFontSize: textGroup?.titleFontSize ?? 18,
    excerptColor: textGroup?.excerptColor ?? '#666666',
    excerptFontSize: textGroup?.excerptFontSize ?? 14,
    dateColor: textGroup?.dateColor ?? '#999999',
    dateFontSize: textGroup?.dateFontSize ?? 12,
    excerptLines: ([1, 2, 3].includes(textGroup?.excerptLines as number)
      ? textGroup.excerptLines
      : 2) as 1 | 2 | 3,
    dateVisible: textGroup?.dateVisible !== false,
    dateFormat: textGroup?.dateFormat ?? 'YYYY-MM-DD',
  };

  const safeAnimation = {
    enabled: animationGroup?.enabled !== false,
    duration: animationGroup?.duration ?? 600,
    delayStep: animationGroup?.delayStep ?? 80,
  };

  // ===== 滚动进入动画 =====
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(!safeAnimation.enabled);

  useEffect(() => {
    if (!safeAnimation.enabled || isEditMode) {
      setVisible(true);
      return;
    }
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [safeAnimation.enabled, isEditMode, posts.length]);

  const showContent = isEditMode || visible;

  // ===== 构建链接 =====
  const buildLink = (post: ShowcaseBlogPost) => {
    return linkPattern
      .replace('{locale}', activeLocale)
      .replace('{slug}', post.slug || post.id)
      .replace('{id}', post.id);
  };

  // ===== 空状态 =====
  if (!blogSelection.ids || blogSelection.ids.length === 0) {
    return (
      <div
        ref={puck?.dragRef}
        className="border-2 border-dashed border-gray-300 p-8 text-center text-gray-400"
      >
        〖博客文章 - 请在属性面板选择文章〗
      </div>
    );
  }

  const isFullwidth = bannerType === 'fullwidth';
  const outerStyle: React.CSSProperties = {
    backgroundColor,
    ...(isFullwidth
      ? {
          position: 'relative',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100vw',
          maxWidth: '100vw',
        }
      : { maxWidth: '80rem', marginLeft: 'auto', marginRight: 'auto' }),
    ...(bannerType === 'standard' ? { marginTop: '10px', marginBottom: '10px' } : {}),
  };

  const innerStyle: React.CSSProperties = {
    paddingTop: `${paddingGroup.paddingTop}px`,
    paddingBottom: `${paddingGroup.paddingBottom}px`,
    maxWidth: '80rem',
    margin: '0 auto',
    width: '100%',
    paddingLeft: 'clamp(1rem, 2vw, 2rem)',
    paddingRight: 'clamp(1rem, 2vw, 2rem)',
  };

  const gridCols =
    {
      2: 'grid-cols-1 md:grid-cols-2',
      3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    }[safeLayout.columns] || 'grid-cols-1 md:grid-cols-3';

  const isHorizontal = safeLayout.cardLayout === 'horizontal';

  return (
    <div ref={puck?.dragRef} style={outerStyle}>
      <div style={innerStyle}>
        {/* 标题区 */}
        {(titleGroup.title || titleGroup.subtitle) && (
          <div
            className="mb-10"
            style={{
              textAlign: titleGroup.titleAlign,
              opacity: showContent ? 1 : 0,
              transform: showContent ? 'translateY(0)' : 'translateY(24px)',
              transition: `opacity ${safeAnimation.duration}ms ease-out, transform ${safeAnimation.duration}ms ease-out`,
            }}
          >
            {titleGroup.title && (
              <h2
                style={{
                  fontSize: `${titleGroup.titleFontSize}px`,
                  color: titleGroup.titleColor,
                  fontWeight: 'bold',
                  marginBottom: titleGroup.subtitle ? '8px' : 0,
                  lineHeight: 1.3,
                }}
              >
                {titleGroup.title}
              </h2>
            )}
            {titleGroup.subtitle && (
              <p
                style={{
                  fontSize: `${titleGroup.subtitleFontSize}px`,
                  color: titleGroup.subtitleColor,
                  lineHeight: 1.6,
                }}
              >
                {titleGroup.subtitle}
              </p>
            )}
          </div>
        )}

        {loading && posts.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            {isEditMode ? '加载文章中...' : '加载中...'}
          </div>
        )}

        {posts.length > 0 && (
          <div
            ref={containerRef}
            className={`grid ${gridCols}`}
            style={{ gap: `${safeLayout.gap}px` }}
          >
            {posts.map((post, idx) => {
              const cardContent = (
                <div
                  className={`overflow-hidden transition-all ${
                    safeLayout.cardHoverShadow ? 'hover:shadow-lg' : ''
                  } ${safeLayout.cardHoverLift ? 'hover:-translate-y-1' : ''} ${
                    isHorizontal ? 'flex items-center' : ''
                  }`}
                  style={{
                    backgroundColor: safeLayout.cardBgColor,
                    border: `1px solid ${safeLayout.cardBorderColor}`,
                    borderRadius: `${safeLayout.cardRadius}px`,
                    transition: 'box-shadow 0.3s ease, transform 0.3s ease',
                  }}
                >
                  {/* 图片 */}
                  <div
                    className={`relative overflow-hidden group ${
                      isHorizontal ? 'flex-shrink-0' : 'w-full'
                    }`}
                    style={
                      isHorizontal
                        ? {
                            width: `${safeLayout.imageWidth}px`,
                            aspectRatio:
                              safeImage.aspectRatio === '1:1'
                                ? '1 / 1'
                                : safeImage.aspectRatio === '4:3'
                                ? '4 / 3'
                                : '16 / 9',
                            alignSelf: 'center',
                            margin: '12px',
                            borderRadius: `${Math.max(0, safeLayout.cardRadius - 4)}px`,
                          }
                        : { paddingBottom: ASPECT_MAP[safeImage.aspectRatio] || '56.25%' }
                    }
                  >
                    {post.featuredImage ? (
                      <img
                        src={getImageUrl(post.featuredImage)}
                        alt={post.title}
                        className={`${
                          isHorizontal ? 'w-full h-full' : 'absolute inset-0 w-full h-full'
                        } transition-transform duration-500 ${
                          safeImage.hoverZoom ? 'group-hover:scale-105' : ''
                        }`}
                        style={{
                          objectFit: safeImage.objectFit,
                          borderRadius: isHorizontal ? 'inherit' : undefined,
                        }}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div
                        className={`${
                          isHorizontal ? 'w-full h-full' : 'absolute inset-0'
                        } bg-gray-100 flex items-center justify-center text-gray-400 text-sm`}
                        style={{ borderRadius: isHorizontal ? 'inherit' : undefined }}
                      >
                        暂无图片
                      </div>
                    )}
                  </div>

                  {/* 文本 */}
                  <div className={`p-4 ${isHorizontal ? 'flex-1 min-w-0 flex flex-col justify-center' : ''}`}>
                      {/* ✅ 标题：固定 2 行 */}
                      <h3
                        className="line-clamp-2"
                        style={{
                          fontSize: `${safeText.titleFontSize}px`,
                          color: safeText.titleColor,
                          fontWeight: 600,
                          lineHeight: 1.4,
                          minHeight: `${safeText.titleFontSize * 1.4 * 2}px`,   // 固定 2 行高度
                          marginBottom: '8px',
                        }}
                      >
                        {post.title}
                      </h3>

                      {/* ✅ 摘要：固定 2 行（即使为空也占位） */}
                      <p
                        className="line-clamp-2"
                        style={{
                          fontSize: `${safeText.excerptFontSize}px`,
                          color: safeText.excerptColor,
                          lineHeight: 1.6,
                          minHeight: `${safeText.excerptFontSize * 1.6 * 2}px`,  // 固定 2 行高度
                          marginBottom: '12px',
                        }}
                      >
                        {post.excerpt || ''}
                      </p>

                      {/* ✅ 日期：固定 1 行（即使为空也占位） */}
                      {safeText.dateVisible && (
                        <div
                          style={{
                            fontSize: `${safeText.dateFontSize}px`,
                            color: safeText.dateColor,
                            lineHeight: 1.5,
                            minHeight: `${safeText.dateFontSize * 1.5}px`,       // 固定 1 行高度
                          }}
                        >
                          {post.updatedAt ? formatDate(post.updatedAt, safeText.dateFormat) : ''}
                        </div>
                      )}
                    </div>
                </div>
              );

              return (
                <div
                  key={post.id || `post-${idx}`}
                  style={{
                    opacity: showContent ? 1 : 0,
                    transform: showContent ? 'translateY(0)' : 'translateY(24px)',
                    transition: `opacity ${safeAnimation.duration}ms ease-out ${
                      idx * safeAnimation.delayStep
                    }ms, transform ${safeAnimation.duration}ms ease-out ${
                      idx * safeAnimation.delayStep
                    }ms`,
                  }}
                >
                  {isEditMode ? (
                    cardContent
                  ) : (
                    <a
                      href={buildLink(post)}
                      target={openInNewTab ? '_blank' : undefined}
                      rel={openInNewTab ? 'noopener noreferrer' : undefined}
                      className="block"
                    >
                      {cardContent}
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}