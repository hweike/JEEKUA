'use client';

import React, { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';

const getIcon = (type: string, index: number, style: React.CSSProperties) => {
  const iconStyle = { ...style, marginRight: '0.5rem', display: 'inline' };
  switch (type) {
    case 'dot':
      return <span style={iconStyle}>•</span>;
    case 'number':
      return <span style={iconStyle}>{index + 1}.</span>;
    case 'star':
      return <span style={iconStyle}>★</span>;
    default:
      return null;
  }
};

export function List({ items, iconType = 'none', puck, __runtime }: any) {
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

  const getDisplayText = (itemText: any) => {
    if (typeof itemText === 'string') return itemText;
    if (!itemText || typeof itemText !== 'object') return '';
    if (__runtime?.texts && itemText.textId && __runtime.texts[itemText.textId]) {
      return __runtime.texts[itemText.textId];
    }
    if (itemText[displayLocale]) return itemText[displayLocale];
    if (itemText.en) return itemText.en;
    if (itemText.zh) return itemText.zh;
    return '';
  };

  if (!items || items.length === 0) {
    return (
      <div ref={puck?.dragRef} className="max-w-7xl mx-auto my-2 text-gray-400 text-center">
        暂无列表项，请在属性面板添加
      </div>
    );
  }

  return (
    <div ref={puck?.dragRef} className="max-w-7xl mx-auto my-2">
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {items.map((item: any, idx: number) => {
          const text = getDisplayText(item.text);
          const baseStyle: React.CSSProperties = {
            color: item.textColor || '#000000',
            fontSize: `${item.fontSize || 16}px`,
            fontWeight: item.bold ? 'bold' : 'normal',
            fontStyle: item.italic ? 'italic' : 'normal',
            textDecoration: item.underline ? 'underline' : 'none',
            lineHeight: 1.5,
          };
          const linkHref = item.link?.trim();
          const isInteractive = !isEditMode && linkHref;
          const Element = isInteractive ? 'a' : 'span';
          const extraProps = isInteractive
            ? { href: linkHref, target: '_blank', rel: 'noopener noreferrer' }
            : {};

          // 文本对齐应用在 li 上，使整个列表项内容按指定方式对齐
          const liStyle: React.CSSProperties = {
            marginBottom: '0.5rem',
            textAlign: item.textAlign || 'left',
          };

          return (
            <li key={item.id} style={liStyle}>
              {getIcon(iconType, idx, baseStyle)}
              <Element {...extraProps} style={baseStyle}>
                {text || `列表项 ${idx + 1}`}
              </Element>
            </li>
          );
        })}
      </ul>
    </div>
  );
}