'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getImageUrl } from '@/lib/files/url';
import { DEFAULT_FULLWIDTH_SLIDER } from '@/lib/webbuilder/defaults/FullwidthSlider';
import { getAltSuffix } from '@/lib/webbuilder/alt-suffix-config';

// ✅ 切换动画：700ms + 缓动
const SLIDE_TRANSITION_MS = 700;
const SLIDE_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';

// ✅ 首次进入动画：800ms
const ENTER_TRANSITION_MS = 800;

function getDisplayImageUrl(url: string, isEditMode: boolean): string {
  if (!url) return '';
  const fullUrl = getImageUrl(url);
  if (isEditMode) {
    return `/api/proxy-image?url=${encodeURIComponent(fullUrl)}`;
  }
  return fullUrl;
}

const POSITION_MAP: Record<string, { justifySelf: string; alignSelf: string }> = {
  'top-left': { justifySelf: 'start', alignSelf: 'start' },
  'top-center': { justifySelf: 'center', alignSelf: 'start' },
  'top-right': { justifySelf: 'end', alignSelf: 'start' },
  'center-left': { justifySelf: 'start', alignSelf: 'center' },
  'center-center': { justifySelf: 'center', alignSelf: 'center' },
  'center-right': { justifySelf: 'end', alignSelf: 'center' },
  'bottom-left': { justifySelf: 'start', alignSelf: 'end' },
  'bottom-center': { justifySelf: 'center', alignSelf: 'end' },
  'bottom-right': { justifySelf: 'end', alignSelf: 'end' },
};

