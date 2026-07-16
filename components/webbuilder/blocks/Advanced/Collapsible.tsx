'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  ShoppingCart,
  Tag,
  Lock,
  Heart,
  Star,
  Truck,
  Flame,
  Leaf,
  Zap,
  Plane,
  MapPin,
  HelpCircle,
  Check,
  Clipboard,
  Eye,
  User,
  Shirt,
  Box,
  Recycle,
  Undo,
  Ruler,
  Utensils,
  Snowflake,
  Timer,
} from 'lucide-react';
import { getImageUrl } from '@/lib/files/url';
import { DEFAULT_COLLAPSIBLE } from '@/lib/webbuilder/defaults/Collapsible';
import { getAltSuffix } from '@/lib/webbuilder/alt-suffix-config';

function getDisplayImageUrl(url: string, isEditMode: boolean): string {
  if (!url) return '';
  const fullUrl = getImageUrl(url);
  if (isEditMode) {
    return `/api/proxy-image?url=${encodeURIComponent(fullUrl)}`;
  }
  return fullUrl;
}

// Lucide 图标映射
const ICON_COMPONENTS: Record<string, React.ElementType> = {
  shopping_cart: ShoppingCart,
  tag: Tag,
  lock: Lock,
  heart: Heart,
  star: Star,
  truck: Truck,
  flame: Flame,
  leaf: Leaf,
  zap: Zap,
  plane: Plane,
  map_pin: MapPin,
  help_circle: HelpCircle,
  check: Check,
  clipboard: Clipboard,
  eye: Eye,
  user: User,
  shirt: Shirt,
  box: Box,
  price_tag: Tag,
  recycle: Recycle,
  undo: Undo,
  ruler: Ruler,
  utensils: Utensils,
  snowflake: Snowflake,
  timer: Timer,
};

