'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ProductCard, type ShowcaseProduct } from '@/components/webbuilder/blocks/product-shared/ProductCard';
import { useProductData } from '@/components/webbuilder/blocks/product-shared/useProductData';
import { Trophy, Medal, Award } from 'lucide-react';

interface ProductRankingBlockProps {
  productSelection: { ids: string[]; locale: string };
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
  rankingGroup: {
    columns: 1 | 2;
    gap: number;
    showRanking: boolean;
    rankingStyle: 'number' | 'medal' | 'both';
    rankingNumberColor: string;
    rankingNumberBgColor: string;
    rankingNumberSize: number;
    medalGoldColor: string;
    medalSilverColor: string;
    medalBronzeColor: string;
    cardLayout: 'horizontal' | 'vertical';
    imageWidth: number;
    imageAspectRatio: '1:1' | '4:3' | '16:9';
    linkPattern: string;
    openInNewTab?: boolean;   // ✅ 新增（可选）
  };
  layoutGroup: {
    cardRadius: number;
    cardBgColor: string;
    cardBorderColor: string;
    cardHoverShadow: boolean;
    cardHoverLift: boolean;
  };
  nameGroup: {
    nameColor: string;
    nameFontSize: number;
    nameAlign: 'left' | 'center';
  };
  skuGroup: {
    skuColor: string;
    skuFontSize: number;
    skuVisible: boolean;
  };
  imageGroup: {
    aspectRatio: '1:1' | '4:3' | '16:9';
    objectFit: 'cover' | 'contain';
    hoverZoom: boolean;
  };
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

// ==================== 序号角标组件 ====================
function RankingBadge({
  index,
  style,
  goldColor,
  silverColor,
  bronzeColor,
  numberColor,
  numberBgColor,
  numberSize,
}: {
  index: number;
  style: 'number' | 'medal' | 'both';
  goldColor: string;
  silverColor: string;
  bronzeColor: string;
  numberColor: string;
  numberBgColor: string;
  numberSize: number;
}) {
  const rank = index + 1;
  const isTop3 = rank <= 3;

  const medalColor = rank === 1 ? goldColor : rank === 2 ? silverColor : bronzeColor;
  const useMedal = style === 'medal' || (style === 'both' && isTop3);

  const bgColor = useMedal ? medalColor : numberBgColor;
  const textColor = useMedal ? '#ffffff' : numberColor;

  if (useMedal && isTop3) {
    return (
      <div
        className="absolute top-2 left-2 z-10 rounded-full flex items-center justify-center font-bold shadow-lg"
        style={{
          width: `${numberSize}px`,
          height: `${numberSize}px`,
          backgroundColor: bgColor,
          color: textColor,
          fontSize: `${numberSize * 0.4}px`,
          lineHeight: 1,
          flexDirection: 'column',
        }}
        title={`No. ${rank}`}
      >
        {rank === 1 && <Trophy size={numberSize * 0.5} />}
        {rank === 2 && <Medal size={numberSize * 0.5} />}
        {rank === 3 && <Award size={numberSize * 0.5} />}
      </div>
    );
  }

  return (
    <div
      className="absolute top-2 left-2 z-10 rounded-full flex items-center justify-center font-bold shadow-md"
      style={{
        width: `${numberSize}px`,
        height: `${numberSize}px`,
        backgroundColor: bgColor,
        color: textColor,
        fontSize: `${numberSize * 0.45}px`,
        lineHeight: 1,
      }}
    >
      {rank}
    </div>
  );
}

// ==================== 主组件 ====================
export function ProductRankingBlock(props: ProductRankingBlockProps) {
  const {
    productSelection = { ids: [], locale: 'zh' },
    bannerType = 'standard',
    backgroundColor = '#ffffff',
    titleGroup = {
      title: '热门榜单',
      subtitle: '',
      titleColor: '#000000',
      titleFontSize: 32,
      subtitleColor: '#666666',
      subtitleFontSize: 16,
      titleAlign: 'center',
    },
    rankingGroup = {
      columns: 1,
      gap: 16,
      showRanking: true,
      rankingStyle: 'both',
      rankingNumberColor: '#ffffff',
      rankingNumberBgColor: '#3b82f6',
      rankingNumberSize: 36,
      medalGoldColor: '#fbbf24',
      medalSilverColor: '#9ca3af',
      medalBronzeColor: '#f97316',
      cardLayout: 'horizontal',
      imageWidth: 120,
      imageAspectRatio: '1:1',
      linkPattern: '/{locale}/product/{slug}',
      openInNewTab: true,   // ✅ 新增
    },
    layoutGroup = {
      cardRadius: 12,
      cardBgColor: '#ffffff',
      cardBorderColor: '#e5e7eb',
      cardHoverShadow: true,
      cardHoverLift: false,
    },
    nameGroup = { nameColor: '#000000', nameFontSize: 16, nameAlign: 'left' },
    skuGroup = { skuColor: '#999999', skuFontSize: 12, skuVisible: true },
    imageGroup = { aspectRatio: '1:1', objectFit: 'cover', hoverZoom: true },
    animationGroup = { enabled: true, duration: 600, delayStep: 80 },
    paddingGroup = { paddingTop: 48, paddingBottom: 48 },
    locale,
    __runtime,
    puck,
  } = props;

  const activeLocale = locale || __runtime?.locale || productSelection.locale || 'zh';
  const isEditMode = !!puck?.isEditing;

  const { products, loading } = useProductData({
    productIds: productSelection.ids,
    locale: activeLocale,
    isEditMode,
  });

  // ===== 规范化 =====
  const safeRanking = {
    columns: ([1, 2].includes(rankingGroup?.columns as number)
      ? rankingGroup.columns
      : 1) as 1 | 2,
    gap: rankingGroup?.gap ?? 16,
    showRanking: rankingGroup?.showRanking !== false,
    rankingStyle: rankingGroup?.rankingStyle ?? 'both',
    rankingNumberColor: rankingGroup?.rankingNumberColor ?? '#ffffff',
    rankingNumberBgColor: rankingGroup?.rankingNumberBgColor ?? '#3b82f6',
    rankingNumberSize: rankingGroup?.rankingNumberSize ?? 36,
    medalGoldColor: rankingGroup?.medalGoldColor ?? '#fbbf24',
    medalSilverColor: rankingGroup?.medalSilverColor ?? '#9ca3af',
    medalBronzeColor: rankingGroup?.medalBronzeColor ?? '#f97316',
    cardLayout: rankingGroup?.cardLayout ?? 'horizontal',
    imageWidth: rankingGroup?.imageWidth ?? 120,
    imageAspectRatio: rankingGroup?.imageAspectRatio ?? '1:1',
    linkPattern: rankingGroup?.linkPattern ?? '/{locale}/product/{slug}',
    openInNewTab: rankingGroup?.openInNewTab !== false,   // ✅ 新增
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
  }, [safeAnimation.enabled, isEditMode, products.length]);

