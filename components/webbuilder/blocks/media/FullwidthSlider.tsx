'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getImageUrl } from '@/lib/files/url';
import { DEFAULT_FULLWIDTH_SLIDER } from '@/lib/webbuilder/defaults/FullwidthSlider';
import { getAltSuffix } from '@/lib/webbuilder/alt-suffix-config';

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
  const [isTransitioning, setIsTransitioning] = useState(false);

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
        image.crossOrigin = 'anonymous';
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

  useEffect(() => {
    if (slideCount > 0 && currentSlide >= slideCount) {
      setCurrentSlide(0);
    }
  }, [slideCount, currentSlide]);

  const performSlideChange = useCallback(
    (newIndex: number, withAnimation: boolean = true) => {
      if (newIndex === currentSlide) return;
      if (isTransitioning && withAnimation) return;

      clearAllTimers();

      if (withAnimation) {
        setIsTransitioning(true);
        setCurrentSlide(newIndex);
        transitionTimerRef.current = setTimeout(() => {
          setIsTransitioning(false);
          transitionTimerRef.current = null;
          if (!isEditMode && autoplay !== 'none' && slideCount > 1) {
            scheduleNext();
          }
        }, 600);
      } else {
        setCurrentSlide(newIndex);
      }
    },
    [currentSlide, isTransitioning, clearAllTimers, isEditMode, autoplay, slideCount]
  );

  const goToPrev = useCallback(() => {
    if (isTransitioning || slideCount <= 1) return;
    const prevIndex = currentSlide === 0 ? slideCount - 1 : currentSlide - 1;
    performSlideChange(prevIndex, true);
  }, [isTransitioning, slideCount, currentSlide, performSlideChange]);

  const goToNext = useCallback(() => {
    if (isTransitioning || slideCount <= 1) return;
    const nextIndex = (currentSlide + 1) % slideCount;
    performSlideChange(nextIndex, true);
  }, [isTransitioning, slideCount, currentSlide, performSlideChange]);

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

  const currentImage = images[safeCurrentSlide];
  const hasValidImage = currentImage?.imageUrl?.trim();
  const imageUrl = getDisplayImageUrl(currentImage?.imageUrl || '', isEditMode);

  const heightStyle = {
    minHeight: `${height}px`,
    height: `${height}px`,
  };

  const isFullwidth = bannerType === 'fullwidth';

  // 外层容器样式：标准模式限制宽度，全屏模式全屏背景
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

  // 内容包装器：标准模式不设 maxWidth（由外层控制），全屏模式设 maxWidth 并居中
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

  const slideWidth = 100;
  const translateX = -safeCurrentSlide * slideWidth;

  return (
    <div ref={puck?.dragRef} style={outerContainerStyle}>
      <div style={contentWrapperStyle}>
        <div
          className="relative w-full overflow-hidden"
          style={{
            ...heightStyle,
            borderRadius: `${imageBorderRadius}px`,
          }}
        >
          <div
            className="flex transition-transform duration-600 ease-in-out will-change-transform"
            style={{
              transform: `translateX(${translateX}%)`,
              width: '100%',
              height: '100%',
              minHeight: 'inherit',
            }}
          >
            {images.map((img: any, idx: number) => {
              const imgUrl = getDisplayImageUrl(img.imageUrl || '', isEditMode);
              return (
                <div
                  key={idx}
                  className="flex-shrink-0 w-full h-full relative"
                  style={{ flex: '0 0 100%' }}
                >
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={`${seoTitle} - ${suffix} ${idx + 1}`}
                      className="w-full h-full object-cover object-center"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500">
                      暂无图片
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              gridTemplateColumns: '1fr',
              gridTemplateRows: '1fr',
              pointerEvents: 'none',
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
                zIndex: 10,
              }}
            >
              {renderContent()}
            </div>
          </div>

          {(slideCount > 1 || isEditMode) && (
            <>
              <button
                onClick={goToPrev}
                disabled={isTransitioning}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition z-20 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="上一张"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={goToNext}
                disabled={isTransitioning}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition z-20 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="下一张"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}

          {slideCount > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
              {images.map((_: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (idx === safeCurrentSlide || isTransitioning) return;
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