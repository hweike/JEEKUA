'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const IMAGE_WIDTH_MAP = {
  full: 'w-full',
  half: 'w-1/2',
  third: 'w-1/3',
};

const getImageClass = (shape: string) => {
  switch (shape) {
    case 'adapt':
      return 'w-full object-contain';
    case 'portrait':
      return 'w-full aspect-[4/5] object-cover';
    case 'square':
      return 'w-full aspect-square object-cover';
    case 'circle':
      return 'w-full aspect-square rounded-full object-cover';
    default:
      return 'w-full object-cover';
  }
};

export function Multicolumn(props: any) {
  const isEditMode = !!props.puck?.isEditing;
  const pageLocale = useLocale();

  const bannerGroup = props.bannerGroup || {};
  const globalSettings = props.globalSettings || {};
  const layoutGroup = props.layoutGroup || {};
  const styleGroup = props.styleGroup || {};
  const items = props.items || [];

  const bannerType = bannerGroup.bannerType || 'standard';
  const backgroundColor = bannerGroup.backgroundColor || '#ffffff';
  const paddingTop = bannerGroup.paddingTop ?? 10;
  const paddingBottom = bannerGroup.paddingBottom ?? 10;

  const multicolumnTitle = globalSettings.multicolumnTitle ?? props.globalTitle;
  const multicolumnTitleFontSize = globalSettings.multicolumnTitleFontSize ?? props.globalTitleFontSize ?? 40;
  const multicolumnTitleColor = globalSettings.multicolumnTitleColor ?? props.globalTitleColor ?? '#000000';
  const multicolumnImageWidth = globalSettings.multicolumnImageWidth ?? props.imageWidth ?? 'third';
  const multicolumnImageShape = globalSettings.multicolumnImageShape ?? props.imageShape ?? 'square';
  const multicolumnButtonText = globalSettings.multicolumnButtonText ?? props.buttonText;
  const multicolumnButtonFontSize = globalSettings.multicolumnButtonFontSize ?? props.buttonFontSize ?? 16;
  const multicolumnButtonColor = globalSettings.multicolumnButtonColor ?? props.buttonColor ?? '#000000';
  const multicolumnButtonLink = globalSettings.multicolumnButtonLink ?? props.buttonLink ?? '';

  const columnsDesktop = layoutGroup.columnsDesktop || 3;
  const columnsAlign = layoutGroup.columnsAlign || 'center';
  const columnsMobile = layoutGroup.columnsMobile || 1;
  const mobileCarousel = layoutGroup.mobileCarousel || false;

  const columnBgColor = styleGroup.columnBgColor || '#f9fafb';
  const columnTitleColor = styleGroup.columnTitleColor || '#000000';
  const columnDescColor = styleGroup.columnDescColor || '#666666';

  const [editLocale, setEditLocale] = useState<string>(() => {
    if (typeof window !== 'undefined' && isEditMode) {
      const stored = localStorage.getItem('webbuilder_edit_locale');
      if (stored && (stored === 'zh' || stored === 'en')) return stored;
    }
    return pageLocale;
  });

  useEffect(() => {
    if (!isEditMode) return;
    const handler = (e: StorageEvent) => {
      if (e.key === 'webbuilder_edit_locale' && e.newValue && (e.newValue === 'zh' || e.newValue === 'en')) {
        setEditLocale(e.newValue);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [isEditMode]);

  useEffect(() => {
    if (!isEditMode) return;
    const stored = localStorage.getItem('webbuilder_edit_locale');
    if (!stored) setEditLocale(pageLocale);
  }, [isEditMode, pageLocale]);

  const displayLocale = isEditMode ? editLocale : pageLocale;

  const getText = (field: any) => {
    if (typeof field === 'string') return field;
    if (!field || typeof field !== 'object') return '';
    if (props.__runtime?.texts && field.textId && props.__runtime.texts[field.textId])
      return props.__runtime.texts[field.textId];
    return field[displayLocale] || field.en || field.zh || '';
  };

  const globalTitleText = getText(multicolumnTitle);
  const buttonText = getText(multicolumnButtonText);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const useCarousel = isMobile && mobileCarousel && items.length > columnsMobile;

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % Math.ceil(items.length / columnsMobile));
  };
  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + Math.ceil(items.length / columnsMobile)) % Math.ceil(items.length / columnsMobile));
  };

  const outerClasses = `relative overflow-hidden ${
    bannerType === 'fullwidth'
      ? 'w-screen left-1/2 right-1/2 -ml-[50vw] mr-[50vw]'
      : 'max-w-7xl mx-auto'
  }`;
  const outerMargin = bannerType === 'standard' ? { marginTop: '10px', marginBottom: '10px' } : {};

  const outerStyle: React.CSSProperties = { backgroundColor, ...outerMargin };
  const contentStyle: React.CSSProperties = { paddingTop: `${paddingTop}px`, paddingBottom: `${paddingBottom}px` };

  const gridColsDesktop = `grid-cols-${columnsDesktop}`;
  const gridColsMobile = `grid-cols-${columnsMobile}`;

  const buttonStyle: React.CSSProperties = {
    fontSize: `${multicolumnButtonFontSize}px`,
    backgroundColor: multicolumnButtonColor,
    color: '#ffffff',
    padding: '0.5rem 1rem',
    borderRadius: '0.375rem',
    display: 'inline-block',
    textDecoration: 'none',
    transition: 'opacity 0.2s',
  };

  const columnStyle: React.CSSProperties = {
    backgroundColor: columnBgColor,
    borderRadius: '0.5rem',
    padding: '1.5rem',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  };

  const imageWidthClass = IMAGE_WIDTH_MAP[multicolumnImageWidth] || 'w-full';
  const imageClass = getImageClass(multicolumnImageShape);

  if (isEditMode && items.length === 0) {
    return (
      <div ref={props.puck?.dragRef} className={outerClasses} style={outerStyle}>
        <div className="border-2 border-dashed border-gray-300 p-8 text-center text-gray-400">
          〖多列组件 - 请添加内容列〗
        </div>
      </div>
    );
  }

  const renderColumns = () => {
    const columnElements = items.map((item: any, idx: number) => {
      const titleText = getText(item.title);
      const descText = getText(item.description);
      const buttonLabelText = getText(item.buttonLabel);
      const imageUrl = item.imageUrl;

      return (
        <div key={item.id} className="flex-shrink-0 w-full md:w-auto">
          <div style={columnStyle}>
            {imageUrl && (
              <div className={`${imageWidthClass} ml-0 mr-auto mb-4`}>
                <img src={imageUrl} alt={titleText || 'image'} className={imageClass} />
              </div>
            )}
            {titleText && (
              <h3 className="text-xl font-semibold mb-2" style={{ color: columnTitleColor }}>
                {titleText}
              </h3>
            )}
            {descText && (
              <p className="text-sm mb-4 flex-grow" style={{ color: columnDescColor }}>
                {descText}
              </p>
            )}
            {/* 修改：去掉下划线，添加箭头 SVG */}
            {buttonLabelText && item.buttonLink && (
              <a
                href={item.buttonLink}
                className="inline-flex items-center gap-1 mt-2 hover:opacity-70 transition"
                style={{ color: columnDescColor, textDecoration: 'none' }}
                target="_blank"
                rel="noopener noreferrer"
              >
                {buttonLabelText}
                <span className="icon-wrap">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    className="icon icon-arrow"
                    viewBox="0 0 14 10"
                    style={{ width: '12px', height: '12px' }}
                  >
                    <path
                      fill="currentColor"
                      fillRule="evenodd"
                      d="M8.537.808a.5.5 0 0 1 .817-.162l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 1 1-.708-.708L11.793 5.5H1a.5.5 0 0 1 0-1h10.793L8.646 1.354a.5.5 0 0 1-.109-.546"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              </a>
            )}
          </div>
        </div>
      );
    });

    if (useCarousel) {
      const slidesCount = Math.ceil(items.length / columnsMobile);
      const startIdx = currentSlide * columnsMobile;
      const visibleItems = items.slice(startIdx, startIdx + columnsMobile);
      return (
        <div className="relative">
          <div className="grid grid-cols-1 md:hidden gap-6">
            {visibleItems.map((_, idx) => columnElements[startIdx + idx])}
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
          <div className={`hidden md:grid ${gridColsMobile} lg:${gridColsDesktop} gap-6 ${columnsAlign === 'center' ? 'justify-items-center' : ''}`}>
            {columnElements}
          </div>
        </div>
      );
    }

    return (
      <div className={`grid grid-cols-1 ${gridColsMobile} lg:${gridColsDesktop} gap-6 ${columnsAlign === 'center' ? 'justify-items-center' : ''}`}>
        {columnElements}
      </div>
    );
  };

  return (
    <div ref={props.puck?.dragRef} className={outerClasses} style={outerStyle}>
      <div className="relative w-full">
        <div style={contentStyle}>
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
            {globalTitleText && (
              <div className="text-center mb-12">
                <h2 className="font-bold" style={{ fontSize: `${multicolumnTitleFontSize}px`, color: multicolumnTitleColor }}>
                  {globalTitleText}
                </h2>
              </div>
            )}
            {renderColumns()}
            {buttonText && multicolumnButtonLink && (
              <div className="text-center mt-12">
                <a href={multicolumnButtonLink} style={buttonStyle} target="_blank" rel="noopener noreferrer">
                  {buttonText}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}