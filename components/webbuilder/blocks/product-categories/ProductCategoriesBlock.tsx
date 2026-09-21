'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { getImageUrl } from '@/lib/files/url';
import {
  useCategoryData,
  type ShowcaseCategory,
} from '@/components/webbuilder/blocks/product-shared/useCategoryData';

interface ProductCategoriesBlockProps {
  categorySelection: {
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
  };
  imageGroup: {
    aspectRatio: '1:1' | '4:3' | '16:9';
    objectFit: 'cover' | 'contain';
    hoverZoom: boolean;
  };
  textGroup: {
    nameColor: string;
    nameFontSize: number;
    nameAlign: 'left' | 'center';
    descColor: string;
    descFontSize: number;
    descVisible: boolean;
    showArrow: boolean;
    arrowColor: string;
  };
  linkPattern: string;
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

export function ProductCategoriesBlock(props: ProductCategoriesBlockProps) {
  const {
    categorySelection = { ids: [], locale: 'zh' },
    bannerType = 'standard',
    backgroundColor = '#ffffff',
    titleGroup = {
      title: '产品分类',
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
    },
    imageGroup = { aspectRatio: '4:3', objectFit: 'cover', hoverZoom: true },
    textGroup = {
      nameColor: '#000000',
      nameFontSize: 18,
      nameAlign: 'left',
      descColor: '#666666',
      descFontSize: 14,
      descVisible: true,
      showArrow: true,
      arrowColor: '#3b82f6',
    },
    linkPattern = '/{locale}/collections/{slug}',
    animationGroup = { enabled: true, duration: 600, delayStep: 80 },
    paddingGroup = { paddingTop: 48, paddingBottom: 48 },
    locale,
    __runtime,
    puck,
  } = props;

  const activeLocale = locale || __runtime?.locale || categorySelection.locale || 'zh';
  const isEditMode = !!puck?.isEditing;

  // ✅ 复用分类数据 Hook
  const { categories, loading } = useCategoryData({
    categoryIds: categorySelection.ids,
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
    cardHoverLift: layoutGroup?.cardHoverLift === true,
  };

  const safeImage = {
    aspectRatio: imageGroup?.aspectRatio ?? '4:3',
    objectFit: imageGroup?.objectFit ?? 'cover',
    hoverZoom: imageGroup?.hoverZoom !== false,
  };

  const safeText = {
    nameColor: textGroup?.nameColor ?? '#000000',
    nameFontSize: textGroup?.nameFontSize ?? 18,
    nameAlign: textGroup?.nameAlign ?? 'left',
    descColor: textGroup?.descColor ?? '#666666',
    descFontSize: textGroup?.descFontSize ?? 14,
    descVisible: textGroup?.descVisible !== false,
    showArrow: textGroup?.showArrow !== false,
    arrowColor: textGroup?.arrowColor ?? '#3b82f6',
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
  }, [safeAnimation.enabled, isEditMode, categories.length]);

  const showContent = isEditMode || visible;

  // ===== 跳转 URL =====
  const buildLink = (category: ShowcaseCategory) => {
    return linkPattern
      .replace('{locale}', activeLocale)
      .replace('{slug}', category.slug || category.id)
      .replace('{id}', category.id);
  };

  // ===== 空状态 =====
  if (!categorySelection.ids || categorySelection.ids.length === 0) {
    return (
      <div
        ref={puck?.dragRef}
        className="border-2 border-dashed border-gray-300 p-8 text-center text-gray-400"
      >
        〖产品分类 - 请在属性面板选择分类〗
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

  return (
    <div ref={puck?.dragRef} style={outerStyle}>
      <div style={innerStyle}>
        {/* 标题区 */}
        {(titleGroup.title || titleGroup.subtitle) && (
          <div className="mb-10" style={{ textAlign: titleGroup.titleAlign }}>
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

        {loading && categories.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            {isEditMode ? '加载分类中...' : '加载中...'}
          </div>
        )}

        {categories.length > 0 && (
          <div
            ref={containerRef}
            className={`grid ${gridCols}`}
            style={{ gap: `${safeLayout.gap}px` }}
          >
            {categories.map((category, idx) => {
              const cardContent = (
                <div
                  className={`overflow-hidden transition-all ${
                    safeLayout.cardHoverShadow ? 'hover:shadow-lg' : ''
                  } ${safeLayout.cardHoverLift ? 'hover:-translate-y-1' : ''}`}
                  style={{
                    backgroundColor: safeLayout.cardBgColor,
                    border: `1px solid ${safeLayout.cardBorderColor}`,
                    borderRadius: `${safeLayout.cardRadius}px`,
                    transition: 'box-shadow 0.3s ease, transform 0.3s ease',
                  }}
                >
                  {/* 图片 */}
                  <div
                    className="relative w-full overflow-hidden group"
                    style={{ paddingBottom: ASPECT_MAP[safeImage.aspectRatio] || '75%' }}
                  >
                    {category.image ? (
                      <img
                        src={getImageUrl(category.image)}
                        alt={category.name}
                        className={`absolute inset-0 w-full h-full transition-transform duration-500 ${
                          safeImage.hoverZoom ? 'group-hover:scale-105' : ''
                        }`}
                        style={{ objectFit: safeImage.objectFit }}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                        暂无图片
                      </div>
                    )}
                  </div>

                  {/* 文本 */}
                  <div className="p-4">
                    <div
                      className="flex items-center justify-between gap-2"
                      style={{ textAlign: safeText.nameAlign }}
                    >
                      {/* ✅ 分类名称：固定 1 行 */}
                      <h3
                        className="flex-1 line-clamp-1"
                        style={{
                          fontSize: `${safeText.nameFontSize}px`,
                          color: safeText.nameColor,
                          fontWeight: 600,
                          lineHeight: 1.4,
                          minHeight: `${safeText.nameFontSize * 1.4}px`,   // 固定 1 行高度
                        }}
                      >
                        {category.name}
                      </h3>
                      {safeText.showArrow && (
                        <ArrowRight
                          size={18}
                          style={{ color: safeText.arrowColor, flexShrink: 0 }}
                          className="transition-transform group-hover:translate-x-1"
                        />
                      )}
                    </div>
                    {safeText.descVisible && category.description && (
                      <p
                        className="mt-1 line-clamp-2"
                        style={{
                          fontSize: `${safeText.descFontSize}px`,
                          color: safeText.descColor,
                          textAlign: safeText.nameAlign,
                          lineHeight: 1.5,
                        }}
                      >
                        {category.description}
                      </p>
                    )}
                  </div>
                </div>
              );

              return (
                <div
                  key={category.id || `cat-${idx}`}
                  className="group"
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
                    <a href={buildLink(category)} className="block">
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