export function FullwidthSlider({
  bannerType = DEFAULT_FULLWIDTH_SLIDER.bannerType,
  backgroundColor = DEFAULT_FULLWIDTH_SLIDER.backgroundColor,
  paddingTop = DEFAULT_FULLWIDTH_SLIDER.paddingTop,
  paddingBottom = DEFAULT_FULLWIDTH_SLIDER.paddingBottom,
  height = DEFAULT_FULLWIDTH_SLIDER.height,
  autoplay = DEFAULT_FULLWIDTH_SLIDER.autoplay,
  images = DEFAULT_FULLWIDTH_SLIDER.images,
  puck,
  __runtime,
}: any) {
  const isEditMode = !!puck?.isEditing;
  const slideCount = images?.length || 0;
  const [currentSlide, setCurrentSlide] = useState(0);
  const [prevSlideIndex, setPrevSlideIndex] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // ✅ 首次进入动画状态
  const [hasEntered, setHasEntered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const [allImagesLoaded, setAllImagesLoaded] = useState(false);

  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const scheduleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prevImagesRef = useRef<any[]>(images);

  const buttonFontSize = DEFAULT_FULLWIDTH_SLIDER.buttonFontSize || 16;
  const mobileScaleFactor = DEFAULT_FULLWIDTH_SLIDER.mobileScaleFactor || 0.7;

  const imageBorderRadius = DEFAULT_FULLWIDTH_SLIDER.imageBorderRadius;
  const buttonBorderRadius = DEFAULT_FULLWIDTH_SLIDER.buttonBorderRadius;
  const buttonPaddingX = DEFAULT_FULLWIDTH_SLIDER.buttonPaddingX;
  const buttonPaddingY = DEFAULT_FULLWIDTH_SLIDER.buttonPaddingY;
  const contentMaxWidth = DEFAULT_FULLWIDTH_SLIDER.contentMaxWidth;
  const contentPadding = DEFAULT_FULLWIDTH_SLIDER.contentPadding;

  const seoTitle = __runtime?.seoTitle || '';
  const locale = __runtime?.locale || 'zh';
  const suffix = getAltSuffix('FullwidthSlider', locale);

  const clearAllTimers = useCallback(() => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    if (scheduleTimerRef.current) {
      clearTimeout(scheduleTimerRef.current);
      scheduleTimerRef.current = null;
    }
    setIsTransitioning(false);
  }, []);

  // ✅ 首次进入动画：滚动到视口时触发
  useEffect(() => {
    if (isEditMode) {
      // 编辑模式：直接显示
      setHasEntered(true);
      return;
    }

    const el = containerRef.current;
    if (!el) {
      setHasEntered(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setHasEntered(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isEditMode]);

  // ✅ 预加载所有图片（首次进入）
  useEffect(() => {
    if (slideCount === 0 || isEditMode) return;

    const loadPromises = images.map((img: any, index: number) => {
      return new Promise<void>((resolve) => {
        if (!img.imageUrl) {
          setLoadedImages((prev) => new Set(prev).add(index));
          resolve();
          return;
        }
        const image = new Image();
        image.src = getDisplayImageUrl(img.imageUrl, false);
        image.onload = () => {
          setLoadedImages((prev) => new Set(prev).add(index));
          resolve();
        };
        image.onerror = () => {
          setLoadedImages((prev) => new Set(prev).add(index));
          resolve();
        };
      });
    });

    Promise.all(loadPromises).then(() => {
      setAllImagesLoaded(true);
    });
  }, [images, slideCount, isEditMode]);

  // ✅ 预加载下一张（当前 slide 变化时）
  useEffect(() => {
    if (isEditMode || slideCount <= 1) return;
    const nextIndex = (currentSlide + 1) % slideCount;
    const nextUrl = images[nextIndex]?.imageUrl;
    if (nextUrl) {
      const img = new Image();
      img.src = getDisplayImageUrl(nextUrl, false);
    }
  }, [currentSlide, images, slideCount, isEditMode]);

  useEffect(() => {
    if (slideCount > 0 && currentSlide >= slideCount) {
      setCurrentSlide(0);
    }
  }, [slideCount, currentSlide]);

  // ✅ 核心：切换逻辑（双层叠加 + 位移/缩放/模糊）
  const performSlideChange = useCallback(
    (newIndex: number, withAnimation: boolean = true) => {
      if (newIndex === currentSlide) return;

      clearAllTimers();

      if (withAnimation) {
        setPrevSlideIndex(currentSlide);
        setCurrentSlide(newIndex);
        setIsTransitioning(true);

        transitionTimerRef.current = setTimeout(() => {
          setIsTransitioning(false);
          setPrevSlideIndex(null);
          transitionTimerRef.current = null;
          if (!isEditMode && autoplay !== 'none' && slideCount > 1) {
            scheduleNext();
          }
        }, SLIDE_TRANSITION_MS + 50);
      } else {
        setPrevSlideIndex(null);
        setCurrentSlide(newIndex);
      }
    },
    [currentSlide, clearAllTimers, isEditMode, autoplay, slideCount]
  );

  const goToPrev = useCallback(() => {
    if (slideCount <= 1) return;
    const prevIndex = currentSlide === 0 ? slideCount - 1 : currentSlide - 1;
    performSlideChange(prevIndex, true);
  }, [slideCount, currentSlide, performSlideChange]);

  const goToNext = useCallback(() => {
    if (slideCount <= 1) return;
    const nextIndex = (currentSlide + 1) % slideCount;
    performSlideChange(nextIndex, true);
  }, [slideCount, currentSlide, performSlideChange]);

  const isImageLoaded = useCallback(
    (index: number): boolean => loadedImages.has(index) || isEditMode,
    [loadedImages, isEditMode]
  );

  const scheduleNext = useCallback(() => {
    if (isEditMode || autoplay === 'none' || slideCount <= 1 || !allImagesLoaded) return;
    if (scheduleTimerRef.current) {
      clearTimeout(scheduleTimerRef.current);
      scheduleTimerRef.current = null;
    }
    const delay = autoplay === '5s' ? 5000 : 10000;
    scheduleTimerRef.current = setTimeout(() => {
      if (isTransitioning) {
        scheduleTimerRef.current = setTimeout(() => scheduleNext(), 100);
        return;
      }
      const nextIndex = (currentSlide + 1) % slideCount;
      if (isImageLoaded(nextIndex)) {
        performSlideChange(nextIndex, true);
      } else {
        scheduleTimerRef.current = setTimeout(() => scheduleNext(), 1000);
      }
    }, delay);
  }, [isEditMode, autoplay, slideCount, allImagesLoaded, currentSlide, isTransitioning, isImageLoaded, performSlideChange]);

  useEffect(() => {
    if (!isEditMode && allImagesLoaded && slideCount > 1 && autoplay !== 'none') {
      scheduleNext();
    }
    return () => {
      clearAllTimers();
    };
  }, [allImagesLoaded, isEditMode, slideCount, autoplay, scheduleNext, clearAllTimers]);

  // ✅ 编辑联动
  useEffect(() => {
    if (!isEditMode || slideCount === 0) return;

    const prev = prevImagesRef.current;
    let changedIndex = -1;
    for (let i = 0; i < Math.min(prev.length, images.length); i++) {
      if (JSON.stringify(prev[i]) !== JSON.stringify(images[i])) {
        changedIndex = i;
        break;
      }
    }
    if (changedIndex === -1 && prev.length !== images.length) {
      changedIndex = 0;
    }

    if (changedIndex !== -1) {
      if (changedIndex !== currentSlide) {
        performSlideChange(changedIndex, false);
      }
    }
    prevImagesRef.current = images;
  }, [images, isEditMode, slideCount, currentSlide, performSlideChange]);

  if (slideCount === 0 && isEditMode) {
    return (
      <div
        ref={puck?.dragRef}
        className="border-2 border-dashed border-gray-300 p-8 text-center text-gray-400"
        style={{ minHeight: `${height}px`, backgroundColor }}
      >
        〖全屏通栏幻灯片 - 请添加图片〗
      </div>
    );
  }
  if (slideCount === 0) return null;

  const safeCurrentSlide = Math.min(currentSlide, slideCount - 1);
  const safePrevSlideIndex =
    prevSlideIndex !== null && prevSlideIndex < slideCount ? prevSlideIndex : null;

  const currentImage = images[safeCurrentSlide];
  const prevImage = safePrevSlideIndex !== null ? images[safePrevSlideIndex] : null;

  const currentImageUrl = getDisplayImageUrl(currentImage?.imageUrl || '', isEditMode);
  const prevImageUrl = getDisplayImageUrl(prevImage?.imageUrl || '', isEditMode);

  const heightStyle = {
    minHeight: `${height}px`,
    height: `${height}px`,
  };

  const isFullwidth = bannerType === 'fullwidth';

  const outerContainerStyle: React.CSSProperties = {
    backgroundColor,
    marginTop: bannerType === 'standard' ? '10px' : 0,
    marginBottom: bannerType === 'standard' ? '10px' : 0,
    ...(isFullwidth
      ? {
          position: 'relative',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100vw',
          maxWidth: '100vw',
        }
      : {
          maxWidth: '80rem',
          marginLeft: 'auto',
          marginRight: 'auto',
        }),
  };

  const contentWrapperStyle: React.CSSProperties = {
    paddingTop: typeof paddingTop === 'number' ? `${paddingTop}px` : 0,
    paddingBottom: typeof paddingBottom === 'number' ? `${paddingBottom}px` : 0,
    width: '100%',
    paddingLeft: 'clamp(1rem, 2vw, 2rem)',
    paddingRight: 'clamp(1rem, 2vw, 2rem)',
    ...(isFullwidth
      ? {
          maxWidth: '80rem',
          margin: '0 auto',
        }
      : {}),
  };

  const title = currentImage?.title || '';
  const titleFontSize = currentImage?.titleFontSize || 48;
  const titleColor = currentImage?.titleColor || '#ffffff';
  const subtitle = currentImage?.subtitle || '';
  const subtitleFontSize = currentImage?.subtitleFontSize || 24;
  const subtitleColor = currentImage?.subtitleColor || '#ffffff';
  const buttonText = currentImage?.buttonText || '';
  const buttonLink = currentImage?.buttonLink || '';
  const contentPosition = currentImage?.contentPosition || 'center-center';
  const desktopAlign = currentImage?.desktopAlign || 'center';

  const titleSize = `clamp(${titleFontSize * mobileScaleFactor}px, 3.5vw, ${titleFontSize}px)`;
  const subtitleSize = `clamp(${subtitleFontSize * mobileScaleFactor}px, 2vw, ${subtitleFontSize}px)`;
  const buttonFontSizeClamp = `clamp(${buttonFontSize * mobileScaleFactor}px, 2vw, ${buttonFontSize}px)`;

  const slideAlt = seoTitle ? `${seoTitle} - ${suffix} ${safeCurrentSlide + 1}` : `${suffix} ${safeCurrentSlide + 1}`;
  const position = POSITION_MAP[contentPosition] || POSITION_MAP['center-center'];

  const renderContent = () => (
    <div
      className="text-white"
      style={{
        textAlign: desktopAlign === 'center' ? 'center' : desktopAlign === 'right' ? 'right' : 'left',
        maxWidth: contentMaxWidth,
        padding: contentPadding,
        pointerEvents: 'auto',
        wordBreak: 'break-word',
      }}
    >
      {title && (
        <h2
          style={{
            fontSize: titleSize,
            color: titleColor,
            marginBottom: '0.25rem',
          }}
        >
          {title}
        </h2>
      )}
      {subtitle && (
        <p
          style={{
            fontSize: subtitleSize,
            color: subtitleColor,
            marginBottom: '2rem',
          }}
        >
          {subtitle}
        </p>
      )}
      {buttonText && (
        buttonLink ? (
          <a
            href={buttonLink}
            style={{
              backgroundColor: '#2563eb',
              color: '#fff',
              padding: `${buttonPaddingY}px ${buttonPaddingX}px`,
              borderRadius: `${buttonBorderRadius}px`,
              display: 'inline-block',
              transition: 'opacity 0.2s',
              textDecoration: 'none',
              cursor: 'pointer',
              fontSize: buttonFontSizeClamp,
            }}
            className="hover:opacity-80"
            target="_blank"
            rel="noopener noreferrer"
          >
            {buttonText}
          </a>
        ) : (
          <span
            style={{
              backgroundColor: '#9ca3af',
              color: '#fff',
              padding: `${buttonPaddingY}px ${buttonPaddingX}px`,
              borderRadius: `${buttonBorderRadius}px`,
              display: 'inline-block',
              opacity: 0.6,
              cursor: 'default',
              fontSize: buttonFontSizeClamp,
            }}
          >
            {buttonText}
          </span>
        )
      )}
    </div>
  );

  const nextSlideIndex = slideCount > 1 ? (safeCurrentSlide + 1) % slideCount : -1;
  const nextImageUrl =
    nextSlideIndex >= 0
      ? getDisplayImageUrl(images[nextSlideIndex]?.imageUrl || '', false)
      : '';

  return (
    <div ref={puck?.dragRef} style={outerContainerStyle}>
      <div style={contentWrapperStyle}>
        <div
          ref={containerRef}
          className="relative w-full overflow-hidden"
          style={{
            ...heightStyle,
            borderRadius: `${imageBorderRadius}px`,
          }}
        >
          {/* ✅ 上一张：淡出 + 左移 + 放大 + 模糊 */}
          {safePrevSlideIndex !== null && prevImageUrl && (
            <div
              className="absolute inset-0"
              style={{
                opacity: isTransitioning ? 0 : 1,
                transform: isTransitioning
                  ? 'translateX(-80px) scale(1.15)'
                  : 'translateX(0) scale(1)',
                filter: isTransitioning ? 'blur(8px)' : 'blur(0px)',
                transition: `opacity ${SLIDE_TRANSITION_MS}ms ${SLIDE_EASING}, transform ${SLIDE_TRANSITION_MS}ms ${SLIDE_EASING}, filter ${SLIDE_TRANSITION_MS}ms ${SLIDE_EASING}`,
                pointerEvents: 'none',
                zIndex: 1,
                willChange: 'opacity, transform, filter',
              }}
            >
              <img
                src={prevImageUrl}
                alt=""
                className="w-full h-full object-cover object-center"
                decoding="async"
              />
            </div>
          )}

          {/* ✅ 当前：首次进入动画 + 切换动画 */}
          <div
            className="absolute inset-0"
            style={{
              // 首次未进入：0；已进入且切换中：0；否则：1
              opacity: !hasEntered ? 0 : (isTransitioning ? 0 : 1),
              transform: !hasEntered
                ? 'scale(1.15)'
                : (isTransitioning ? 'translateX(80px) scale(1.2)' : 'translateX(0) scale(1)'),
              filter: !hasEntered
                ? 'blur(10px)'
                : (isTransitioning ? 'blur(8px)' : 'blur(0px)'),
              // 首次进入用 800ms；切换用 700ms
              transition: !hasEntered
                ? `opacity ${ENTER_TRANSITION_MS}ms ${SLIDE_EASING}, transform ${ENTER_TRANSITION_MS}ms ${SLIDE_EASING}, filter ${ENTER_TRANSITION_MS}ms ${SLIDE_EASING}`
                : `opacity ${SLIDE_TRANSITION_MS}ms ${SLIDE_EASING}, transform ${SLIDE_TRANSITION_MS}ms ${SLIDE_EASING}, filter ${SLIDE_TRANSITION_MS}ms ${SLIDE_EASING}`,
              zIndex: 2,
              willChange: 'opacity, transform, filter',
            }}
          >
            {currentImageUrl ? (
              <img
                src={currentImageUrl}
                alt={slideAlt}
                className="w-full h-full object-cover object-center"
                decoding="async"
                fetchPriority="high"
              />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500">
                暂无图片
              </div>
            )}
          </div>

          {/* 隐藏预加载下一张 */}
          {nextImageUrl && (
            <img
              src={nextImageUrl}
              alt=""
              style={{ display: 'none' }}
              aria-hidden="true"
            />
          )}

          {/* 文字内容层 */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              gridTemplateColumns: '1fr',
              gridTemplateRows: '1fr',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            <div
              style={{
                gridArea: '1 / 1 / 1 / 1',
                justifySelf: position.justifySelf,
                alignSelf: position.alignSelf,
                display: 'inline-block',
                maxWidth: '100%',
                margin: 'clamp(1rem, 4vw, 2rem)',
              }}
            >
              {renderContent()}
            </div>
          </div>

          {/* 箭头（首次延迟淡入） */}
          {(slideCount > 1 || isEditMode) && (
            <div
              style={{
                opacity: hasEntered ? 1 : 0,
                transition: `opacity 400ms ease-out 300ms`,
                pointerEvents: hasEntered ? 'auto' : 'none',
              }}
            >
              <button
                onClick={goToPrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition z-20"
                aria-label="上一张"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition z-20"
                aria-label="下一张"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          )}

          {/* 圆点（首次延迟淡入） */}
          {slideCount > 1 && (
            <div
              className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20"
              style={{
                opacity: hasEntered ? 1 : 0,
                transition: `opacity 400ms ease-out 300ms`,
                pointerEvents: hasEntered ? 'auto' : 'none',
              }}
            >
              {images.map((_: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (idx === safeCurrentSlide) return;
                    performSlideChange(idx, true);
                  }}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    idx === safeCurrentSlide ? 'bg-white' : 'bg-white/50'
                  }`}
                  aria-label={`跳转到第 ${idx + 1} 张`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}