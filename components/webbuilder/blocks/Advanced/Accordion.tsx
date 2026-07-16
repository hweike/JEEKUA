'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { getImageUrl } from '@/lib/files/url';
import { DEFAULT_ACCORDION } from '@/lib/webbuilder/defaults/Accordion';
import { getAltSuffix } from '@/lib/webbuilder/alt-suffix-config';

function getDisplayImageUrl(url: string, isEditMode: boolean): string {
  if (!url) return '';
  const fullUrl = getImageUrl(url);
  if (isEditMode) {
    return `/api/proxy-image?url=${encodeURIComponent(fullUrl)}`;
  }
  return fullUrl;
}

export function Accordion(props: any) {
  const isEditMode = !!props.puck?.isEditing;

  // 合并默认值
  const mergedBannerType = props.bannerType ?? DEFAULT_ACCORDION.bannerType;
  const mergedBackgroundColor = props.backgroundColor ?? DEFAULT_ACCORDION.backgroundColor;
  const mergedRowGroup = { ...DEFAULT_ACCORDION.rowGroup, ...props.rowGroup };
  const mergedContentGroup = { ...DEFAULT_ACCORDION.contentGroup, ...props.contentGroup };
  const mergedPaddingGroup = { ...DEFAULT_ACCORDION.paddingGroup, ...props.paddingGroup };
  const mergedSpacingGroup = { ...DEFAULT_ACCORDION.spacingGroup, ...props.spacingGroup };
  const mergedItems = props.items ?? DEFAULT_ACCORDION.items;

  const mobileScaleFactor = DEFAULT_ACCORDION.spacingGroup.mobileScaleFactor;

  const {
    rowTitleColor,
    rowTitleFontSize,
    rowTitleAlign,
    rowHeaderBgColor,
    itemsPerRow,
    itemsGap,
  } = mergedRowGroup;

  const {
    contentTitleFontSize,
    contentTitleAlign,
    contentTextFontSize,
    contentTextAlign,
  } = mergedContentGroup;

  const {
    paddingTop,
    paddingBottom,
  } = mergedPaddingGroup;

  // 手风琴展开状态（编辑模式下默认展开第一个项目）
  const [expandedIndex, setExpandedIndex] = useState<number | null>(() => {
    if (isEditMode && mergedItems.length > 0) {
      return 0;
    }
    return null;
  });

  // 用于检测 items 变化的 ref（编辑联动）
  const prevItemsRef = useRef<any[]>(mergedItems);

  // Alt 自动生成
  const __runtime = props.__runtime || {};
  const seoTitle = __runtime.seoTitle || '';
  const locale = __runtime.locale || 'zh';
  const suffix = getAltSuffix('Accordion', locale);

  // 编辑联动：检测 items 变化，自动展开被编辑的项目
  useEffect(() => {
    if (!isEditMode || mergedItems.length === 0) return;

    const prev = prevItemsRef.current;
    let changedIndex = -1;
    for (let i = 0; i < Math.min(prev.length, mergedItems.length); i++) {
      if (JSON.stringify(prev[i]) !== JSON.stringify(mergedItems[i])) {
        changedIndex = i;
        break;
      }
    }
    if (changedIndex === -1 && prev.length !== mergedItems.length) {
      changedIndex = 0;
    }

    if (changedIndex !== -1) {
      setExpandedIndex(changedIndex);
    }

    prevItemsRef.current = mergedItems;
  }, [isEditMode, mergedItems]);

  // 当 items 长度变化但展开索引超出范围时，重置为 0
  useEffect(() => {
    if (isEditMode && mergedItems.length > 0) {
      if (expandedIndex === null || expandedIndex >= mergedItems.length) {
        setExpandedIndex(0);
      }
    }
  }, [isEditMode, mergedItems.length, expandedIndex]);

  const toggleItem = (index: number) => {
    setExpandedIndex(prev => (prev === index ? null : index));
  };

  // 通栏统一实现
  const isFullwidth = mergedBannerType === 'fullwidth';
  const outerStyle: React.CSSProperties = {
    backgroundColor: mergedBackgroundColor,
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
    ...(mergedBannerType === 'standard' ? { marginTop: '10px', marginBottom: '10px' } : {}),
  };
  const outerClasses = 'relative overflow-hidden';

  const contentStyle: React.CSSProperties = {
    paddingTop: `${paddingTop}px`,
    paddingBottom: `${paddingBottom}px`,
    maxWidth: '80rem',
    margin: '0 auto',
    width: '100%',
    paddingLeft: 'clamp(1rem, 2vw, 2rem)',
    paddingRight: 'clamp(1rem, 2vw, 2rem)',
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${itemsPerRow}, minmax(0, 1fr))`,
    gap: `${itemsGap}px`,
  };

  // 响应式字体
  const rowTitleClamp = `clamp(${rowTitleFontSize * mobileScaleFactor}px, 2vw, ${rowTitleFontSize}px)`;
  const contentTitleClamp = `clamp(${contentTitleFontSize * mobileScaleFactor}px, 1.5vw, ${contentTitleFontSize}px)`;
  const contentTextClamp = `clamp(${contentTextFontSize * mobileScaleFactor}px, 1.2vw, ${contentTextFontSize}px)`;

  if (isEditMode && mergedItems.length === 0) {
    return (
      <div ref={props.puck?.dragRef} className={outerClasses} style={outerStyle}>
        <div className="border-2 border-dashed border-gray-300 p-8 text-center text-gray-400">
          〖手风琴组件 - 请添加手风琴项目〗
        </div>
      </div>
    );
  }

  return (
    <div ref={props.puck?.dragRef} className={outerClasses} style={outerStyle}>
      <div className="relative w-full">
        <div style={contentStyle}>
          <div className="space-y-4">
            {mergedItems.map((item: any, idx: number) => {
              const titleText = item.title || `Accordion Title ${idx + 1}`;
              const contents = item.contents || [];
              const isExpanded = expandedIndex === idx;

              return (
                // ✅ 使用 id + 索引作为唯一 key
                <div key={item.id ? `${item.id}-${idx}` : idx} className="border rounded-lg overflow-hidden">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer transition hover:opacity-80"
                    style={{ backgroundColor: rowHeaderBgColor }}
                    onClick={() => toggleItem(idx)}
                  >
                    <div
                      className="font-medium"
                      style={{
                        fontSize: rowTitleClamp,
                        color: rowTitleColor,
                        textAlign: rowTitleAlign,
                        display: 'block',
                        width: '100%',
                      }}
                    >
                      {titleText}
                    </div>
                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </div>

                  {isExpanded && (
                    <div className="p-6">
                      {contents.length === 0 ? (
                        <div className="text-center text-gray-400 py-8">
                          暂无内容项，请在右侧属性面板中添加内容项
                        </div>
                      ) : (
                        <div style={gridStyle}>
                          {contents.map((content: any, cidx: number) => {
                            const contentTitle = content.title || '';
                            const paragraph = content.paragraph || '';
                            const imageUrl = content.imageUrl || '';
                            const link = content.link || '';
                            const displayImageUrl = getDisplayImageUrl(imageUrl, isEditMode);
                            const alt = seoTitle ? `${seoTitle} - ${suffix} ${idx + 1}-${cidx + 1}` : `${suffix} ${idx + 1}-${cidx + 1}`;

                            const WrapperTag = link ? 'a' : 'div';
                            const wrapperProps = link
                              ? { href: link, target: '_blank', rel: 'noopener noreferrer', className: 'block group' }
                              : { className: 'block' };

                            return (
                              // ✅ 使用 id + 索引作为唯一 key
                              <WrapperTag key={content.id ? `${content.id}-${cidx}` : cidx} {...wrapperProps}>
                                <div className="flex flex-col items-center text-center">
                                  {imageUrl && (
                                    <div className="mb-4 overflow-hidden rounded-lg w-full">
                                      <div className="relative w-full" style={{ aspectRatio: '16 / 9' }}>
                                        {displayImageUrl ? (
                                          <img
                                            src={displayImageUrl}
                                            alt={alt}
                                            className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
                                            loading="lazy"
                                          />
                                        ) : (
                                          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400">
                                            图片加载失败
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  {contentTitle && (
                                    <h3
                                      className="font-semibold mb-2"
                                      style={{
                                        fontSize: contentTitleClamp,
                                        textAlign: contentTitleAlign,
                                        display: 'block',
                                        width: '100%',
                                      }}
                                    >
                                      {contentTitle}
                                    </h3>
                                  )}
                                  {paragraph && (
                                    <p
                                      style={{
                                        fontSize: contentTextClamp,
                                        textAlign: contentTextAlign,
                                        color: '#666',
                                      }}
                                    >
                                      {paragraph}
                                    </p>
                                  )}
                                </div>
                              </WrapperTag>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}