'use client';

import { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { getImageUrl } from '@/lib/files/url';
import { DEFAULT_MULTIROW } from '@/lib/webbuilder/defaults/Multirow';
import { getAltSuffix } from '@/lib/webbuilder/alt-suffix-config';

function getDisplayImageUrl(url: string, isEditMode: boolean): string {
  if (!url) return '';
  const fullUrl = getImageUrl(url);
  if (isEditMode) {
    return `/api/proxy-image?url=${encodeURIComponent(fullUrl)}`;
  }
  return fullUrl;
}

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

  // 从嵌套分组中合并默认值
  const bannerGroup = { ...DEFAULT_MULTIROW.bannerGroup, ...props.bannerGroup };
  const imageGroup = { ...DEFAULT_MULTIROW.imageGroup, ...props.imageGroup };
  const contentGroup = { ...DEFAULT_MULTIROW.contentGroup, ...props.contentGroup };
  const paddingGroup = { ...DEFAULT_MULTIROW.paddingGroup, ...props.paddingGroup };
  const spacingGroup = { ...DEFAULT_MULTIROW.spacingGroup, ...props.spacingGroup };
  const mergedItems = props.items ?? DEFAULT_MULTIROW.items;

  const mobileScaleFactor = spacingGroup.mobileScaleFactor ?? 0.7;

  // Alt 自动生成
  const __runtime = props.__runtime || {};
  const seoTitle = __runtime.seoTitle || '';
  const locale = __runtime.locale || 'zh';
  const suffix = getAltSuffix('Multirow', locale);

  // 移动端检测
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const currentTextAlign = isMobile ? contentGroup.mobileTextAlign : contentGroup.textAlign;

  // 获取图片放置位置
  const getImagePosition = (index: number) => {
    const placement = imageGroup.imagePlacement;
    if (placement === 'alternate-left') {
      return index % 2 === 0 ? 'left' : 'right';
    }
    if (placement === 'alternate-right') {
      return index % 2 === 0 ? 'right' : 'left';
    }
    return placement;
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
  const titleClamp = `clamp(${contentGroup.columnTitleFontSize * mobileScaleFactor}px, 2.5vw, ${contentGroup.columnTitleFontSize}px)`;
  const descClamp = `clamp(${contentGroup.columnDescFontSize * mobileScaleFactor}px, 1.2vw, ${contentGroup.columnDescFontSize}px)`;

  const imageHeightClass = HEIGHT_MAP[imageGroup.imageHeight] || 'h-auto';
  const imageWidthClass = WIDTH_MAP[imageGroup.imageWidth] || 'w-full md:w-1/2';

  const textAreaStyle: React.CSSProperties = {
    backgroundColor: contentGroup.columnBgColor,
    borderRadius: '0.5rem',
    padding: '1.5rem',
    textAlign: currentTextAlign as any,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: titleClamp,
    color: contentGroup.columnTitleColor,
    fontWeight: 'bold',
    marginBottom: '0.5rem',
  };

  const descStyle: React.CSSProperties = {
    fontSize: descClamp,
    color: contentGroup.columnDescColor,
    marginBottom: '1rem',
  };

  const linkStyle: React.CSSProperties = {
    color: contentGroup.columnDescColor,
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  };

  const verticalAlignClass =
    contentGroup.contentVertical === 'top'
      ? 'items-start'
      : contentGroup.contentVertical === 'bottom'
        ? 'items-end'
        : 'items-center';

  if (isEditMode && mergedItems.length === 0) {
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
          <div className="w-full">
            <div className="space-y-8">
              {mergedItems.map((item: any, idx: number) => {
                const alt = seoTitle ? `${seoTitle} - ${suffix} ${idx + 1}` : `${suffix} ${idx + 1}`;
                const displayImageUrl = getDisplayImageUrl(item.imageUrl, isEditMode);
                const imgPosition = getImagePosition(idx);
                const flexDirection = imgPosition === 'left' ? 'md:flex-row' : 'md:flex-row-reverse';

                return (
                  <div
                    key={idx}
                    className={`flex flex-col ${flexDirection} gap-6 ${verticalAlignClass}`}
                  >
                    <div className={`${imageWidthClass} flex-shrink-0`}>
                      <div className={`${imageHeightClass} overflow-hidden rounded-lg`}>
                        {item.imageUrl ? (
                          <img
                            src={displayImageUrl}
                            alt={alt}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
                            暂无图片
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div style={textAreaStyle}>
                        {item.title && <div style={titleStyle}>{item.title}</div>}
                        {item.description && <div style={descStyle}>{item.description}</div>}
                        {item.linkLabel && item.linkUrl && (
                          <a
                            href={item.linkUrl}
                            style={linkStyle}
                            className="hover:opacity-70 transition"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {item.linkLabel}
                            <ChevronRight size={14} />
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