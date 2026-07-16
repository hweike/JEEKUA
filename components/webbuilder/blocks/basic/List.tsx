'use client';

import React from 'react';
import {
  Check,
  Star,
  Heart,
  Tag,
  Lock,
  Truck,
  Flame,
  Leaf,
  Zap,
  Plane,
  MapPin,
  HelpCircle,
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
  ShoppingCart,
} from 'lucide-react';
import { DEFAULT_LIST } from '@/lib/webbuilder/defaults/List';

// Lucide 图标映射（与 Collapsible 保持一致）
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

// 辅助函数：提取文本（兼容旧数据）
function getDisplayText(field: any): string {
  if (typeof field === 'string') return field;
  if (field && typeof field === 'object') {
    return field.zh || field.en || field.textId || Object.values(field).find(v => v) || '';
  }
  return '';
}

export function List({ items, puck, spacingGroup }: any) {
  const isEditMode = !!puck?.isEditing;

  const mergedSpacingGroup = {
    ...DEFAULT_LIST.spacingGroup,
    ...spacingGroup,
  };
  const mobileScaleFactor = mergedSpacingGroup.mobileScaleFactor ?? 0.7;

  const mergedItems = items ?? DEFAULT_LIST.items;

  if (!mergedItems || mergedItems.length === 0) {
    return (
      <div ref={puck?.dragRef} className="relative overflow-hidden">
        <div className="w-full text-center text-gray-400 py-4">
          暂无列表项，请在属性面板添加
        </div>
      </div>
    );
  }

  // 左右缩进与 Collapsible 完全一致
  const containerStyle: React.CSSProperties = {
    maxWidth: '80rem',
    margin: '0 auto',
    width: '100%',
    paddingLeft: 'clamp(1rem, 2vw, 2rem)',
    paddingRight: 'clamp(1rem, 2vw, 2rem)',
  };

  return (
    <div ref={puck?.dragRef} className="relative overflow-hidden">
      <div style={containerStyle}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {mergedItems.map((item: any, idx: number) => {
            const text = getDisplayText(item.text) || `列表项 ${idx + 1}`;
            const IconComponent = ICON_COMPONENTS[item.icon];
            const isInteractive = !isEditMode && item.link?.trim();
            const Element = isInteractive ? 'a' : 'span';
            const extraProps = isInteractive
              ? { href: item.link.trim(), target: '_blank', rel: 'noopener noreferrer' }
              : {};

            const fontSizeClamp = `clamp(${item.fontSize * mobileScaleFactor}px, 1.2vw, ${item.fontSize}px)`;


            const liStyle: React.CSSProperties = {
              display: 'flex',
              alignItems: 'flex-start',
              marginBottom: '0.75rem',
              gap: '0.5rem',
              justifyContent: item.textAlign === 'center' ? 'center' : item.textAlign === 'right' ? 'flex-end' : 'flex-start',
            };
            // ✅ 文本对齐直接应用到文本元素上
            const baseStyle: React.CSSProperties = {
              color: item.textColor || '#000000',
              fontSize: fontSizeClamp,
              fontWeight: item.bold ? 'bold' : 'normal',
              fontStyle: item.italic ? 'italic' : 'normal',
              textDecoration: item.underline ? 'underline' : 'none',
              lineHeight: 1.5,
            };            
          

            return (
               <li key={item.id || idx} style={liStyle}>
                {IconComponent && <IconComponent size={20} className="flex-shrink-0 mt-0.5" />}
                <Element {...extraProps} style={baseStyle}>
                  {text}
                </Element>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}