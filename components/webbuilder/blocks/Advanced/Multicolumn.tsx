'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getImageUrl } from '@/lib/files/url';
import { DEFAULT_MULTICOLUMN } from '@/lib/webbuilder/defaults/Multicolumn';
import { getAltSuffix } from '@/lib/webbuilder/alt-suffix-config';

function getDisplayImageUrl(url: string, isEditMode: boolean): string {
  if (!url) return '';
  const fullUrl = getImageUrl(url);
  if (isEditMode) {
    return `/api/proxy-image?url=${encodeURIComponent(fullUrl)}`;
  }
  return fullUrl;
}

const IMAGE_WIDTH_MAP = {
  full: 'w-full',
  half: 'w-1/2',
  third: 'w-1/3',
} as const;

export function Multicolumn(props: any) {
  const isEditMode = !!props.puck?.isEditing;

  // 从嵌套分组中合并默认值
  const bannerGroup = { ...DEFAULT_MULTICOLUMN.bannerGroup, ...props.bannerGroup };
  const globalGroup = { ...DEFAULT_MULTICOLUMN.globalGroup, ...props.globalGroup };
  const imageGroup = { ...DEFAULT_MULTICOLUMN.imageGroup, ...props.imageGroup };
  const layoutGroup = { ...DEFAULT_MULTICOLUMN.layoutGroup, ...props.layoutGroup };
  const styleGroup = { ...DEFAULT_MULTICOLUMN.styleGroup, ...props.styleGroup };
  const paddingGroup = { ...DEFAULT_MULTICOLUMN.paddingGroup, ...props.paddingGroup };
  const spacingGroup = { ...DEFAULT_MULTICOLUMN.spacingGroup, ...props.spacingGroup };
  const mergedItems = props.items ?? DEFAULT_MULTICOLUMN.items;

  // ✅ 解构 buttonGroup，包含所有字段
  const buttonGroup = { ...DEFAULT_MULTICOLUMN.buttonGroup, ...props.buttonGroup };
  const {
    buttonText,
    buttonFontSize,
    buttonColor,
    buttonLink,
    buttonPaddingX,
    buttonPaddingY,
    buttonBorderRadius,
  } = buttonGroup;

  const mobileScaleFactor = spacingGroup.mobileScaleFactor ?? 0.7;

  // Alt 自动生成
  const __runtime = props.__runtime || {};
  const seoTitle = __runtime.seoTitle || '';
  const locale = __runtime.locale || 'zh';
  const suffix = getAltSuffix('Multicolumn', locale);

  // 移动端轮播状态
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const useCarousel = isMobile && layoutGroup.mobileCarousel && mergedItems.length > layoutGroup.columnsMobile;

  const nextSlide = () => {
    const slidesCount = Math.ceil(mergedItems.length / layoutGroup.columnsMobile);
    setCurrentSlide((prev) => (prev + 1) % slidesCount);
  };
  const prevSlide = () => {
    const slidesCount = Math.ceil(mergedItems.length / layoutGroup.columnsMobile);
    setCurrentSlide((prev) => (prev - 1 + slidesCount) % slidesCount);
  };

  // 通栏统一实现
  const isFullwidth = bannerGroup.bannerType === 'fullwidth';
  const outerStyle: React.CSSProperties = {
    backgroundColor: bannerGroup.backgroundColor,
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
    ...(bannerGroup.bannerType === 'standard' ? { marginTop: '10px', marginBottom: '10px' } : {}),
  };
  const outerClasses = 'relative overflow-hidden';

  const contentStyle: React.CSSProperties = {
    paddingTop: `${paddingGroup.paddingTop}px`,
    paddingBottom: `${paddingGroup.paddingBottom}px`,
    maxWidth: '80rem',
    margin: '0 auto',
    width: '100%',
    paddingLeft: 'clamp(1rem, 2vw, 2rem)',
    paddingRight: 'clamp(1rem, 2vw, 2rem)',
  };

  // 响应式字体
  const globalTitleClamp = `clamp(${globalGroup.globalTitleFontSize * mobileScaleFactor}px, 3vw, ${globalGroup.globalTitleFontSize}px)`;
  const buttonFontClamp = `clamp(${buttonFontSize * mobileScaleFactor}px, 1.2vw, ${buttonFontSize}px)`;

  const imageWidthClass = IMAGE_WIDTH_MAP[imageGroup.imageWidth as keyof typeof IMAGE_WIDTH_MAP] || 'w-full';

  const getImageClass = (shape: string) => {
    switch (shape) {
      case 'adapt':
        return 'w-full h-auto object-contain rounded-lg';
      case 'portrait':
        return 'w-full h-auto aspect-[4/5] object-cover rounded-lg';
      case 'square':
        return 'w-full h-auto aspect-square object-cover rounded-lg';
      case 'circle':
        return 'w-full h-auto aspect-square rounded-full object-cover';
      default:
        return 'w-full h-auto object-contain rounded-lg';
    }
  };

  const imageClassName = getImageClass(imageGroup.imageShape);

  const columnStyle: React.CSSProperties = {
    backgroundColor: styleGroup.columnBgColor,
    borderRadius: '0.5rem',
    padding: '1.5rem',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    textAlign: layoutGroup.columnsAlign === 'center' ? 'center' : 'left',
    alignItems: layoutGroup.columnsAlign === 'center' ? 'center' : 'flex-start',
  };

  // ✅ 使用解构出的按钮样式字段
  const buttonStyle: React.CSSProperties = {
    fontSize: buttonFontClamp,
    backgroundColor: buttonColor,
    color: '#ffffff',
    padding: `${buttonPaddingY}px ${buttonPaddingX}px`,
    borderRadius: `${buttonBorderRadius}px`,
    display: 'inline-block',
    textDecoration: 'none',
    transition: 'opacity 0.2s',
  };

  if (isEditMode && mergedItems.length === 0 && !globalGroup.globalTitle) {
    return (
      <div ref={props.puck?.dragRef} className={outerClasses} style={outerStyle}>
        <div className="border-2 border-dashed border-gray-300 p-8 text-center text-gray-400">
          〖多列组件 - 请添加内容列〗
        </div>
      </div>
    );
  }

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${layoutGroup.columnsDesktop}, minmax(0, 1fr))`,
    gap: '1.5rem',
    justifyContent: layoutGroup.columnsAlign === 'center' ? 'center' : 'flex-start',
  };

  const mobileGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${layoutGroup.columnsMobile}, minmax(0, 1fr))`,
    gap: '1.5rem',
    justifyContent: layoutGroup.columnsAlign === 'center' ? 'center' : 'flex-start',
  };

  const renderColumns = () => {
    const columnElements = mergedItems.map((item: any, idx: number) => {
      const alt = seoTitle ? `${seoTitle} - ${suffix} ${idx + 1}` : `${suffix} ${idx + 1}`;
      const displayImageUrl = getDisplayImageUrl(item.imageUrl, isEditMode);

      return (
        <div key={idx} style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <div style={columnStyle}>
            {item.imageUrl && (
              <div className={`${imageWidthClass} mb-4 ${layoutGroup.columnsAlign === 'center' ? 'mx-auto' : 'ml-0 mr-auto'}`}>
                {displayImageUrl ? (
                  <img
                    src={displayImageUrl}
                    alt={alt}
                    className={imageClassName}
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-48 flex items-center justify-center bg-gray-100 text-gray-400 rounded-lg">
                    图片加载失败
                  </div>
                )}
              </div>
            )}
            {item.title && (
              <h3 className="text-xl font-semibold mb-2 w-full" style={{ color: styleGroup.columnTitleColor }}>
                {item.title}
              </h3>
            )}
            {item.description && (
              <p className="text-sm mb-4 flex-grow w-full" style={{ color: styleGroup.columnDescColor }}>
                {item.description}
              </p>
            )}
            {item.buttonLabel && item.buttonLink && (
              <a
                href={item.buttonLink}
                className="inline-flex items-center gap-1 mt-2 hover:opacity-70 transition"
                style={{ color: styleGroup.columnDescColor, textDecoration: 'none' }}
                target="_blank"
                rel="noopener noreferrer"
              >
                {item.buttonLabel}
                <ChevronRight size={14} />
              </a>
            )}
          </div>
        </div>
      );
    });

    if (useCarousel) {
      const slidesCount = Math.ceil(mergedItems.length / layoutGroup.columnsMobile);
      const startIdx = currentSlide * layoutGroup.columnsMobile;
      const visibleItems = mergedItems.slice(startIdx, startIdx + layoutGroup.columnsMobile);
      const visibleIndices = visibleItems.map((_: any, i: number) => startIdx + i);

      return (
        <div className="relative">
          <div style={mobileGridStyle} className="md:hidden">
            {visibleIndices.map((idx: number) => columnElements[idx])}
          </div>
          {slidesCount > 1 && (
            <div className="flex justify-center items-center gap-4 mt-6 md:hidden">
              <button onClick={prevSlide} className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition">
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm">{currentSlide + 1} / {slidesCount}</span>
              <button onClick={nextSlide} className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition">
                <ChevronRight size={20} />
              </button>
            </div>
          )}
          <div style={gridStyle} className="hidden md:grid">
            {columnElements}
          </div>
        </div>
      );
    }

    if (isMobile) {
      return <div style={mobileGridStyle}>{columnElements}</div>;
    }

    return <div style={gridStyle}>{columnElements}</div>;
  };

  return (
    <div ref={props.puck?.dragRef} className={outerClasses} style={outerStyle}>
      <div className="relative w-full">
        <div style={contentStyle}>
          <div className="w-full">
            {globalGroup.globalTitle && (
              <div className="text-center mb-12">
                <h2
                  className="font-bold"
                  style={{
                    fontSize: globalTitleClamp,
                    color: globalGroup.globalTitleColor,
                  }}
                >
                  {globalGroup.globalTitle}
                </h2>
              </div>
            )}
            {renderColumns()}
            {buttonText && (
              <div className="text-center mt-12">
                {buttonLink ? (
                  <a
                    href={buttonLink}
                    style={buttonStyle}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {buttonText}
                  </a>
                ) : (
                  <span style={buttonStyle}>{buttonText}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}