  const showContent = isEditMode || visible;

  // ✅ 跳转 URL 构建（用 product.slug）
  const buildLink = (product: ShowcaseProduct) => {
    const slug = product.slug || product.productId;
    return safeRanking.linkPattern
      .replace('{locale}', activeLocale)
      .replace('{slug}', slug)
      .replace('{id}', product.productId);
  };

  // ===== 空状态 =====
  if (!productSelection.ids || productSelection.ids.length === 0) {
    return (
      <div
        ref={puck?.dragRef}
        className="border-2 border-dashed border-gray-300 p-8 text-center text-gray-400"
      >
        〖产品榜单 - 请在属性面板选择产品〗
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

        {loading && products.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            {isEditMode ? '加载产品中...' : '加载中...'}
          </div>
        )}

        {products.length > 0 && (
          <div
            ref={containerRef}
            className={safeRanking.columns === 1 ? 'flex flex-col' : 'grid grid-cols-1 md:grid-cols-2'}
            style={{ gap: `${safeRanking.gap}px` }}
          >
            {products.map((product, idx) => (
              <div
                key={product.productId || `p-${idx}`}
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
                <ProductCard
                  product={product}
                  layoutGroup={{
                    ...layoutGroup,
                    cardLayout: safeRanking.cardLayout,
                    imageWidth: safeRanking.imageWidth,
                  }}
                  nameGroup={nameGroup}
                  skuGroup={skuGroup}
                  imageGroup={{
                    ...imageGroup,
                    aspectRatio: safeRanking.imageAspectRatio,
                  }}
                  href={isEditMode ? undefined : buildLink(product)}
                  openInNewTab={safeRanking.openInNewTab}
                  prefix={
                    safeRanking.showRanking ? (
                      <RankingBadge
                        index={idx}
                        style={safeRanking.rankingStyle}
                        goldColor={safeRanking.medalGoldColor}
                        silverColor={safeRanking.medalSilverColor}
                        bronzeColor={safeRanking.medalBronzeColor}
                        numberColor={safeRanking.rankingNumberColor}
                        numberBgColor={safeRanking.rankingNumberBgColor}
                        numberSize={safeRanking.rankingNumberSize}
                      />
                    ) : undefined
                  }
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}