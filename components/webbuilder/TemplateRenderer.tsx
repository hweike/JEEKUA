'use client';

import React from 'react';
import { Heading } from '@/components/webbuilder/blocks/basic/Heading';
import { Paragraph } from '@/components/webbuilder/blocks/basic/Paragraph';
import { Table } from '@/components/webbuilder/blocks/Table';
import { BlankBlock } from '@/components/webbuilder/blocks/containers/BlankBlock';
import { Section } from '@/components/webbuilder/blocks/containers/Section';
import { ProductLineBlock } from '@/components/webbuilder/blocks/product-line/ProductLineBlock';
import { ProductCollectionsBlock } from '@/components/webbuilder/blocks/product-collections/ProductCollectionsBlock';
import { ProductDetailsBlock } from '@/components/webbuilder/blocks/product-details/ProductDetailsBlock'; // ✅ 新增
import { FullwidthSlider } from '@/components/webbuilder/blocks/media/FullwidthSlider';
import { WidthSlider } from '@/components/webbuilder/blocks/media/WidthSlider';
import { Button } from '@/components/webbuilder/blocks/basic/Button';
import { List } from '@/components/webbuilder/blocks/basic/List';
import { DividingLine } from '@/components/webbuilder/blocks/basic/DividingLine';
import { ImageBanner } from '@/components/webbuilder/blocks/media/ImageBanner';
import { Richtext } from '@/components/webbuilder/blocks/Advanced/Richtext';
import { Video } from '@/components/webbuilder/blocks/Advanced/Video';
import { PicwithText } from '@/components/webbuilder/blocks/Advanced/PicwithText';
import { Multicolumn } from '@/components/webbuilder/blocks/Advanced/Multicolumn';
import { Multirow } from '@/components/webbuilder/blocks/Advanced/Multirow';
import { Collapsible } from '@/components/webbuilder/blocks/Advanced/Collapsible';
import { Accordion } from '@/components/webbuilder/blocks/Advanced/Accordion';

// 组件映射表：键名必须与模板 JSON 中的 type 字段完全一致
const componentMap: Record<string, React.ComponentType<any>> = {
  Heading,
  Paragraph,
  Table,
  BlankBlock,
  Section,
  ProductLineBlock,
  ProductCollectionsBlock,
  ProductDetailsBlock, 
  FullwidthSlider,
  WidthSlider, 
  Button,
  List,
  DividingLine,
  ImageBanner,
  Richtext,
  Video,
  PicwithText,
  Multicolumn,
  Multirow,
  Collapsible,
  Accordion
};

interface TemplateRendererProps {
  data: any;
}

export function TemplateRenderer({ data }: TemplateRendererProps) {
  const renderContent = (content: any[], depth = 0): React.ReactNode => {
    if (!content || !Array.isArray(content)) return null;
    return content.map((item, index) => {
      const { type, props } = item;
      const Component = componentMap[type];
      if (!Component) {
        console.warn(`未知组件类型: ${type}`);
        return null;
      }

      let children = null;
      if (data.zones && props.id) {
        const zoneKey = `${props.id}:content`;
        const zoneContent = data.zones[zoneKey];
        if (zoneContent && Array.isArray(zoneContent) && zoneContent.length > 0) {
          children = (
            <div style={{ width: '100%', flex: '1 0 auto' }}>
              {renderContent(zoneContent, depth + 1)}
            </div>
          );
        }
      }

      if (type === 'Section') {
        const { layoutGroup, sizeGroup, spacingGroup, backgroundGroup, borderGroup, ...rest } = props;
        const sectionElement = (
          <Section
            key={props.id || index}
            sizeGroup={sizeGroup}
            spacingGroup={spacingGroup}
            backgroundGroup={backgroundGroup}
            borderGroup={borderGroup}
            direction={layoutGroup?.direction}
            gap={layoutGroup?.gap}
            justifyContent={layoutGroup?.justifyContent}
            alignItems={layoutGroup?.alignItems}
            contentWidth={layoutGroup?.contentWidth}
            customContentWidth={layoutGroup?.customContentWidth}
            {...rest}
          >
            {children}
          </Section>
        );

        // 顶层 Section 自动包裹 container 以与 ProductLineBlock 宽度对齐
        if (depth === 0) {
          return (
            <div key={props.id || index} className="container mx-auto">
              {sectionElement}
            </div>
          );
        }
        return sectionElement;
      }

      if (type === 'ProductLineBlock') {
        return (
          <ProductLineBlock key={props.id || index} {...props}>
            {children}
          </ProductLineBlock>
        );
      }

      return (
        <Component key={props.id || index} {...props}>
          {children}
        </Component>
      );
    });
  };

  return <div style={{ width: '100%' }}>{renderContent(data.content)}</div>;
}