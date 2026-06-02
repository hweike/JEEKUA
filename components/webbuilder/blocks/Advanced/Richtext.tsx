'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';

export function Richtext({
  bannerType,
  title,
  titleFontSize,
  titleColor,
  text,
  textFontSize,
  textColor,
  button1Text,
  button1Color,
  button1Link,
  button2Text,
  button2Color,
  button2Link,
  contentPosition,
  textAlign,
  containerPaddingTop,
  containerPaddingBottom,
  backgroundColor,
  puck,
  __runtime,
}: any) {
  const isEditMode = !!puck?.isEditing;
  const pageLocale = useLocale();

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

  const outerClasses = `relative overflow-hidden ${
    bannerType === 'fullwidth'
      ? 'w-screen left-1/2 right-1/2 -ml-[50vw] mr-[50vw]'
      : 'max-w-7xl mx-auto'
  }`;
  const outerMargin = bannerType === 'standard' ? { marginTop: '10px', marginBottom: '10px' } : {};

  const outerStyle: React.CSSProperties = {
    backgroundColor,
    ...outerMargin,
  };

  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 750);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const contentStyle: React.CSSProperties = {
    textAlign,
    paddingTop: `${containerPaddingTop}px`,
    paddingBottom: `${containerPaddingBottom}px`,
    paddingLeft: isDesktop ? '56px' : '24px',
    paddingRight: isDesktop ? '56px' : '24px',
  };

  const getButtonGroupJustify = () => {
    if (textAlign === 'center') return 'center';
    if (textAlign === 'right') return 'flex-end';
    return 'flex-start';
  };

  const getContentMargin = () => {
    switch (contentPosition) {
      case 'left':
        return { marginLeft: '0', marginRight: '250px' };
      case 'center':
        return { marginLeft: '125px', marginRight: '125px' };
      case 'right':
        return { marginLeft: '250px', marginRight: '0' };
      default:
        return { marginLeft: '125px', marginRight: '125px' };
    }
  };

  if (isEditMode && !titleText && !descText && !btn1Text && !btn2Text) {
    return (
      <div ref={puck?.dragRef} className={outerClasses} style={outerStyle}>
        <div className="border-2 border-dashed border-gray-300 p-8 text-center text-gray-400">
          〖富文本横幅 - 请添加内容〗
        </div>
      </div>
    );
  }

  const renderContent = () => (
    <div style={contentStyle}>
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

  // 全屏通栏：内部限制页头宽度
  if (bannerType === 'fullwidth') {
    return (
      <div ref={puck?.dragRef} className={outerClasses} style={outerStyle}>
        <div className="relative w-full">
          <div className="max-w-7xl mx-auto w-full">
            <div
              className="flex"
              style={{
                alignItems: 'center',
                minHeight: '200px',
                width: '100%',
              }}
            >
              <div style={getContentMargin()}>{renderContent()}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 标准通栏
  return (
    <div ref={puck?.dragRef} className={outerClasses} style={outerStyle}>
      <div className="relative w-full">
        <div
          className="flex"
          style={{
            alignItems: 'center',
            minHeight: '200px',
            width: '100%',
          }}
        >
          <div style={getContentMargin()}>{renderContent()}</div>
        </div>
      </div>
    </div>
  );
}