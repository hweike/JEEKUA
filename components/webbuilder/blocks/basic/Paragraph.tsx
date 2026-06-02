'use client';

import React, { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';

export function Paragraph({ text, fontSize, textAlign, bold, italic, underline, color, link, puck, __runtime }: any) {
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
    return '';
  };

  const displayText = getDisplayText();

  const style: React.CSSProperties = {
    fontSize: `${fontSize || 16}px`,
    textAlign: textAlign || 'left',
    fontWeight: bold ? 'bold' : 'normal',
    fontStyle: italic ? 'italic' : 'normal',
    textDecoration: underline ? 'underline' : 'none',
    color: color || '#333333',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  };

  const content = displayText || '段落文本';
  const tagProps = { style, className: '' };
  const linkHref = link?.trim();

  // 如果有链接且非编辑模式（或编辑模式也允许点击，但通常编辑模式下应避免跳转）
  // 为了编辑体验，编辑模式下不包裹 <a>，保持可编辑性；前台模式下才添加链接
  const isInteractive = !isEditMode && linkHref;

  const Element = isInteractive ? 'a' : 'p';
  const extraProps = isInteractive ? { href: linkHref, target: '_blank', rel: 'noopener noreferrer' } : {};

  return (
    <div ref={puck?.dragRef} className="container mx-auto px-4 my-4">
      <Element {...extraProps} style={style}>
        {content}
      </Element>
    </div>
  );
}