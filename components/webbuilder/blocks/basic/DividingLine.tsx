'use client';

import React from 'react';
import type { DividingLineProps } from '@/lib/webbuilder/types';

interface DividingLineRenderProps extends DividingLineProps {
  puck?: { dragRef: (el: HTMLElement | null) => void };
}

export function DividingLine({ lineType = 'solid', thickness = 1, color = '#e5e7eb', puck }: DividingLineRenderProps) {
  // 只使用分写属性，避免与简写混用
  const lineStyle: React.CSSProperties = {
    width: '100%',
    height: '0',
    borderTopWidth: `${thickness}px`,
    borderTopStyle: lineType,
    borderTopColor: color,
  };

  return (
    <div ref={puck?.dragRef} className="container mx-auto px-4 sm:px-6 lg:px-8 my-4">
      <div style={lineStyle} />
    </div>
  );
}