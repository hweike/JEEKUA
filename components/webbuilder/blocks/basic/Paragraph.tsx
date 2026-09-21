'use client';

import React from 'react';
import { DEFAULT_PARAGRAPH } from '@/lib/webbuilder/defaults/Paragraph';

// ✅ 旧数据 → HTML（兼容）
function normalizeLegacyToHTML(props: any): string {
  if (props.content) return props.content;

  const text =
    typeof props.text === 'string'
      ? props.text
      : props.text?.zh || props.text?.en || '';

  if (!text) return '<p>段落文本</p>';

  const styles: string[] = [];
  if (props.bold) styles.push('font-weight: bold');
  if (props.italic) styles.push('font-style: italic');
  if (props.underline) styles.push('text-decoration: underline');
  if (props.color) styles.push(`color: ${props.color}`);

  const styleAttr = styles.length > 0 ? ` style="${styles.join(';')}"` : '';
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

  const inner = props.link
    ? `<a href="${props.link}" target="_blank" rel="noopener noreferrer">${escaped}</a>`
    : escaped;

  return `<p${styleAttr}>${inner}</p>`;
}

export function Paragraph({
  content,
  fontSize,
  textAlign,
  color,
  puck,
  spacingGroup,
  ...rest
}: any) {
  const mergedSpacingGroup = {
    ...DEFAULT_PARAGRAPH.spacingGroup,
    ...spacingGroup,
  };
  const mobileScaleFactor = mergedSpacingGroup.mobileScaleFactor ?? 0.7;

  const html = normalizeLegacyToHTML({ content, ...rest });

  const fontSizeClamp = `clamp(${fontSize * mobileScaleFactor}px, 2.5vw, ${fontSize}px)`;

  const wrapperStyle: React.CSSProperties = {
    fontSize: fontSizeClamp,
    textAlign: textAlign || 'left',
    color: color || '#333333',
    lineHeight: 1.6,
    wordBreak: 'break-word',
  };

  return (
    <div
      ref={puck?.dragRef}
      className="container mx-auto px-4 my-4 prose max-w-none"
      style={wrapperStyle}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}