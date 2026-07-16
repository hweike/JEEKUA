'use client';

import React from 'react';
import { DEFAULT_HEADING } from '@/lib/webbuilder/defaults/Heading';

// 每个 fontSize 对应的桌面端像素值
const FONT_SIZE_MAP: Record<string, number> = {
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
};

// 辅助函数：提取文本（兼容旧数据）
function getDisplayText(field: any): string {
  if (typeof field === 'string') return field;
  if (field && typeof field === 'object') {
    return field.zh || field.en || field.textId || Object.values(field).find(v => v) || '';
  }
  return '标题';
}

export function Heading({
  level,
  title,
  textAlign,
  bold,
  italic,
  underline,
  fontSize,
  link,
  puck,
  spacingGroup,
}: any) {
  const isEditMode = !!puck?.isEditing;

  // 合并 spacingGroup 默认值
  const mergedSpacingGroup = {
    ...DEFAULT_HEADING.spacingGroup,
    ...spacingGroup,
  };
  const mobileScaleFactor = mergedSpacingGroup.mobileScaleFactor ?? 0.7;

  // 获取桌面端字体大小
  const desktopFontSize = FONT_SIZE_MAP[fontSize] || 24;

  // ✅ 使用 clamp() 实现响应式字体
  const fontSizeClamp = `clamp(${desktopFontSize * mobileScaleFactor}px, 2.5vw, ${desktopFontSize}px)`;

  // 构建样式
  const styles: React.CSSProperties = {
    fontSize: fontSizeClamp,
    textAlign: textAlign as any,
    fontWeight: bold ? 'bold' : 'normal',
    fontStyle: italic ? 'italic' : 'normal',
    textDecoration: underline ? 'underline' : 'none',
  };

  const displayText = getDisplayText(title);

  // ✅ 使用 React.createElement 构建元素，避免 JSX 类型问题
  const tagName = `h${level}` as keyof JSX.IntrinsicElements;

  // 如果是链接模式
  if (!isEditMode && link && link.trim() !== '') {
    return (
      <div ref={puck?.dragRef} className="container mx-auto px-4 my-4">
        <a
          href={link.trim()}
          target="_blank"
          rel="noopener noreferrer"
          style={styles}
        >
          {displayText}
        </a>
      </div>
    );
  }

  // 普通标题模式
  return (
    <div ref={puck?.dragRef} className="container mx-auto px-4 my-4">
      {React.createElement(tagName, { style: styles }, displayText)}
    </div>
  );
}