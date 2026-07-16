'use client';

import { useState, useEffect } from 'react';
import { getImageUrl } from '@/lib/files/url';
import { DEFAULT_IMAGE_BANNER } from '@/lib/webbuilder/defaults/ImageBanner';
import { getAltSuffix } from '@/lib/webbuilder/alt-suffix-config';

function getString(field: any): string {
  if (typeof field === 'string') return field;
  if (field && typeof field === 'object') {
    return field.zh || field.en || '';
  }
  return '';
}

const HEIGHT_MAP: Record<string, string> = {
  small: 'clamp(300px, 40vh, 400px)',
  medium: 'clamp(400px, 60vh, 650px)',
  large: 'clamp(500px, 80vh, 1080px)',
  auto: 'auto',
};

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

export function ImageBanner({
  bannerType,
  imageSettings,
  contentSettings,
  puck,
  __runtime,
}: any) {
  const isEditMode = !!puck?.isEditing;

  const image1Url = imageSettings?.image1Url || '';
  const image2Url = imageSettings?.image2Url || '';
  const overlayOpacity = imageSettings?.overlayOpacity ?? 0;
  const heightPreset = imageSettings?.heightPreset ?? 'auto';
  const animation = imageSettings?.animation ?? 'none';

  const cs = contentSettings || {};

  // 读取 mobileScaleFactor（默认 0.7）
  const mobileScaleFactor = DEFAULT_IMAGE_BANNER.mobileScaleFactor ?? 0.7;

  const {
    title = DEFAULT_IMAGE_BANNER.contentSettings.title,
    titleFontSize = DEFAULT_IMAGE_BANNER.contentSettings.titleFontSize,
    titleColor = DEFAULT_IMAGE_BANNER.contentSettings.titleColor,
    text = DEFAULT_IMAGE_BANNER.contentSettings.text,
    textFontSize = DEFAULT_IMAGE_BANNER.contentSettings.textFontSize,
    textColor = DEFAULT_IMAGE_BANNER.contentSettings.textColor,
    button1Text = DEFAULT_IMAGE_BANNER.contentSettings.button1Text,
    button1Color = DEFAULT_IMAGE_BANNER.contentSettings.button1Color,
    button1Link = DEFAULT_IMAGE_BANNER.contentSettings.button1Link,
    button2Text = DEFAULT_IMAGE_BANNER.contentSettings.button2Text,
    button2Color = DEFAULT_IMAGE_BANNER.contentSettings.button2Color,
    button2Link = DEFAULT_IMAGE_BANNER.contentSettings.button2Link,
    contentPosition = DEFAULT_IMAGE_BANNER.contentSettings.contentPosition,
    textAlign = DEFAULT_IMAGE_BANNER.contentSettings.textAlign,
    containerEnabled = DEFAULT_IMAGE_BANNER.contentSettings.containerEnabled,
    containerBgColor = DEFAULT_IMAGE_BANNER.contentSettings.containerBgColor,
    containerOpacity = DEFAULT_IMAGE_BANNER.contentSettings.containerOpacity,
    containerBorderRadius = DEFAULT_IMAGE_BANNER.contentSettings.containerBorderRadius,
    containerPadding = DEFAULT_IMAGE_BANNER.contentSettings.containerPadding,
    buttonPaddingX = DEFAULT_IMAGE_BANNER.contentSettings.buttonPaddingX,
    buttonPaddingY = DEFAULT_IMAGE_BANNER.contentSettings.buttonPaddingY,
    buttonBorderRadius = DEFAULT_IMAGE_BANNER.contentSettings.buttonBorderRadius,
  } = cs;

  // 旧数据兼容
  const finalTitle = getString(title);
  const finalText = getString(text);
  const finalButton1Text = getString(button1Text);
  const finalButton2Text = getString(button2Text);

  // ===== 工具函数 =====
  const getContainerBgWithOpacity = () => {
    if (!containerEnabled) return 'transparent';
    const opacity = containerOpacity / 100;
    let color = containerBgColor || '#000000';
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      let r, g, b;
      if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
      } else if (hex.length === 6) {
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
      } else {
        return color;
      }
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    if (color.startsWith('rgb')) {
      const match = color.match(/[\d.]+/g);
      if (match && match.length >= 3) {
        const r = parseInt(match[0]);
        const g = parseInt(match[1]);
        const b = parseInt(match[2]);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
      }
      return color;
    }
    return color;
  };

  const getDisplayImageUrl = (url: string) => {
    if (!url) return '';
    const fullUrl = getImageUrl(url);
    if (!isEditMode && fullUrl && !fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
      return baseUrl + (fullUrl.startsWith('/') ? '' : '/') + fullUrl;
    }
    return isEditMode ? `/api/proxy-image?url=${encodeURIComponent(fullUrl)}` : fullUrl;
  };

  const img1Url = getDisplayImageUrl(image1Url);
  const img2Url = getDisplayImageUrl(image2Url);

  const hasImage1 = !!image1Url;
  const hasImage2 = !!image2Url;
  const hasTwoImages = hasImage1 && hasImage2;

  // ===== Alt 自动生成 =====
  const seoTitle = __runtime?.seoTitle || '';
  const locale = __runtime?.locale || 'zh';
  const suffix = getAltSuffix('ImageBanner', locale);
  const alt1 = hasImage1 ? (seoTitle ? `${seoTitle} - ${suffix} 1` : `${suffix} 1`) : '';
  const alt2 = hasImage2 ? (seoTitle ? `${seoTitle} - ${suffix} 2` : `${suffix} 2`) : '';

  const primaryImageUrl = img1Url || img2Url;
  const [dynamicHeight, setDynamicHeight] = useState<number | null>(null);

  useEffect(() => {
    if (heightPreset !== 'auto' || !primaryImageUrl) {
      setDynamicHeight(null);
      return;
    }
    const img = new Image();
    img.onload = () => setDynamicHeight(img.height);
    img.onerror = () => setDynamicHeight(null);
    img.src = primaryImageUrl;
  }, [heightPreset, primaryImageUrl]);

  const getHeightStyle = (): React.CSSProperties => {
    if (heightPreset === 'auto') {
      if (dynamicHeight) {
        return { minHeight: `${dynamicHeight}px` };
      }
      return { minHeight: '300px' };
    }
    const val = HEIGHT_MAP[heightPreset] || '56rem';
    return { minHeight: val };
  };
  const heightStyle = getHeightStyle();

  const containerClasses = `relative overflow-hidden ${
    bannerType === 'fullwidth'
      ? 'w-screen left-1/2 right-1/2 -ml-[50vw] mr-[50vw]'
      : 'max-w-7xl mx-auto'
  }`;
  const containerMargin = bannerType === 'standard' ? { marginTop: '0px', marginBottom: '0px' } : {};

  // 响应式断点检测
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handleChange = () => setIsMobile(mq.matches);
    handleChange();
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 769px)');
    const handleChange = () => setIsDesktop(mq.matches);
    handleChange();
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  const getBoxPadding = () => {
    if (containerPadding !== undefined && containerPadding !== null && containerEnabled) {
      return `${containerPadding}px`;
    }
    if (containerEnabled) {
      return isDesktop ? 'clamp(2rem, 4vw, 4rem) clamp(1.5rem, 3vw, 3.5rem)' : '2rem 1.5rem';
    }
    return 0;
  };

  const boxStyle: React.CSSProperties = {
    backgroundColor: getContainerBgWithOpacity(),
    borderRadius: `${containerBorderRadius}px`,
    textAlign,
    maxWidth: '100%',
    pointerEvents: 'auto',
    padding: getBoxPadding(),
  };

  const getButtonGroupJustify = () => {
    if (textAlign === 'center') return 'center';
    if (textAlign === 'right') return 'flex-end';
    return 'flex-start';
  };

  const isFullwidth = bannerType === 'fullwidth';
  const position = POSITION_MAP[contentPosition] || POSITION_MAP['center-center'];

  if ((!hasImage1 && !hasImage2) && isEditMode) {
    return (
      <div ref={puck?.dragRef} className="border-2 border-dashed border-gray-300 p-8 text-center text-gray-400" style={containerMargin}>
        〖图片横幅 - 请选择图片〗
      </div>
    );
  }

  // 自适应字体（引入 mobileScaleFactor）
  const titleSizeStyle = {
    fontSize: `clamp(${titleFontSize * mobileScaleFactor}px, 4.5vw, ${titleFontSize}px)`,
  };
  const textSizeStyle = {
    fontSize: `clamp(${textFontSize * mobileScaleFactor}px, 2.2vw, ${textFontSize}px)`,
  };

  // 按钮尺寸响应式（也应用 mobileScaleFactor）
  const buttonPaddingXFinal = isMobile ? Math.min(buttonPaddingX, 16) : buttonPaddingX;
  const buttonPaddingYFinal = isMobile ? Math.min(buttonPaddingY, 8) : buttonPaddingY;
  const buttonBorderRadiusFinal = isMobile ? Math.min(buttonBorderRadius, 4) : buttonBorderRadius;
  // 按钮字体自适应（使用 clamp，最小值基于 mobileScaleFactor）
  const buttonFontSizeClamp = `clamp(${16 * mobileScaleFactor}px, 1.2vw, 16px)`;

  const renderContent = () => (
    <div style={boxStyle}>
      {finalTitle && (
        <div className="mb-4" style={{ ...titleSizeStyle, color: titleColor }}>
          {finalTitle}
        </div>
      )}
      {finalText && (
        <div className="mb-6" style={{ ...textSizeStyle, color: textColor }}>
          {finalText}
        </div>
      )}
      <div className="flex flex-wrap gap-4" style={{ justifyContent: getButtonGroupJustify() }}>
        {finalButton1Text &&
          (button1Link ? (
            <a
              href={button1Link}
              style={{
                backgroundColor: button1Color,
                color: '#fff',
                padding: `${buttonPaddingYFinal}px ${buttonPaddingXFinal}px`,
                borderRadius: `${buttonBorderRadiusFinal}px`,
                display: 'inline-block',
                transition: 'opacity 0.2s',
                textDecoration: 'none',
                cursor: 'pointer',
                fontSize: buttonFontSizeClamp,
              }}
              target="_blank"
              rel="noopener noreferrer"
            >
              {finalButton1Text}
            </a>
          ) : (
            <span
              style={{
                backgroundColor: button1Color,
                color: '#fff',
                padding: `${buttonPaddingYFinal}px ${buttonPaddingXFinal}px`,
                borderRadius: `${buttonBorderRadiusFinal}px`,
                display: 'inline-block',
                opacity: 0.6,
                cursor: 'default',
                fontSize: buttonFontSizeClamp,
              }}
            >
              {finalButton1Text}
            </span>
          ))}
        {finalButton2Text &&
          (button2Link ? (
            <a
              href={button2Link}
              style={{
                backgroundColor: button2Color,
                color: '#fff',
                padding: `${buttonPaddingYFinal}px ${buttonPaddingXFinal}px`,
                borderRadius: `${buttonBorderRadiusFinal}px`,
                display: 'inline-block',
                transition: 'opacity 0.2s',
                textDecoration: 'none',
                cursor: 'pointer',
                fontSize: buttonFontSizeClamp,
              }}
              target="_blank"
              rel="noopener noreferrer"
            >
              {finalButton2Text}
            </a>
          ) : (
            <span
              style={{
                backgroundColor: button2Color,
                color: '#fff',
                padding: `${buttonPaddingYFinal}px ${buttonPaddingXFinal}px`,
                borderRadius: `${buttonBorderRadiusFinal}px`,
                display: 'inline-block',
                opacity: 0.6,
                cursor: 'default',
                fontSize: buttonFontSizeClamp,
              }}
            >
              {finalButton2Text}
            </span>
          ))}
      </div>
    </div>
  );

  // 双图时：网格两列（桌面）或单列（移动端）
  const gridTemplateColumns = hasTwoImages ? (isDesktop ? '1fr 1fr' : '1fr') : '1fr';

  // 构建图片元素（复用）
  const renderImage = (src: string, alt: string, minHeight: string) => (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        minHeight,
        width: '100%',
        height: '100%',
      }}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'black',
          opacity: overlayOpacity / 100,
          pointerEvents: 'none',
        }}
      />
    </div>
  );

  return (
    <div ref={puck?.dragRef} className={containerClasses} style={containerMargin}>
      <div className="relative w-full" style={heightStyle}>
        <div
          className="grid"
          style={{
            gridTemplateColumns,
            gridTemplateRows: '1fr',
            width: '100%',
            height: '100%',
            minHeight: 'inherit',
          }}
        >
          {hasTwoImages ? (
            <>
              {/* 图1 */}
              <div
                style={{
                  gridColumn: isDesktop ? '1 / 2' : '1 / -1',
                  gridRow: '1 / 2',
                  position: 'relative',
                }}
              >
                {renderImage(img1Url, alt1, 'clamp(200px, 40vh, 400px)')}
              </div>
              {/* 图2 */}
              <div
                style={{
                  gridColumn: isDesktop ? '2 / 3' : '1 / -1',
                  gridRow: isDesktop ? '1 / 2' : '2 / 3',
                  position: 'relative',
                }}
              >
                {renderImage(img2Url, alt2, 'clamp(200px, 40vh, 400px)')}
              </div>
            </>
          ) : (
            /* 单图（全宽） */
            <div
              style={{
                gridColumn: '1 / -1',
                gridRow: '1 / 2',
                position: 'relative',
              }}
            >
              {renderImage(img1Url || img2Url, alt1, 'auto')}
            </div>
          )}

          {/* 内容层 */}
          <div
            style={{
              gridColumn: '1 / -1',
              gridRow: '1 / 2',
              justifySelf: position.justifySelf,
              alignSelf: position.alignSelf,
              display: 'inline-block',
              maxWidth: '100%',
              pointerEvents: 'none',
              margin: 'clamp(1rem, 4vw, 3rem)',
              position: 'relative',
              zIndex: 10,
            }}
          >
            {isFullwidth ? <div className="max-w-7xl mx-auto w-full">{renderContent()}</div> : renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}