export function Collapsible(props: any) {
  const isEditMode = !!props.puck?.isEditing;

  // 从嵌套分组中合并默认值
  const bannerGroup = { ...DEFAULT_COLLAPSIBLE.bannerGroup, ...props.bannerGroup };
  const titleGroup = { ...DEFAULT_COLLAPSIBLE.titleGroup, ...props.titleGroup };
  const imageGroup = { ...DEFAULT_COLLAPSIBLE.imageGroup, ...props.imageGroup };
  const contentGroup = { ...DEFAULT_COLLAPSIBLE.contentGroup, ...props.contentGroup };
  const containerGroup = { ...DEFAULT_COLLAPSIBLE.containerGroup, ...props.containerGroup };
  const paddingGroup = { ...DEFAULT_COLLAPSIBLE.paddingGroup, ...props.paddingGroup };
  const spacingGroup = { ...DEFAULT_COLLAPSIBLE.spacingGroup, ...props.spacingGroup };
  const mergedItems = props.items ?? DEFAULT_COLLAPSIBLE.items;

  const mobileScaleFactor = spacingGroup.mobileScaleFactor ?? 0.7;

  // Alt 自动生成
  const __runtime = props.__runtime || {};
  const seoTitle = __runtime.seoTitle || '';
  const locale = __runtime.locale || 'zh';
  const suffix = getAltSuffix('Collapsible', locale);

  // 手风琴展开状态（编辑模式下默认展开第一个项目）
  const [expandedIndex, setExpandedIndex] = useState<number | null>(() => {
    if (isEditMode && mergedItems.length > 0) return 0;
    return null;
  });

  // 用于检测 items 变化的 ref（编辑联动）
  const prevItemsRef = useRef<any[]>(mergedItems);

  // 编辑联动：检测 items 变化，自动展开被编辑的项目
  useEffect(() => {
    if (!isEditMode || mergedItems.length === 0) return;

    const prev = prevItemsRef.current;
    let changedIndex = -1;
    for (let i = 0; i < Math.min(prev.length, mergedItems.length); i++) {
      if (JSON.stringify(prev[i]) !== JSON.stringify(mergedItems[i])) {
        changedIndex = i;
        break;
      }
    }
    // 如果长度变化，认为第一个被编辑
    if (changedIndex === -1 && prev.length !== mergedItems.length) {
      changedIndex = 0;
    }

    if (changedIndex !== -1) {
      setExpandedIndex(changedIndex);
    }

    prevItemsRef.current = mergedItems;
  }, [isEditMode, mergedItems]);

  // 当 items 变化时，如果当前展开的索引超出范围，重置为 0（仅在编辑模式）
  useEffect(() => {
    if (isEditMode && mergedItems.length > 0) {
      if (expandedIndex === null || expandedIndex >= mergedItems.length) {
        setExpandedIndex(0);
      }
    }
  }, [isEditMode, mergedItems.length, expandedIndex]);

  const toggleItem = (index: number) => {
    setExpandedIndex(prev => (prev === index ? null : index));
  };

  // 通栏统一实现
  const isFullwidth = bannerGroup.bannerType === 'fullwidth';
  const outerStyle: React.CSSProperties = {
    backgroundColor: bannerGroup.backgroundColor,
    ...(isFullwidth
      ? {
          position: 'relative',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100vw',
          maxWidth: '100vw',
        }
      : {
          maxWidth: '80rem',
          marginLeft: 'auto',
          marginRight: 'auto',
        }),
    ...(bannerGroup.bannerType === 'standard' ? { marginTop: '10px', marginBottom: '10px' } : {}),
  };
  const outerClasses = 'relative overflow-hidden';

  const contentStyle: React.CSSProperties = {
    paddingTop: `${paddingGroup.paddingTop}px`,
    paddingBottom: `${paddingGroup.paddingBottom}px`,
    maxWidth: '80rem',
    margin: '0 auto',
    width: '100%',
    paddingLeft: 'clamp(1rem, 2vw, 2rem)',
    paddingRight: 'clamp(1rem, 2vw, 2rem)',
  };

  // 响应式字体
  const globalTitleClamp = `clamp(${titleGroup.globalTitleFontSize * mobileScaleFactor}px, 3vw, ${titleGroup.globalTitleFontSize}px)`;
  const rowTitleClamp = `clamp(${contentGroup.rowTitleFontSize * mobileScaleFactor}px, 1.5vw, ${contentGroup.rowTitleFontSize}px)`;
  const rowContentClamp = `clamp(${contentGroup.rowContentFontSize * mobileScaleFactor}px, 1.2vw, ${contentGroup.rowContentFontSize}px)`;

  const hasImage = !!imageGroup.imageUrl;
  const flexDirection = hasImage
    ? (imageGroup.imagePlacement === 'left' ? 'flex-col md:flex-row' : 'flex-col md:flex-row-reverse')
    : 'flex-col';

  const getImageSizeClass = () => {
    switch (imageGroup.imageRatio) {
      case 'small': return 'w-1/2';
      case 'large': return 'w-full';
      default: return 'w-full';
    }
  };

  const getContainerStyle = (): React.CSSProperties => {
    const type = containerGroup.containerType;
    const bg = containerGroup.containerBgColor;
    if (type === 'row') return { backgroundColor: bg, borderRadius: '0.5rem', padding: '0.5rem' };
    if (type === 'section') return { backgroundColor: bg, borderRadius: '0.5rem', padding: '1rem' };
    return {};
  };

  if (isEditMode && mergedItems.length === 0 && !titleGroup.globalTitle && !hasImage) {
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
          <div className="w-full">
            {titleGroup.globalTitle && (
              <div style={{ textAlign: titleGroup.globalTitleAlign }} className="mb-8">
                <h2
                  className="font-bold"
                  style={{
                    fontSize: globalTitleClamp,
                    color: titleGroup.globalTitleColor,
                  }}
                >
                  {titleGroup.globalTitle}
                </h2>
              </div>
            )}

            <div className={`flex ${flexDirection} gap-8`}>
              {hasImage && (
                <div className="flex-1">
                  <div className={`${getImageSizeClass()} mx-auto`}>
                    <img
                      src={getDisplayImageUrl(imageGroup.imageUrl, isEditMode)}
                      alt={seoTitle ? `${seoTitle} - ${suffix}` : suffix}
                      className="w-full h-auto rounded-lg object-cover"
                      loading="lazy"
                    />
                  </div>
                </div>
              )}

              <div className="flex-1" style={getContainerStyle()}>
                {mergedItems.map((item: any, idx: number) => {
                  const IconComponent = ICON_COMPONENTS[item.icon];
                  const isExpanded = expandedIndex === idx;

                  return (
                    <div key={idx} className="mb-3 last:mb-0">
                      <div
                        className="flex items-center justify-between cursor-pointer p-3 hover:bg-gray-50 transition rounded-lg"
                        style={{
                          backgroundColor: titleGroup.rowBackgroundColor || '#f9fafb',
                        }}
                        onClick={() => toggleItem(idx)}
                      >
                        <div className="flex items-center gap-2">
                          {IconComponent && <IconComponent size={20} className="flex-shrink-0" />}
                          <span
                            className="font-medium"
                            style={{
                              fontSize: rowTitleClamp,
                              color: contentGroup.rowTitleColor,
                            }}
                          >
                            {item.title}
                          </span>
                        </div>
                        {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                      </div>
                      {isExpanded && (
                        <div className="p-3 pt-1">
                          <div
                            style={{
                              fontSize: rowContentClamp,
                              color: contentGroup.rowContentColor,
                            }}
                          >
                            {item.content}
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