'use client';

import { useState, useEffect } from 'react';
import { getImageUrl } from '@/lib/files/url';
import { DEFAULT_PICWITH_TEXT } from '@/lib/webbuilder/defaults/PicwithText';
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
  small: '200px',
  medium: '300px',
  large: '400px',
  auto: 'auto',
};

const WIDTH_MAP: Record<string, string> = {
  small: 'w-1/3',
  medium: 'w-1/2',
  large: 'w-2/3',
};

const ANIMATION_CLASS: Record<string, string> = {
  none: '',
  ambient: 'transition-all duration-500 hover:scale-105',
  zoom: 'transition-transform duration-500 hover:scale-110',
};

const VERTICAL_ALIGN_MAP: Record<string, string> = {
  top: 'start',
  center: 'center',
  bottom: 'end',
};

export function PicwithText(props: any) {
  const isEditMode = !!props.puck?.isEditing;

  // 合并默认值
  const mergedBannerType = props.bannerType ?? DEFAULT_PICWITH_TEXT.bannerType;
  const mergedBackgroundColor = props.backgroundColor ?? DEFAULT_PICWITH_TEXT.backgroundColor;
  const mergedImageGroup = { ...DEFAULT_PICWITH_TEXT.imageGroup, ...props.imageGroup };
  const mergedTitleGroup = { ...DEFAULT_PICWITH_TEXT.titleGroup, ...props.titleGroup };
  const mergedTextGroup = { ...DEFAULT_PICWITH_TEXT.textGroup, ...props.textGroup };
  const mergedButtonGroup = { ...DEFAULT_PICWITH_TEXT.buttonGroup, ...props.buttonGroup };
  const mergedLayoutGroup = { ...DEFAULT_PICWITH_TEXT.layoutGroup, ...props.layoutGroup };
  const mergedPaddingGroup = { ...DEFAULT_PICWITH_TEXT.paddingGroup, ...props.paddingGroup };
  const mergedSpacingGroup = { ...DEFAULT_PICWITH_TEXT.spacingGroup, ...props.spacingGroup };

  const {
    imageUrl,
    imageHeight,
    imageWidth,
    imagePosition,
    animation,
  } = mergedImageGroup;

  const {
    title,
    titleFontSize,
    titleColor,
  } = mergedTitleGroup;

  const {
    text,
    textFontSize,
    textColor,
  } = mergedTextGroup;

  const {
    buttonText,
    buttonFontSize,
    buttonColor,
    buttonLink,
    buttonPaddingX,
    buttonPaddingY,
    buttonBorderRadius,
  } = mergedButtonGroup;

  const {
    contentVertical,
    textAlign,
    textAreaBackgroundColor,
  } = mergedLayoutGroup;

  const {
    paddingTop,
    paddingBottom,
  } = mergedPaddingGroup;

  const {
    mobileScaleFactor = 0.7,  // 默认 0.7
  } = mergedSpacingGroup;

  // Alt 自动生成
  const __runtime = props.__runtime || {};
  const seoTitle = __runtime.seoTitle || '';
  const locale = __runtime.locale || 'zh';
  const suffix = getAltSuffix('PicwithText', locale);
  const alt = seoTitle ? `${seoTitle} - ${suffix}` : suffix;

  const displayImageUrl = getDisplayImageUrl(imageUrl, isEditMode);

  const outerStyle: React.CSSProperties = {
    backgroundColor: mergedBackgroundColor,
    ...(mergedBannerType === 'fullwidth'
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
    paddingTop: `${paddingTop ?? 0}px`,
    paddingBottom: `${paddingBottom ?? 0}px`,
  };

  const imageHeightStyle = HEIGHT_MAP[imageHeight] || 'auto';
  const imageWidthClass = WIDTH_MAP[imageWidth] || 'w-1/2';
  const animationClass = ANIMATION_CLASS[animation] || '';

  const textAreaStyle: React.CSSProperties = {
    backgroundColor: textAreaBackgroundColor || 'transparent',
    borderRadius: '0.5rem',
    padding: 'clamp(1rem, 2vw, 1.5rem)',
  };

  const verticalAlignClass = VERTICAL_ALIGN_MAP[contentVertical] || 'center';

  const titleFontSizeClamp = `clamp(${titleFontSize * mobileScaleFactor}px, 4vw, ${titleFontSize}px)`;
  const textFontSizeClamp = `clamp(${textFontSize * mobileScaleFactor}px, 2.5vw, ${textFontSize}px)`;
  const buttonFontSizeClamp = `clamp(${buttonFontSize * mobileScaleFactor}px, 2vw, ${buttonFontSize}px)`;

  const buttonStyle: React.CSSProperties = {
    fontSize: buttonFontSizeClamp,
    backgroundColor: buttonColor || '#000000',
    color: '#ffffff',
    padding: `${buttonPaddingY ?? 8}px ${buttonPaddingX ?? 16}px`,
    borderRadius: `${buttonBorderRadius ?? 6}px`,
    display: 'inline-block',
    textDecoration: 'none',
    transition: 'opacity 0.2s',
    cursor: 'pointer',
  };

  const imageFirst = imagePosition === 'left';

  if (isEditMode && !imageUrl) {
    return (
      <div ref={props.puck?.dragRef} className={outerClasses} style={outerStyle}>
        <div className="border-2 border-dashed border-gray-300 p-8 text-center text-gray-400">
          〖图文并排组件 - 请添加图片〗
        </div>
      </div>
    );
  }

  return (
    <div ref={props.puck?.dragRef} className={outerClasses} style={outerStyle}>
      <div className="relative w-full">
        <div style={contentStyle}>
          <div
            style={{
              maxWidth: '80rem',
              margin: '0 auto',
              width: '100%',
              paddingLeft: 'clamp(1rem, 2vw, 2rem)',
              paddingRight: 'clamp(1rem, 2vw, 2rem)',
            }}
          >
            <div
              className={`flex flex-col md:flex-row gap-8 items-${verticalAlignClass} ${
                imageFirst ? '' : 'md:flex-row-reverse'
              }`}
            >
              <div className={`w-full md:${imageWidthClass} flex-shrink-0`}>
                <div className={`relative overflow-hidden rounded-lg ${animationClass}`} style={{ height: imageHeightStyle }}>
                  {displayImageUrl ? (
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

              <div className={`flex-1 text-${textAlign}`}>
                <div style={textAreaStyle}>
                  {title && (
                    <div
                      className="mb-2"
                      style={{
                        fontSize: titleFontSizeClamp,
                        color: titleColor ?? '#000000',
                      }}
                    >
                      {title}
                    </div>
                  )}
                  {text && (
                    <div
                      className="mb-4"
                      style={{
                        fontSize: textFontSizeClamp,
                        color: textColor ?? '#000000',
                      }}
                    >
                      {text}
                    </div>
                  )}
                  {buttonText && (
                    buttonLink ? (
                      <a href={buttonLink} style={buttonStyle} target="_blank" rel="noopener noreferrer">
                        {buttonText}
                      </a>
                    ) : (
                      <span style={{ ...buttonStyle, opacity: 0.6, cursor: 'default' }}>
                        {buttonText}
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}