'use client';

import React from 'react';
import { DEFAULT_PARAGRAPH } from '@/lib/webbuilder/defaults/Paragraph';

// 辅助函数：提取文本（兼容旧数据）
function getDisplayText(field: any): string {
  if (typeof field === 'string') return field;
  if (field && typeof field === 'object') {
    return field.zh || field.en || field.textId || Object.values(field).find(v => v) || '';
  }
  return '';
}

export function Paragraph({
  text,
  fontSize,
  textAlign,
  bold,
  italic,
  underline,
  color,
  link,
  puck,
  spacingGroup,
}: any) {
  const isEditMode = !!puck?.isEditing;

  // 合并 spacingGroup 默认值
  const mergedSpacingGroup = {
    ...DEFAULT_PARAGRAPH.spacingGroup,
    ...spacingGroup,
  };
  const mobileScaleFactor = mergedSpacingGroup.mobileScaleFactor ?? 0.7;

  const displayText = getDisplayText(text) || '段落文本';

  // ✅ 使用 clamp() 实现响应式字体
  const fontSizeClamp = `clamp(${fontSize * mobileScaleFactor}px, 2.5vw, ${fontSize}px)`;

  const style: React.CSSProperties = {
    fontSize: fontSizeClamp,
    textAlign: textAlign || 'left',
    fontWeight: bold ? 'bold' : 'normal',
    fontStyle: italic ? 'italic' : 'normal',
    textDecoration: underline ? 'underline' : 'none',
    color: color || '#333333',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  };

  const linkHref = link?.trim();

  // 如果有链接且非编辑模式
  const isInteractive = !isEditMode && linkHref;

  if (isInteractive) {
    return (
      <div ref={puck?.dragRef} className="container mx-auto px-4 my-4">
        <a
          href={linkHref}
          target="_blank"
          rel="noopener noreferrer"
          style={style}
        >
          {displayText}
        </a>
      </div>
    );
  }

  return (
    <div ref={puck?.dragRef} className="container mx-auto px-4 my-4">
      <p style={style}>{displayText}</p>
    </div>
  );
}