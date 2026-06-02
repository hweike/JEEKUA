'use client';

import React, { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';

export function Button({
  text,
  buttonColor,
  textColor,
  fontSize,
  bold,
  italic,
  underline,
  textAlign,
  buttonAlign,
  link,
  borderRadius,
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
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'webbuilder_edit_locale') {
        const newLocale = e.newValue;
        if (newLocale && (newLocale === 'zh' || newLocale === 'en')) setEditLocale(newLocale);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [isEditMode]);

  useEffect(() => {
    if (!isEditMode) return;
    const stored = localStorage.getItem('webbuilder_edit_locale');
    if (!stored) setEditLocale(pageLocale);
  }, [isEditMode, pageLocale]);

  const displayLocale = isEditMode ? editLocale : pageLocale;

  const getDisplayText = () => {
    if (typeof text === 'string') return text;
    if (!text || typeof text !== 'object') return '';
    if (__runtime?.texts && text.textId && __runtime.texts[text.textId]) {
      return __runtime.texts[text.textId];
    }
    if (text[displayLocale]) return text[displayLocale];
    if (text.en) return text.en;
    if (text.zh) return text.zh;
    return '按钮';
  };

  const displayText = getDisplayText();

  // 计算圆角值（支持 Tailwind 常用值）
  const borderRadiusMap: Record<string, string> = {
    '0': '0',
    '0.125rem': '0.125rem',   // 小
    '0.5rem': '0.5rem',       // 中
    '0.75rem': '0.75rem',     // 大
    '9999px': '9999px',       // 圆形
  };
  const finalBorderRadius = borderRadiusMap[borderRadius] || borderRadius || '0.5rem';

  const buttonStyle: React.CSSProperties = {
    backgroundColor: buttonColor || '#000000',
    color: textColor || '#ffffff',
    fontSize: `${fontSize || 16}px`,
    fontWeight: bold ? 'bold' : 'normal',
    fontStyle: italic ? 'italic' : 'normal',
    textDecoration: underline ? 'underline' : 'none',
    textAlign: textAlign || 'center',
    padding: '1.2rem 3rem',      // 上下 0.75rem，左右 3rem，更明显的边距
    borderRadius: finalBorderRadius,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'inline-block',
    lineHeight: '1.2',
    whiteSpace: 'nowrap',
  };

  const wrapperAlign = {
    textAlign: buttonAlign || 'center',
  };

  const linkHref = link?.trim();

  // 编辑模式下不包裹 <a>，避免跳转
  const isInteractive = !isEditMode && linkHref;

  const Element = isInteractive ? 'a' : 'button';
  const extraProps = isInteractive
    ? { href: linkHref, target: '_blank', rel: 'noopener noreferrer' }
    : { type: 'button' };

  return (
    <div ref={puck?.dragRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-4" style={wrapperAlign}>
      <Element {...extraProps} style={buttonStyle}>
        {displayText}
      </Element>
    </div>
  );
}