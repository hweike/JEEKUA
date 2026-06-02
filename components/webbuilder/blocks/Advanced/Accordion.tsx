'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { ChevronDown, ChevronRight } from 'lucide-react';

export function Accordion(props: any) {
  console.log('Accordion props in edit mode:', props);
  const isEditMode = !!props.puck?.isEditing;
  const pageLocale = useLocale();

  // ========== 1. 首先解构所有分组数据 ==========
  const bannerGroup = props.bannerGroup || {};
  const rowGroup = props.rowGroup || {};
  const contentGroup = props.contentGroup || {};
  const paddingGroup = props.paddingGroup || {};
  const items = props.items || [];

  const bannerType = bannerGroup.bannerType || 'standard';
  const backgroundColor = bannerGroup.backgroundColor || '#ffffff';

  const rowTitleColor = rowGroup.rowTitleColor || '#000000';
  const rowTitleFontSize = rowGroup.rowTitleFontSize || 20;
  const rowTitleAlign = rowGroup.rowTitleAlign || 'left';
  const rowHeaderBgColor = rowGroup.rowHeaderBgColor || '#f3f4f6';
  const itemsPerRow = rowGroup.itemsPerRow || 3;
  const itemsGap = rowGroup.itemsGap || 20;

  const contentTitleFontSize = contentGroup.contentTitleFontSize || 18;
  const contentTitleAlign = contentGroup.contentTitleAlign || 'center';
  const contentTextFontSize = contentGroup.contentTextFontSize || 14;
  const contentTextAlign = contentGroup.contentTextAlign || 'center';

  const paddingTop = paddingGroup.paddingTop ?? 32;
  const paddingBottom = paddingGroup.paddingBottom ?? 32;

  // ========== 2. 定义所有状态（必须在任何 useEffect 之前） ==========
  // 多语言状态
  const [editLocale, setEditLocale] = useState<string>(() => {
    if (typeof window !== 'undefined' && isEditMode) {
      const stored = localStorage.getItem('webbuilder_edit_locale');
      if (stored && (stored === 'zh' || stored === 'en')) return stored;
    }
    return pageLocale;
  });

  // 手风琴展开状态（编辑模式下默认展开第一个项目）
  const [expandedIndex, setExpandedIndex] = useState<number | null>(() => {
    if (isEditMode && items.length > 0) {
      return 0;
    }
    return null;
  });

  // ========== 3. 副作用（监听事件、同步语言等） ==========
  useEffect(() => {
    if (!isEditMode) return;
    const stored = localStorage.getItem('webbuilder_edit_locale');
    if (!stored) setEditLocale(pageLocale);
  }, [isEditMode, pageLocale]);

  // 监听属性面板的事件，当用户在属性面板点击某个手风琴项目时，预览区自动展开对应项目
  useEffect(() => {
    if (!isEditMode) return;
    const handleEditItem = (e: CustomEvent) => {
      const { index } = e.detail;
      if (index !== undefined && index >= 0 && index < items.length) {
        setExpandedIndex(index);
      }
    };
    window.addEventListener('accordion-edit-item', handleEditItem as EventListener);
    return () => {
      window.removeEventListener('accordion-edit-item', handleEditItem as EventListener);
    };
  }, [isEditMode, items.length]); // 添加 items.length 依赖，确保索引有效

  // 监听全局语言切换
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

  const displayLocale = isEditMode ? editLocale : pageLocale;

  const getText = (field: any) => {
    if (typeof field === 'string') return field;
    if (!field || typeof field !== 'object') return '';
    if (props.__runtime?.texts && field.textId && props.__runtime.texts[field.textId])
      return props.__runtime.texts[field.textId];
    return field[displayLocale] || field.en || field.zh || '';
  };

  const toggleItem = (index: number) => {
    setExpandedIndex(prev => (prev === index ? null : index));
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

  // 网格内联样式
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${itemsPerRow}, minmax(0, 1fr))`,
    gap: `${itemsGap}px`,
  };

  if (isEditMode && items.length === 0) {
    return (
      <div ref={props.puck?.dragRef} className={outerClasses} style={outerStyle}>
        <div className="border-2 border-dashed border-gray-300 p-8 text-center text-gray-400">
          〖手风琴组件 - 请添加手风琴项目〗
        </div>
      </div>
    );
  }

  return (
    <div ref={props.puck?.dragRef} className={outerClasses} style={outerStyle}>
      <div className="relative w-full">
        <div style={contentStyle}>
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
            <div className="space-y-4">
              {items.map((item: any, idx: number) => {
                const titleText = getText(item.title);
                const contents = item.contents || [];
                const isExpanded = expandedIndex === idx;

                return (
                  <div key={item.id} className="border rounded-lg overflow-hidden">
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer transition hover:opacity-80"
                      style={{ backgroundColor: rowHeaderBgColor }}
                      onClick={() => toggleItem(idx)}
                    >
                      <div
                        className="font-medium"
                        style={{
                          fontSize: `${rowTitleFontSize}px`,
                          color: rowTitleColor,
                          textAlign: rowTitleAlign,
                        }}
                      >
                        {titleText || `手风琴项目 ${idx + 1}`}
                      </div>
                      {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </div>

                    {isExpanded && (
                      <div className="p-6">
                        {contents.length === 0 ? (
                          <div className="text-center text-gray-400 py-8">
                            暂无内容项，请在右侧属性面板中添加内容项
                          </div>
                        ) : (
                          <div style={gridStyle}>
                            {contents.map((content: any, cidx: number) => {
                              const contentTitle = getText(content.title);
                              const paragraph = getText(content.paragraph);
                              const imageUrl = content.imageUrl;
                              const link = content.link;
                              const WrapperTag = link ? 'a' : 'div';
                              const wrapperProps = link
                                ? { href: link, target: '_blank', rel: 'noopener noreferrer', className: 'block group' }
                                : { className: 'block' };

                              return (
                                <WrapperTag key={content.id} {...wrapperProps}>
                                  <div className="flex flex-col items-center text-center">
                                    {imageUrl && (
                                      <div className="mb-4 overflow-hidden rounded-lg">
                                        <img
                                          src={imageUrl}
                                          alt={contentTitle || 'image'}
                                          className="w-full h-auto object-cover transition-transform group-hover:scale-105"
                                        />
                                      </div>
                                    )}
                                    {contentTitle && (
                                      <h3
                                        className="font-semibold mb-2"
                                        style={{
                                          fontSize: `${contentTitleFontSize}px`,
                                          textAlign: contentTitleAlign,
                                        }}
                                      >
                                        {contentTitle}
                                      </h3>
                                    )}
                                    {paragraph && (
                                      <p
                                        style={{
                                          fontSize: `${contentTextFontSize}px`,
                                          textAlign: contentTextAlign,
                                          color: '#666',
                                        }}
                                      >
                                        {paragraph}
                                      </p>
                                    )}
                                  </div>
                                </WrapperTag>
                              );
                            })}
                          </div>
                        )}
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
  );
}