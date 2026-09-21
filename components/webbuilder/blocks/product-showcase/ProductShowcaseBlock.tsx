'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ProductCard,
  type ShowcaseProduct,
} from '@/components/webbuilder/blocks/product-shared/ProductCard';

interface ProductShowcaseBlockProps {
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
  productSelection: {
    ids: string[];
    locale: string;
  };
  linkPattern: string;       // ✅ 新增
  openInNewTab: boolean;     // ✅ 新增
  locale?: string;
  __runtime?: { locale?: string };
  puck?: any;
}

const showcaseCache = new Map<string, { items: ShowcaseProduct[]; timestamp: number }>();
const SHOWCASE_TTL = 60 * 1000;

export function ProductShowcaseBlock(props: ProductShowcaseBlockProps) {
  const {
    bannerType = 'standard',
    backgroundColor = '#ffffff',
    titleGroup = {
      title: '产品展示',
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
    },
    nameGroup = { nameColor: '#000000', nameFontSize: 16, nameAlign: 'left' },
    skuGroup = { skuColor: '#999999', skuFontSize: 12, skuVisible: true },
    imageGroup = { aspectRatio: '1:1', objectFit: 'cover', hoverZoom: true },
    animationGroup = { enabled: true, duration: 600, delayStep: 80 },
    paddingGroup = { paddingTop: 48, paddingBottom: 48 },
    productSelection = { ids: [], locale: 'zh' },
    linkPattern = '/{locale}/product/{slug}',    // ✅
    openInNewTab = true,                          // ✅
    locale,
    __runtime,
    puck,
  } = props;

  const productIds = productSelection?.ids ?? [];
  const editorLocale = productSelection?.locale ?? 'zh';
  const activeLocale = locale || __runtime?.locale || editorLocale || 'zh';
  const isEditMode = !!puck?.isEditing;

  const productIdsKey = productIds.join(',');
  const stableProductIds = useMemo(() => productIds, [productIdsKey]); // eslint-disable-line

  // ===== 规范化 =====
  const safeLayout = {
    columns: (layoutGroup?.columns ?? 3) as 2 | 3 | 4,
    gap: layoutGroup?.gap ?? 24,
    cardRadius: layoutGroup?.cardRadius ?? 12,
    cardBgColor: layoutGroup?.cardBgColor ?? '#ffffff',
    cardBorderColor: layoutGroup?.cardBorderColor ?? '#e5e7eb',
    cardHoverShadow: layoutGroup?.cardHoverShadow !== false,
  };
  const safeAnimation = {
    enabled: animationGroup?.enabled !== false,
    duration: animationGroup?.duration ?? 600,
    delayStep: animationGroup?.delayStep ?? 80,
  };

  // ===== 数据加载 =====
  const [products, setProducts] = useState<ShowcaseProduct[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!stableProductIds || stableProductIds.length === 0) {
      setProducts([]);
      return;
    }

    const cacheKey = `${activeLocale}|${stableProductIds.join(',')}`;
    const cached = showcaseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < SHOWCASE_TTL) {
      setProducts(cached.items);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const res = await fetch('/api/front/products/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: stableProductIds, locale: activeLocale }),
        });
        const data = await res.json();
        const items: ShowcaseProduct[] = (data.items || []).map((p: any) => ({
          productId: p.productId,
          productName: p.productName,
          sku: p.sku,
          mainImage: p.mainImage || '',
          price: p.price,
          slug: p.slug || '',   // ✅ 新增
        }));

        const ordered = stableProductIds
          .map((id) => items.find((p) => p.productId === id))
          .filter(Boolean) as ShowcaseProduct[];

        if (!cancelled) {
          showcaseCache.set(cacheKey, { items: ordered, timestamp: Date.now() });
          setProducts(ordered);
        }
      } catch (err) {
        console.error('[ProductShowcaseBlock] 加载产品失败', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [stableProductIds, activeLocale]);

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

  // ✅ 构建跳转链接
  const buildLink = (product: ShowcaseProduct) => {
    const slug = product.slug || product.productId;
    return linkPattern
      .replace('{locale}', activeLocale)
      .replace('{slug}', slug)
      .replace('{id}', product.productId);
  };

  // ===== 空状态 =====
  if (!productIds || productIds.length === 0) {
    return (
      <div
        ref={puck?.dragRef}
        className="border-2 border-dashed border-gray-300 p-8 text-center text-gray-400"
      >
        〖产品展示 - 请在属性面板选择产品〗
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
      2: 'grid-cols-2',
      3: 'grid-cols-2 md:grid-cols-3',
      4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    }[safeLayout.columns] || 'grid-cols-2 md:grid-cols-3';

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

        {/* 产品网格 */}
        {products.length > 0 && (
          <div
            ref={containerRef}
            className={`grid ${gridCols}`}
            style={{ gap: `${safeLayout.gap}px` }}
          >
            {products.map((product, idx) => (
              <div
                key={product.productId || `product-${idx}`}
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
                    cardRadius: safeLayout.cardRadius,
                    cardBgColor: safeLayout.cardBgColor,
                    cardBorderColor: safeLayout.cardBorderColor,
                    cardHoverShadow: safeLayout.cardHoverShadow,
                  }}
                  nameGroup={nameGroup}
                  skuGroup={skuGroup}
                  imageGroup={imageGroup}
                  href={isEditMode ? undefined : buildLink(product)}
                  openInNewTab={openInNewTab}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}