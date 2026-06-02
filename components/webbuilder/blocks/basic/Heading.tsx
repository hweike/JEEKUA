'use client';

import React, { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';

const fontSizeClasses: Record<string, string> = {
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
  '4xl': 'text-4xl',
  '5xl': 'text-5xl',
};

export function Heading({ 
  level, 
  title, 
  textAlign, 
  bold, 
  italic, 
  underline, 
  fontSize,
  link,
  puck 
}: any) {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
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
        if (newLocale && (newLocale === 'zh' || newLocale === 'en')) {
          setEditLocale(newLocale);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [isEditMode]);

  useEffect(() => {
    if (!isEditMode) return;
    const stored = localStorage.getItem('webbuilder_edit_locale');
    if (!stored) {
      setEditLocale(pageLocale);
    }
  }, [isEditMode, pageLocale]);

  const displayLocale = isEditMode ? editLocale : pageLocale;

  const getDisplayText = () => {
    if (typeof title === 'string') return title || '标题';
    if (!title || typeof title !== 'object') return '标题';
    if (title[displayLocale]) return title[displayLocale];
    if (title.en) return title.en;
    if (title.zh) return title.zh;
    return '标题';
  };

  const displayText = getDisplayText();

  const styleClasses = [
    fontSizeClasses[fontSize] || 'text-2xl',
    textAlign === 'center' ? 'text-center' : textAlign === 'right' ? 'text-right' : 'text-left',
    bold ? 'font-bold' : '',
    italic ? 'italic' : '',
    underline ? 'underline' : '',
  ].filter(Boolean).join(' ');

  // 判断是否有链接且非编辑模式（编辑模式下避免跳转干扰）
  const hasLink = !isEditMode && link && link.trim() !== '';

  // 内容元素：如果是链接则用 <a>，否则用标题标签
  const ContentElement = hasLink ? 'a' : Tag;
  const extraProps = hasLink ? { href: link.trim(), target: '_blank', rel: 'noopener noreferrer' } : {};

  return (
    <div ref={puck?.dragRef} className="container mx-auto px-4 my-4">
      <ContentElement {...extraProps} className={styleClasses}>
        {displayText}
      </ContentElement>
    </div>
  );
}