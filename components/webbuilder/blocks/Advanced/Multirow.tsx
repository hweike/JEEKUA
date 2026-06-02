'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';

const HEIGHT_MAP: Record<string, string> = {
  auto: 'h-auto',
  small: 'h-48 md:h-64',
  medium: 'h-64 md:h-96',
  large: 'h-96 md:h-[30rem]',
};

const WIDTH_MAP: Record<string, string> = {
  small: 'w-full md:w-1/3',
  medium: 'w-full md:w-1/2',
  large: 'w-full md:w-2/3',
};

export function Multirow(props: any) {
  const isEditMode = !!props.puck?.isEditing;
  const pageLocale = useLocale();

  // 从分组中解构数据（提供默认值）
  const bannerGroup = props.bannerGroup || {};
  const imageGroup = props.imageGroup || {};
  const contentGroup = props.contentGroup || {};
  const paddingGroup = props.paddingGroup || {};
  const items = props.items || [];

  const bannerType = bannerGroup.bannerType || 'standard';
  const backgroundColor = bannerGroup.backgroundColor || '#ffffff';

  const imageHeight = imageGroup.imageHeight || 'auto';
  const imageWidth = imageGroup.imageWidth || 'medium';
  const imagePlacement = imageGroup.imagePlacement || 'alternate-left';

  const columnBgColor = contentGroup.columnBgColor || '#f9fafb';
  const columnTitleColor = contentGroup.columnTitleColor || '#000000';
  const columnTitleFontSize = contentGroup.columnTitleFontSize || 32;
  const columnDescColor = contentGroup.columnDescColor || '#666666';
  const columnDescFontSize = contentGroup.columnDescFontSize || 16;
  const contentVertical = contentGroup.contentVertical || 'middle';
  const textAlign = contentGroup.textAlign || 'left';
  const mobileTextAlign = contentGroup.mobileTextAlign || 'center';

  const paddingTop = paddingGroup.paddingTop ?? 32;
  const paddingBottom = paddingGroup.paddingBottom ?? 32;

  // 多语言逻辑
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

  // 响应式检测
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const currentTextAlign = isMobile ? mobileTextAlign : textAlign;

  // 计算当前行的图片位置
  const getImagePosition = (index: number) => {
    if (imagePlacement === 'alternate-left') {
      return index % 2 === 0 ? 'left' : 'right';
    }
    if (imagePlacement === 'alternate-right') {
      return index % 2 === 0 ? 'right' : 'left';
    }
    return imagePlacement; // 'left' or 'right'
  };

  // 通栏样式
  const outerClasses = `relative overflow-hidden ${
    bannerType === 'fullwidth'
      ? 'w-screen left-1/2 right-1/2 -ml-[50vw] mr-[50vw]'
      : 'max-w-7xl mx-auto'
  }`;
  const outerMargin = bannerType === 'standard' ? { marginTop: '10px', marginBottom: '10px' } : {};
  const outerStyle: React.CSSProperties = { backgroundColor, ...outerMargin };
  const contentStyle: React.CSSProperties = { paddingTop: `${paddingTop}px`, paddingBottom: `${paddingBottom}px` };

  // 垂直对齐类
  const verticalAlignClass =
    contentVertical === 'top' ? 'items-start' : contentVertical === 'bottom' ? 'items-end' : 'items-center';

  // 图片尺寸类
  const imageHeightClass = HEIGHT_MAP[imageHeight] || 'h-auto';
  const imageWidthClass = WIDTH_MAP[imageWidth] || 'w-full md:w-1/2';

  // 文本区域样式
  const textAreaStyle: React.CSSProperties = {
    backgroundColor: columnBgColor,
    borderRadius: '0.5rem',
    padding: '1.5rem',
    textAlign: currentTextAlign as any,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: `${columnTitleFontSize}px`,
    color: columnTitleColor,
    marginBottom: '0.5rem',
  };

  const descStyle: React.CSSProperties = {
    fontSize: `${columnDescFontSize}px`,
    color: columnDescColor,
    marginBottom: '1rem',
  };

  const linkStyle: React.CSSProperties = {
    color: columnDescColor,
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  };

  if (isEditMode && items.length === 0) {
    return (
      <div ref={props.puck?.dragRef} className={outerClasses} style={outerStyle}>
        <div className="border-2 border-dashed border-gray-300 p-8 text-center text-gray-400">
          〖多行组件 - 请添加内容行〗
        </div>
      </div>
    );
  }

  return (
    <div ref={props.puck?.dragRef} className={outerClasses} style={outerStyle}>
      <div className="relative w-full">
        <div style={contentStyle}>
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
            <div className="space-y-8">
              {items.map((item: any, idx: number) => {
                const titleText = getText(item.title);
                const descText = getText(item.description);
                const linkLabelText = getText(item.linkLabel);
                const imageUrl = item.imageUrl;
                const imgPosition = getImagePosition(idx);
                const flexDirection = imgPosition === 'left' ? 'md:flex-row' : 'md:flex-row-reverse';

                return (
                  <div
                    key={item.id}
                    className={`flex flex-col ${flexDirection} gap-6 ${verticalAlignClass}`}
                  >
                    {/* 图片区域 */}
                    <div className={`${imageWidthClass} flex-shrink-0`}>
                      <div className={`${imageHeightClass} overflow-hidden rounded-lg`}>
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={titleText || 'image'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
                            暂无图片
                          </div>
                        )}
                      </div>
                    </div>
                    {/* 文本区域 */}
                    <div className="flex-1">
                      <div style={textAreaStyle}>
                        {titleText && <div style={titleStyle}>{titleText}</div>}
                        {descText && <div style={descStyle}>{descText}</div>}
                        {linkLabelText && item.linkUrl && (
                          <a
                            href={item.linkUrl}
                            style={linkStyle}
                            className="hover:opacity-70 transition"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {linkLabelText}
                            <span className="icon-wrap">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
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
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}