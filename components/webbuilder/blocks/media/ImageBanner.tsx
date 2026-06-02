'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';

const HEIGHT_MAP: Record<string, string> = {
  small: '42rem',
  medium: '56rem',
  large: '72rem',
  auto: 'auto',
};

// 位置映射到 CSS Grid 的 justify-self 和 align-self
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
  const pageLocale = useLocale();

  // 编辑器内语言同步
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
      if (e.key === 'webbuilder_edit_locale') {
        const newLocale = e.newValue;
        if (newLocale && (newLocale === 'zh' || newLocale === 'en')) setEditLocale(newLocale);
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

  // 提取配置
  const image1Url = imageSettings?.image1Url || '';
  const image2Url = imageSettings?.image2Url || '';
  const overlayOpacity = imageSettings?.overlayOpacity ?? 0;
  const heightPreset = imageSettings?.heightPreset ?? 'auto';
  const animation = imageSettings?.animation ?? 'none';

  const cs = contentSettings || {};
  const title = cs.title;
  const titleFontSize = cs.titleFontSize ?? 48;
  const titleColor = cs.titleColor ?? '#ffffff';
  const text = cs.text;
  const textFontSize = cs.textFontSize ?? 24;
  const textColor = cs.textColor ?? '#ffffff';
  const button1Text = cs.button1Text;
  const button1Color = cs.button1Color ?? '#000000';
  const button1Link = cs.button1Link ?? '';
  const button2Text = cs.button2Text;
  const button2Color = cs.button2Color ?? '#000000';
  const button2Link = cs.button2Link ?? '';
  const contentPosition = cs.contentPosition ?? 'center-center';
  const textAlign = cs.textAlign ?? 'center';
  const containerEnabled = cs.containerEnabled ?? false;
  const containerBgColor = cs.containerBgColor ?? 'rgba(0,0,0,0.6)';
  const containerBorderRadius = cs.containerBorderRadius ?? 16;
  const containerPadding = cs.containerPadding; // 可能为 undefined

  // 多语言获取
  const getText = (field: any) => {
    if (typeof field === 'string') return field;
    if (!field || typeof field !== 'object') return '';
    if (__runtime?.texts && field.textId && __runtime.texts[field.textId]) return __runtime.texts[field.textId];
    return field[displayLocale] || '';
  };

  const titleText = getText(title);
  const descText = getText(text);
  const btn1Text = getText(button1Text);
  const btn2Text = getText(button2Text);

  // 动态高度
  const [dynamicHeight, setDynamicHeight] = useState<number | null>(null);
  const primaryImageUrl = image1Url || image2Url;

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
    const remValue = HEIGHT_MAP[heightPreset] || '56rem';
    return { minHeight: remValue };
  };
  const heightStyle = getHeightStyle();

  // 外层容器样式
  const containerClasses = `relative overflow-hidden ${
    bannerType === 'fullwidth'
      ? 'w-screen left-1/2 right-1/2 -ml-[50vw] mr-[50vw]'
      : 'max-w-7xl mx-auto'
  }`;
  const containerMargin = bannerType === 'standard' ? { marginTop: '10px', marginBottom: '10px' } : {};

  const hasImage1 = image1Url;
  const hasImage2 = image2Url;

  // 背景图片层（作为 Grid 子项）
  const bgImageStyle: React.CSSProperties = {
    backgroundImage: `url(${hasImage1 || hasImage2})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: animation === 'fixed' ? 'fixed' : 'scroll',
    transition: animation === 'scale' ? 'transform 0.3s ease' : 'none',
    gridArea: '1 / 1 / 1 / 1', // 与内容重叠
  };

  // 遮罩层（同样重叠）
  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'black',
    opacity: overlayOpacity / 100,
    pointerEvents: 'none',
    gridArea: '1 / 1 / 1 / 1',
  };

  // 响应式检测
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 750);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 文字背景框样式
  // 如果用户定义了 containerPadding（数字，单位 px），则使用该值作为所有方向的内边距
  // 否则使用默认响应式内边距（桌面 64px 56px，移动 64px 24px）
  const getBoxPadding = () => {
    if (containerPadding !== undefined && containerPadding !== null && containerEnabled) {
      return `${containerPadding}px`;
    }
    if (containerEnabled) {
      return isDesktop ? '64px 56px' : '64px 24px';
    }
    return 0;
  };

  const boxStyle: React.CSSProperties = {
    backgroundColor: containerEnabled ? containerBgColor : 'transparent',
    borderRadius: `${containerBorderRadius}px`,
    textAlign,
    maxWidth: '100%',
    pointerEvents: 'auto',
    padding: getBoxPadding(),
  };

  // 按钮组对齐
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

  const renderContent = () => (
    <div style={boxStyle}>
      {titleText && (
        <div className="mb-4" style={{ fontSize: `${titleFontSize}px`, color: titleColor }}>
          {titleText}
        </div>
      )}
      {descText && (
        <div className="mb-6" style={{ fontSize: `${textFontSize}px`, color: textColor }}>
          {descText}
        </div>
      )}
      <div className="flex flex-wrap gap-4" style={{ justifyContent: getButtonGroupJustify() }}>
        {btn1Text &&
          (button1Link ? (
            <a
              href={button1Link}
              className="px-6 py-2 rounded-md inline-block transition hover:opacity-80"
              style={{ backgroundColor: button1Color, color: '#fff' }}
              target="_blank"
              rel="noopener noreferrer"
            >
              {btn1Text}
            </a>
          ) : (
            <span
              className="px-6 py-2 rounded-md inline-block bg-gray-400 text-white cursor-default"
              style={{ backgroundColor: button1Color, color: '#fff', opacity: 0.6 }}
            >
              {btn1Text}
            </span>
          ))}
        {btn2Text &&
          (button2Link ? (
            <a
              href={button2Link}
              className="px-6 py-2 rounded-md inline-block transition hover:opacity-80"
              style={{ backgroundColor: button2Color, color: '#fff' }}
              target="_blank"
              rel="noopener noreferrer"
            >
              {btn2Text}
            </a>
          ) : (
            <span
              className="px-6 py-2 rounded-md inline-block bg-gray-400 text-white cursor-default"
              style={{ backgroundColor: button2Color, color: '#fff', opacity: 0.6 }}
            >
              {btn2Text}
            </span>
          ))}
      </div>
    </div>
  );

  return (
    <div ref={puck?.dragRef} className={containerClasses} style={containerMargin}>
      <div className="relative w-full" style={heightStyle}>
        {/* 使用 Grid 布局，背景和内容重叠 */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: '1fr',
            gridTemplateRows: '1fr',
            width: '100%',
            height: '100%',
            minHeight: 'inherit',
          }}
        >
          {/* 背景图片 */}
          <div style={bgImageStyle} />
          {/* 遮罩层 */}
          <div style={overlayStyle} />

          {/* 内容层：通过 justify-self 和 align-self 定位，宽度由内容决定 */}
          <div
            style={{
              gridArea: '1 / 1 / 1 / 1',
              justifySelf: position.justifySelf,
              alignSelf: position.alignSelf,
              display: 'inline-block',
              maxWidth: '100%',
              pointerEvents: 'none',
              margin: '40px',   // 👈 添加这一行，可调整上下左右外边距
            }}
          >
            {isFullwidth ? <div className="max-w-7xl mx-auto w-full">{renderContent()}</div> : renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}