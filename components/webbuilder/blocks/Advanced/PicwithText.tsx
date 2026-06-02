'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';

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

export function PicwithText(props: any) {
  const isEditMode = !!props.puck?.isEditing;
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
    if (props.__runtime?.texts && field.textId && props.__runtime.texts[field.textId])
      return props.__runtime.texts[field.textId];
    if (field[displayLocale]) return field[displayLocale];
    if (field.en) return field.en;
    if (field.zh) return field.zh;
    return '';
  };

  const titleText = getText(props.title);
  const descText = getText(props.text);
  const btnText = getText(props.buttonText);

  const outerClasses = `relative overflow-hidden ${
    props.bannerType === 'fullwidth'
      ? 'w-screen left-1/2 right-1/2 -ml-[50vw] mr-[50vw]'
      : 'max-w-7xl mx-auto'
  }`;
  const outerMargin = props.bannerType === 'standard' ? { marginTop: '10px', marginBottom: '10px' } : {};

  const outerStyle: React.CSSProperties = {
    backgroundColor: props.backgroundColor,
    ...outerMargin,
  };

  const contentStyle: React.CSSProperties = {
    paddingTop: `${props.paddingTop ?? 0}px`,
    paddingBottom: `${props.paddingBottom ?? 0}px`,
  };

  const imageHeight = HEIGHT_MAP[props.imageHeight] || 'auto';
  const imageWidthClass = WIDTH_MAP[props.imageWidth] || 'w-1/2';
  const animationClass = ANIMATION_CLASS[props.animation] || '';

  const textAreaStyle: React.CSSProperties = {
    backgroundColor: props.textAreaBackgroundColor || 'transparent',
    borderRadius: '0.5rem',
    padding: '1.5rem',
  };

  const getAlignItems = () => {
    switch (props.contentVertical) {
      case 'top': return 'flex-start';
      case 'bottom': return 'flex-end';
      default: return 'center';
    }
  };

  const buttonStyle: React.CSSProperties = {
    fontSize: `${props.buttonFontSize ?? 16}px`,
    backgroundColor: props.buttonColor || '#000000',
    color: '#ffffff',
    padding: '0.5rem 1rem',
    borderRadius: '0.375rem',
    display: 'inline-block',
    textDecoration: 'none',
    transition: 'opacity 0.2s',
  };

  const imageFirst = props.imagePosition === 'left';

  if (isEditMode && !props.imageUrl) {
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
          <div className="max-w-7xl mx-auto w-full">
            <div
              className={`flex flex-col md:flex-row gap-8 items-${getAlignItems()}`}
              style={{ flexDirection: imageFirst ? 'row' : 'row-reverse' }}
            >
              {/* 图片区域 */}
              <div className={`${imageWidthClass} flex-shrink-0`}>
                <div className={`relative overflow-hidden rounded-lg ${animationClass}`} style={{ height: imageHeight }}>
                  {props.imageUrl ? (
                    <img
                      src={props.imageUrl}
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
              <div className={`flex-1 text-${props.textAlign}`}>
                <div style={textAreaStyle}>
                  {titleText && (
                    <div
                      className="mb-2"
                      style={{ fontSize: `${props.titleFontSize ?? 32}px`, color: props.titleColor ?? '#000000' }}
                    >
                      {titleText}
                    </div>
                  )}
                  {descText && (
                    <div
                      className="mb-4"
                      style={{ fontSize: `${props.textFontSize ?? 16}px`, color: props.textColor ?? '#000000' }}
                    >
                      {descText}
                    </div>
                  )}
                  {btnText && props.buttonLink && (
                    <a href={props.buttonLink} style={buttonStyle} target="_blank" rel="noopener noreferrer">
                      {btnText}
                    </a>
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