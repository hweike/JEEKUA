'use client';

import React, { useEffect, useRef, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductCard, type ShowcaseProduct } from '@/components/webbuilder/blocks/product-shared/ProductCard';
import { useProductData } from '@/components/webbuilder/blocks/product-shared/useProductData';

interface ProductCarouselBlockProps {
  productSelection: {
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
  carouselGroup: {
    slidesPerView: 1 | 2 | 3 | 4;
    slidesPerViewMobile: 1 | 2;
    gap: number;
    loop: boolean;
    autoplay: boolean;
    autoplayInterval: number;
    pauseOnHover: boolean;
    showArrows: boolean;
    arrowColor: string;
    arrowBgColor: string;
    arrowPosition: 'inside' | 'outside' | 'overlay';
    showDots: boolean;
    dotColor: string;
    dotActiveColor: string;
    draggable: boolean;
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

  linkPattern: string;
  openInNewTab: boolean;
  locale?: string;
  __runtime?: { locale?: string };
  puck?: any;
}

export function ProductCarouselBlock(props: ProductCarouselBlockProps) {
  const {
    productSelection = { ids: [], locale: 'zh' },
    bannerType = 'standard',
    backgroundColor = '#ffffff',
    titleGroup = {
      title: '产品轮播',
      subtitle: '',
      titleColor: '#000000',
      titleFontSize: 32,
      subtitleColor: '#666666',
      subtitleFontSize: 16,
      titleAlign: 'center',
    },
    carouselGroup = {
      slidesPerView: 3,
      slidesPerViewMobile: 1,
      gap: 24,
      loop: true,
      autoplay: false,
      autoplayInterval: 3000,
      pauseOnHover: true,
      showArrows: true,
      arrowColor: '#000000',
      arrowBgColor: '#ffffff',
      arrowPosition: 'inside',
      showDots: true,
      dotColor: '#d1d5db',
      dotActiveColor: '#3b82f6',
      draggable: true,
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
    linkPattern = '/{locale}/product/{slug}',
    openInNewTab = true,
    locale,
    __runtime,
    puck,
  } = props;

  const activeLocale = locale || __runtime?.locale || productSelection.locale || 'zh';
  const isEditMode = !!puck?.isEditing;

  // ✅ 复用数据 Hook
  const { products, loading } = useProductData({
    productIds: productSelection.ids,
    locale: activeLocale,
    isEditMode,
  });

  // ===== 规范化 =====
  const safeCarousel = {
    slidesPerView: ([1, 2, 3, 4].includes(carouselGroup?.slidesPerView as number)
      ? carouselGroup.slidesPerView
      : 3) as 1 | 2 | 3 | 4,
    slidesPerViewMobile: ([1, 2].includes(carouselGroup?.slidesPerViewMobile as number)
      ? carouselGroup.slidesPerViewMobile
      : 1) as 1 | 2,
    gap: carouselGroup?.gap ?? 24,
    loop: carouselGroup?.loop !== false,
    autoplay: carouselGroup?.autoplay === true,
    autoplayInterval: carouselGroup?.autoplayInterval ?? 3000,
    pauseOnHover: carouselGroup?.pauseOnHover !== false,
    showArrows: carouselGroup?.showArrows !== false,
    arrowColor: carouselGroup?.arrowColor ?? '#000000',
    arrowBgColor: carouselGroup?.arrowBgColor ?? '#ffffff',
    arrowPosition: carouselGroup?.arrowPosition ?? 'inside',
    showDots: carouselGroup?.showDots !== false,
    dotColor: carouselGroup?.dotColor ?? '#d1d5db',
    dotActiveColor: carouselGroup?.dotActiveColor ?? '#3b82f6',
    draggable: carouselGroup?.draggable !== false,
  };

  const safeAnimation = {
    enabled: animationGroup?.enabled !== false,
    duration: animationGroup?.duration ?? 600,
    delayStep: animationGroup?.delayStep ?? 80,
  };

  // ===== Embla 初始化 =====
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: safeCarousel.loop && products.length > safeCarousel.slidesPerView,
    align: 'start',
    slidesToScroll: 1,
    containScroll: 'trimSnaps',
    dragFree: false,
    draggable: safeCarousel.draggable && !isEditMode,
  });

  // ===== 圆点状态 =====
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    const onReInit = () => {
      setScrollSnaps(emblaApi.scrollSnapList());
      onSelect();
    };
    onReInit();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onReInit);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onReInit);
    };
  }, [emblaApi, products.length]);

  // ===== 自动播放 =====
  const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!emblaApi || !safeCarousel.autoplay || isEditMode) return;
    if (products.length <= safeCarousel.slidesPerView) return;

    const start = () => {
      stop();
      autoplayTimerRef.current = setInterval(() => {
        emblaApi.scrollNext();
      }, safeCarousel.autoplayInterval);
    };
    const stop = () => {
      if (autoplayTimerRef.current) {
        clearInterval(autoplayTimerRef.current);
        autoplayTimerRef.current = null;
      }
    };

    start();

    if (safeCarousel.pauseOnHover) {
      const onEnter = () => stop();
      const onLeave = () => start();
      const root = emblaApi.rootNode();
      root.addEventListener('mouseenter', onEnter);
      root.addEventListener('mouseleave', onLeave);
      return () => {
        stop();
        root.removeEventListener('mouseenter', onEnter);
        root.removeEventListener('mouseleave', onLeave);
      };
    }

    return () => stop();
  }, [
    emblaApi,
    safeCarousel.autoplay,
    safeCarousel.autoplayInterval,
    safeCarousel.pauseOnHover,
    isEditMode,
    products.length,
    safeCarousel.slidesPerView,
  ]);

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
  if (!productSelection.ids || productSelection.ids.length === 0) {
    return (
      <div
        ref={puck?.dragRef}
        className="border-2 border-dashed border-gray-300 p-8 text-center text-gray-400"
      >
        〖产品轮播 - 请在属性面板选择产品〗
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

  const carouselVars = {
    '--slides-mobile': safeCarousel.slidesPerViewMobile,
    '--slides-desktop': safeCarousel.slidesPerView,
    '--carousel-gap': `${safeCarousel.gap}px`,
  } as React.CSSProperties;

  const arrowPosStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 10,
  };
  const arrowLeftStyle: React.CSSProperties = {
    ...arrowPosStyle,
    ...(safeCarousel.arrowPosition === 'outside'
      ? { left: '-48px' }
      : safeCarousel.arrowPosition === 'overlay'
      ? { left: '8px' }
      : { left: '8px' }),
  };
  const arrowRightStyle: React.CSSProperties = {
    ...arrowPosStyle,
    ...(safeCarousel.arrowPosition === 'outside'
      ? { right: '-48px' }
      : safeCarousel.arrowPosition === 'overlay'
      ? { right: '8px' }
      : { right: '8px' }),
  };

  const arrowButtonClass =
    'rounded-full w-10 h-10 flex items-center justify-center shadow-md transition hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed';

  // ✅ 标题入场动画
  const titleEnterStyle: React.CSSProperties = {
    opacity: showContent ? 1 : 0,
    transform: showContent ? 'translateY(0)' : 'translateY(24px)',
    transition: `opacity ${safeAnimation.duration}ms ease-out 0ms, transform ${safeAnimation.duration}ms ease-out 0ms`,
    willChange: 'opacity, transform',
  };

  // ✅ 轮播区入场动画（延迟 150ms）
  const carouselEnterStyle: React.CSSProperties = {
    opacity: showContent ? 1 : 0,
    transform: showContent ? 'translateY(0)' : 'translateY(32px)',
    transition: `opacity ${safeAnimation.duration}ms ease-out 150ms, transform ${safeAnimation.duration}ms ease-out 150ms`,
    willChange: 'opacity, transform',
  };

  // ✅ 箭头/圆点入场动画（延迟 400ms）
  const controlsEnterStyle: React.CSSProperties = {
    opacity: showContent ? 1 : 0,
    transition: `opacity 400ms ease-out 400ms`,
  };

  return (
    <div ref={puck?.dragRef} style={outerStyle}>
      <style>{`
        .pc-embla {
          overflow: hidden;
        }
        .pc-embla__container {
          display: flex;
          gap: var(--carousel-gap);
        }
        .pc-embla__slide {
          flex: 0 0 calc((100% - (var(--slides-mobile) - 1) * var(--carousel-gap)) / var(--slides-mobile));
          min-width: 0;
        }
        @media (min-width: 768px) {
          .pc-embla__slide {
            flex: 0 0 calc((100% - (var(--slides-desktop) - 1) * var(--carousel-gap)) / var(--slides-desktop));
          }
        }
      `}</style>

      <div style={innerStyle}>
        {/* ✅ 标题区（入场动画） */}
        {(titleGroup.title || titleGroup.subtitle) && (
          <div className="mb-10" style={{ textAlign: titleGroup.titleAlign, ...titleEnterStyle }}>
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
            style={{
              ...carouselVars,
              ...carouselEnterStyle,
              position: 'relative',
            }}
          >
            {/* 轮播容器 */}
            <div className="pc-embla" ref={emblaRef}>
              <div className="pc-embla__container">
                {products.map((product, idx) => (
                  <div className="pc-embla__slide" key={product.productId || `p-${idx}`}>
                    <ProductCard
                      product={product}
                      layoutGroup={layoutGroup}
                      nameGroup={nameGroup}
                      skuGroup={skuGroup}
                      imageGroup={imageGroup}
                      href={isEditMode ? undefined : buildLink(product)}
                      openInNewTab={openInNewTab}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* ✅ 左箭头（延迟入场） */}
            {safeCarousel.showArrows && products.length > safeCarousel.slidesPerView && (
              <button
                type="button"
                onClick={() => emblaApi?.scrollPrev()}
                className={arrowButtonClass}
                style={{
                  ...arrowLeftStyle,
                  backgroundColor: safeCarousel.arrowBgColor,
                  color: safeCarousel.arrowColor,
                  ...controlsEnterStyle,
                }}
                aria-label="上一个"
              >
                <ChevronLeft size={20} />
              </button>
            )}

            {/* ✅ 右箭头（延迟入场） */}
            {safeCarousel.showArrows && products.length > safeCarousel.slidesPerView && (
              <button
                type="button"
                onClick={() => emblaApi?.scrollNext()}
                className={arrowButtonClass}
                style={{
                  ...arrowRightStyle,
                  backgroundColor: safeCarousel.arrowBgColor,
                  color: safeCarousel.arrowColor,
                  ...controlsEnterStyle,
                }}
                aria-label="下一个"
              >
                <ChevronRight size={20} />
              </button>
            )}

            {/* ✅ 圆点（延迟入场） */}
            {safeCarousel.showDots && scrollSnaps.length > 1 && (
              <div
                className="flex justify-center gap-2 mt-6"
                style={controlsEnterStyle}
              >
                {scrollSnaps.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => emblaApi?.scrollTo(index)}
                    className="w-2 h-2 rounded-full transition-all"
                    style={{
                      backgroundColor:
                        index === selectedIndex
                          ? safeCarousel.dotActiveColor
                          : safeCarousel.dotColor,
                      width: index === selectedIndex ? '24px' : '8px',
                    }}
                    aria-label={`第 ${index + 1} 页`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}