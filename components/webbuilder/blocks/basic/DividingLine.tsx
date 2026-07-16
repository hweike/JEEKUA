'use client';

import React from 'react';
import { DEFAULT_DIVIDING_LINE } from '@/lib/webbuilder/defaults/DividingLine';
import type { DividingLineProps } from '@/lib/webbuilder/types';

type DividingLineRenderProps = DividingLineProps & {
  puck?: { dragRef: (el: HTMLElement | null) => void };
};

const WIDTH_MAP: Record<string, string> = {
  full: '100%',
  '90': '90%',
  '80': '80%',
  '50': '50%',
};

export function DividingLine({
  lineType = DEFAULT_DIVIDING_LINE.lineType,
  thickness = DEFAULT_DIVIDING_LINE.thickness,
  color = DEFAULT_DIVIDING_LINE.color,
  widthType = DEFAULT_DIVIDING_LINE.widthType,
  align = DEFAULT_DIVIDING_LINE.align,
  puck,
}: DividingLineRenderProps) {
  const width = WIDTH_MAP[widthType] || '100%';

  // 根据对齐方式设置左右边距
  const marginLeft = align === 'left' ? 0 : align === 'center' ? 'auto' : 'auto';
  const marginRight = align === 'left' ? 'auto' : align === 'center' ? 'auto' : 0;

  const lineStyle: React.CSSProperties = {
    width,
    height: 0,
    borderTopWidth: thickness,
    borderTopStyle: lineType,
    borderTopColor: color,
    marginLeft,
    marginRight,
  };

  return (
    <div ref={puck?.dragRef} className="container mx-auto px-4 sm:px-6 lg:px-8 my-4">
      <div style={lineStyle} />
    </div>
  );
}