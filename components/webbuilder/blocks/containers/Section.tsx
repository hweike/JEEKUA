'use client';

import React from 'react';
import type { SectionProps } from '@/lib/webbuilder/types';

interface SectionRenderProps extends SectionProps {
  puck?: {
    dragRef: (element: HTMLElement | null) => void;
    renderDropZone: (options: { zone: string }) => React.ReactNode;
  };
  children?: React.ReactNode;
  direction?: 'column' | 'row' | 'row-wrap';
  gap?: number;
  justifyContent?: 'flex-start' | 'center' | 'flex-end';
  alignItems?: 'flex-start' | 'center' | 'flex-end';
  contentWidth?: 'fill' | 'custom';
  customContentWidth?: number;
}

export function Section({
  sizeGroup,
  spacingGroup,
  backgroundGroup,
  borderGroup,
  children,
  puck,
  direction = 'column',
  gap = 10,
  justifyContent = 'flex-start',
  alignItems = 'flex-start',
  contentWidth = 'fill',
  customContentWidth = 1100,
}: SectionRenderProps) {
  const containerWidth = sizeGroup?.containerWidth ?? 'full';
  const containerHeight = sizeGroup?.containerHeight ?? 'auto';
  const customContainerWidth = sizeGroup?.customContainerWidth;
  const customContainerHeight = sizeGroup?.customContainerHeight;

  const paddingTop = spacingGroup?.paddingTop ?? 24;
  const paddingRight = spacingGroup?.paddingRight ?? 24;
  const paddingBottom = spacingGroup?.paddingBottom ?? 24;
  const paddingLeft = spacingGroup?.paddingLeft ?? 24;
  const marginTop = spacingGroup?.marginTop ?? 0;
  const marginRight = spacingGroup?.marginRight ?? 0;
  const marginBottom = spacingGroup?.marginBottom ?? 0;
  const marginLeft = spacingGroup?.marginLeft ?? 0;

  const backgroundColor = backgroundGroup?.backgroundColor ?? '';
  const backgroundImageValue = backgroundGroup?.backgroundImage;
  const backgroundImageUrl =
    typeof backgroundImageValue === 'string'
      ? backgroundImageValue
      : (backgroundImageValue as any)?.url || '';  // 修复类型 never 错误

  const borderStyle = borderGroup?.borderStyle ?? 'none';
  const borderTopLeftRadius = borderGroup?.borderTopLeftRadius ?? 0;
  const borderTopRightRadius = borderGroup?.borderTopRightRadius ?? 0;
  const borderBottomRightRadius = borderGroup?.borderBottomRightRadius ?? 0;
  const borderBottomLeftRadius = borderGroup?.borderBottomLeftRadius ?? 0;

  const renderContent = () => {
    if (puck) return puck.renderDropZone({ zone: 'content' });
    return children;
  };

  const containerWidthStyle =
    containerWidth === 'full'
      ? '100%'
      : containerWidth === 'custom' && typeof customContainerWidth === 'number'
      ? `${customContainerWidth}px`
      : '100%';
  const containerHeightStyle =
    containerHeight === 'full'
      ? '100vh'
      : containerHeight === 'custom' && typeof customContainerHeight === 'number'
      ? `${customContainerHeight}px`
      : 'auto';

  const contentWidthStyle = contentWidth === 'fill' ? '100%' : `${customContentWidth}px`;

  const borderStyleString = borderStyle === 'none' ? 'none' : `1px ${borderStyle} var(--border)`;

  const isColumn = direction === 'column';
  const justifyContentValue = isColumn ? alignItems : justifyContent;
  const alignItemsValue = isColumn ? justifyContent : alignItems;

  const sectionStyle: React.CSSProperties = {
    width: containerWidthStyle,
    height: containerHeightStyle,
    marginTop: `${marginTop}px`,
    marginRight: `${marginRight}px`,
    marginBottom: `${marginBottom}px`,
    marginLeft: `${marginLeft}px`,
    backgroundColor: backgroundColor || undefined,
    backgroundImage: backgroundImageUrl ? `url(${backgroundImageUrl})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    border: borderStyleString,
    borderTopLeftRadius: `${borderTopLeftRadius}px`,
    borderTopRightRadius: `${borderTopRightRadius}px`,
    borderBottomRightRadius: `${borderBottomRightRadius}px`,
    borderBottomLeftRadius: `${borderBottomLeftRadius}px`,
    overflow: 'auto',
    '--section-direction': isColumn ? 'column' : 'row',
    '--section-wrap': direction === 'row-wrap' ? 'wrap' : 'nowrap',
    '--section-justify': justifyContentValue,
    '--section-align': alignItemsValue,
    '--section-gap': `${gap}px`,
    '--section-content-width': contentWidthStyle,
    '--section-max-width': contentWidth === 'custom' ? `${customContentWidth}px` : undefined,
    '--section-margin-left': contentWidth === 'custom' ? 'auto' : undefined,
    '--section-margin-right': contentWidth === 'custom' ? 'auto' : undefined,
    '--section-padding-top': `${paddingTop}px`,
    '--section-padding-right': `${paddingRight}px`,
    '--section-padding-bottom': `${paddingBottom}px`,
    '--section-padding-left': `${paddingLeft}px`,
    '--section-min-height': '100px',
    '--section-height': containerHeight === 'full' || containerHeight === 'custom' ? '100%' : undefined,
  } as React.CSSProperties;

  const innerDivStyle = {
    display: 'flex',
    flexDirection: 'var(--section-direction)',
    flexWrap: 'var(--section-wrap)',
    justifyContent: 'var(--section-justify)',
    alignItems: 'var(--section-align)',
    gap: 'var(--section-gap)',
    width: 'var(--section-content-width)',
    maxWidth: 'var(--section-max-width)',
    marginLeft: 'var(--section-margin-left)',
    marginRight: 'var(--section-margin-right)',
    paddingTop: 'var(--section-padding-top)',
    paddingRight: 'var(--section-padding-right)',
    paddingBottom: 'var(--section-padding-bottom)',
    paddingLeft: 'var(--section-padding-left)',
    minHeight: 'var(--section-min-height)',
    height: 'var(--section-height)',
  } as React.CSSProperties;

  return (
    <section ref={puck?.dragRef} className="relative" style={sectionStyle}>
      <div style={innerDivStyle}>{renderContent()}</div>
    </section>
  );
}