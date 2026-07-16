'use client';

import React from 'react';
import { DEFAULT_BUTTON } from '@/lib/webbuilder/defaults/Button';

function getDisplayText(field: any): string {
  if (typeof field === 'string') return field;
  if (field && typeof field === 'object') {
    return field.zh || field.en || field.textId || Object.values(field).find(v => v) || '';
  }
  return '按钮';
}

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
  paddingX,
  paddingY,
  puck,
  spacingGroup,
}: any) {
  const isEditMode = !!puck?.isEditing;

  const mergedSpacingGroup = {
    ...DEFAULT_BUTTON.spacingGroup,
    ...spacingGroup,
  };
  const mobileScaleFactor = mergedSpacingGroup.mobileScaleFactor ?? 0.7;

  const displayText = getDisplayText(text) || '按钮';

  const fontSizeClamp = `clamp(${fontSize * mobileScaleFactor}px, 2.5vw, ${fontSize}px)`;

  // ✅ 文字对齐映射到 flex justify-content
  const justifyContentMap: Record<string, string> = {
    left: 'flex-start',
    center: 'center',
    right: 'flex-end',
  };
  const justifyContent = justifyContentMap[textAlign] || 'center';

  const buttonStyle: React.CSSProperties = {
    backgroundColor: buttonColor || '#000000',
    color: textColor || '#ffffff',
    fontSize: fontSizeClamp,
    fontWeight: bold ? 'bold' : 'normal',
    fontStyle: italic ? 'italic' : 'normal',
    textDecoration: underline ? 'underline' : 'none',
    padding: `${paddingY || 19}px ${paddingX || 48}px`,
    borderRadius: borderRadius || '0.5rem',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    lineHeight: '1.2',
    whiteSpace: 'nowrap',
    // ✅ 使用 flex 布局，由 justifyContent 控制文字位置
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: justifyContent,
    // 保留 textAlign 作为回退，但 flex 优先级更高
    textAlign: textAlign || 'center',
  };

  const wrapperAlign = {
    textAlign: buttonAlign || 'center',
  };

  const linkHref = link?.trim();
  const isInteractive = !isEditMode && linkHref;

  if (isInteractive) {
    return (
      <div ref={puck?.dragRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-4" style={wrapperAlign}>
        <a href={linkHref} target="_blank" rel="noopener noreferrer" style={buttonStyle}>
          {displayText}
        </a>
      </div>
    );
  }

  return (
    <div ref={puck?.dragRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-4" style={wrapperAlign}>
      <button type="button" style={buttonStyle}>
        {displayText}
      </button>
    </div>
  );
}