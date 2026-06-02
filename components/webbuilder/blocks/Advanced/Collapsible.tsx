'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { ChevronDown, ChevronRight } from 'lucide-react';

// ✅ 图标映射表（增加 none）
const ICON_MAP: Record<string, string> = {
  none: '',
  apple: '🍎',
  banana: '🍌',
  bottle: '🧴',
  box: '📦',
  carrot: '🥕',
  chat_bubble: '💬',
  check_mark: '✅',
  clipboard: '📋',
  dairy: '🥛',
  dairy_free: '🚫🥛',
  dryer: '🧺',
  eye: '👁️',
  fire: '🔥',
  gluten_free: '🚫🌾',
  heart: '❤️',
  iron: '🧺',
  leaf: '🍃',
  leather: '🧥',
  lightning_bolt: '⚡',
  lipstick: '💄',
  lock: '🔒',
  map_pin: '📍',
  nut_free: '🚫🥜',
  pants: '👖',
  paw_print: '🐾',
  pepper: '🌶️',
  perfume: '🧴',
  plane: '✈️',
  plant: '🌱',
  price_tag: '🏷️',
  question_mark: '❓',
  recycle: '♻️',
  return: '↩️',
  ruler: '📏',
  serving_dish: '🍽️',
  shirt: '👕',
  shoe: '👟',
  silhouette: '👤',
  snowflake: '❄️',
  star: '⭐',
  stopwatch: '⏱️',
  truck: '🚚',
  washing: '🧺',
};

export function Collapsible(props: any) {
  const isEditMode = !!props.puck?.isEditing;
  const pageLocale = useLocale();

  const bannerGroup = props.bannerGroup || {};
  const titleGroup = props.titleGroup || {};
  const imageGroup = props.imageGroup || {};
  const rowGroup = props.rowGroup || {};
  const layoutGroup = props.layoutGroup || {};
  const paddingGroup = props.paddingGroup || {};
  const items = props.items || [];

  const bannerType = bannerGroup.bannerType || 'standard';
  const backgroundColor = bannerGroup.backgroundColor || '#ffffff';

  const globalTitle = titleGroup.globalTitle;
  const globalTitleFontSize = titleGroup.globalTitleFontSize || 40;
  const globalTitleColor = titleGroup.globalTitleColor || '#000000';
  const globalTitleAlign = titleGroup.globalTitleAlign || 'center';

  const imageUrl = imageGroup.imageUrl || '';
  const imageRatio = imageGroup.imageRatio || 'adapt';
  const imagePlacement = imageGroup.imagePlacement || 'left';

  const rowTitleColor = rowGroup.rowTitleColor || '#000000';
  const rowTitleFontSize = rowGroup.rowTitleFontSize || 18;
  const rowContentColor = rowGroup.rowContentColor || '#666666';
  const rowContentFontSize = rowGroup.rowContentFontSize || 16;

  const containerType = layoutGroup.containerType || 'none';
  const containerBgColor = layoutGroup.containerBgColor || 'transparent';

  const paddingTop = paddingGroup.paddingTop ?? 32;
  const paddingBottom = paddingGroup.paddingBottom ?? 32;

  // 多语言状态
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
      if (e.key === 'webbuilder_edit_locale' && e.newValue && (e.newValue === 'zh' || e.newValue === 'en')) {
        setEditLocale(e.newValue);
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
    return field[displayLocale] || field.en || field.zh || '';
  };

  const globalTitleText = getText(globalTitle);

  // 手风琴状态
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const toggleRow = (index: number) => {
    setExpandedIndex(prev => (prev === index ? null : index));
  };

  // 图片比例样式（使用宽度百分比）
  const getImageSizeClass = () => {
    switch (imageRatio) {
      case 'small': return 'w-1/2';
      case 'large': return 'w-full';
      default: return 'w-full';
    }
  };

  // ✅ 容器样式（统一使用内联样式）
  const getContainerStyle = (): React.CSSProperties => {
    if (containerType === 'row') {
      return { backgroundColor: containerBgColor, borderRadius: '0.5rem', padding: '0.5rem' };
    }
    if (containerType === 'section') {
      return { backgroundColor: containerBgColor, borderRadius: '0.5rem', padding: '1rem' };
    }
    return {};
  };

  // 通栏样式
  const outerClasses = `relative overflow-hidden ${
    bannerType === 'fullwidth'
      ? 'w-screen left-1/2 right-1/2 -ml-[50vw] mr-[50vw]'
      : 'max-w-7xl mx-auto'
  }`;
  const outerMargin = bannerType === 'standard' ? { marginTop: '10px', marginBottom: '10px' } : {};
  const outerStyle: React.CSSProperties = { backgroundColor, ...outerMargin };
  const contentStyle: React.CSSProperties = { paddingTop: `${paddingTop}px`, paddingBottom: `${paddingBottom}px` };

  const hasImage = !!imageUrl;
  const flexDirection = hasImage ? (imagePlacement === 'left' ? 'flex-col md:flex-row' : 'flex-col md:flex-row-reverse') : 'flex-col';

  if (isEditMode && items.length === 0 && !globalTitleText && !imageUrl) {
    return (
      <div ref={props.puck?.dragRef} className={outerClasses} style={outerStyle}>
        <div className="border-2 border-dashed border-gray-300 p-8 text-center text-gray-400">
          〖可折叠组件 - 请添加内容〗
        </div>
      </div>
    );
  }

  return (
    <div ref={props.puck?.dragRef} className={outerClasses} style={outerStyle}>
      <div className="relative w-full">
        <div style={contentStyle}>
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
            {globalTitleText && (
              <div className={`text-${globalTitleAlign} mb-8`}>
                <h2 className="font-bold" style={{ fontSize: `${globalTitleFontSize}px`, color: globalTitleColor }}>
                  {globalTitleText}
                </h2>
              </div>
            )}

            <div className={`flex ${flexDirection} gap-8`}>
              {hasImage && (
                <div className="flex-1">
                  <div className={`${getImageSizeClass()} mx-auto`}>
                    <img src={imageUrl} alt="banner" className="w-full h-auto rounded-lg object-cover" />
                  </div>
                </div>
              )}

              {/* 可折叠列表区域 */}
              <div className="flex-1" style={getContainerStyle()}>
                {items.map((item: any, idx: number) => {
                  const titleText = getText(item.title);
                  const contentText = getText(item.content);
                  const icon = ICON_MAP[item.icon] || '';
                  const isExpanded = expandedIndex === idx;

                  return (
                    <div key={item.id} className="mb-3 last:mb-0">
                      <div
                        className="flex items-center justify-between cursor-pointer p-3 hover:bg-gray-50 transition rounded-lg"
                        onClick={() => toggleRow(idx)}
                      >
                        <div className="flex items-center gap-2">
                          {icon && <span className="text-xl">{icon}</span>}
                          <span className="font-medium" style={{ fontSize: `${rowTitleFontSize}px`, color: rowTitleColor }}>
                            {titleText}
                          </span>
                        </div>
                        {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                      </div>
                      {isExpanded && (
                        <div className="p-3 pt-0">
                          <div style={{ fontSize: `${rowContentFontSize}px`, color: rowContentColor }}>
                            {contentText}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}