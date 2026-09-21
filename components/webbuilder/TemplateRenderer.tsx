'use client';

import React, { useMemo, memo } from 'react';
import { Heading } from '@/components/webbuilder/blocks/basic/Heading';
import { Paragraph } from '@/components/webbuilder/blocks/basic/Paragraph';
import { BlankBlock } from '@/components/webbuilder/blocks/containers/BlankBlock';
import { Section } from '@/components/webbuilder/blocks/containers/Section';
import { ProductLineBlock } from '@/components/webbuilder/blocks/product-line/ProductLineBlock';
import { ProductCollectionsBlock } from '@/components/webbuilder/blocks/product-collections/ProductCollectionsBlock';
import { ProductDetailsBlock } from '@/components/webbuilder/blocks/product-details/ProductDetailsBlock';
import { FullwidthSlider } from '@/components/webbuilder/blocks/media/FullwidthSlider';
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
import { BlogBlock } from '@/components/webbuilder/blocks/blog/BlogBlock';
import { BlogCollectionBlock } from '@/components/webbuilder/blocks/blog-collection/BlogCollectionBlock';
import { DocumentLibraryBlock } from '@/components/webbuilder/blocks/document-library/DocumentLibraryBlock';
import { VideoCategoryBlock } from '@/components/webbuilder/blocks/video-category/VideoCategoryBlock';
import { IndustrialProductLineBlock } from '@/components/webbuilder/blocks/product-line/IndustrialProductLineBlock';
import { InquiryBlock } from '@/components/webbuilder/blocks/inquiry/InquiryBlock';
import { PricingBlock } from '@/components/webbuilder/blocks/pricing/PricingBlock';
import { ComparisonTableBlock } from '@/components/webbuilder/blocks/comparison-table/ComparisonTableBlock';
import { TabbedContentBlock } from '@/components/webbuilder/blocks/tabbed-content/TabbedContentBlock';
import { ProductShowcaseBlock } from '@/components/webbuilder/blocks/product-showcase/ProductShowcaseBlock';
import { ProductCarouselBlock } from '@/components/webbuilder/blocks/product-carousel/ProductCarouselBlock';
import { ProductRankingBlock } from '@/components/webbuilder/blocks/product-ranking/ProductRankingBlock';
import { ProductCategoriesBlock } from '@/components/webbuilder/blocks/product-categories/ProductCategoriesBlock';
import { BlogPostsBlock } from '@/components/webbuilder/blocks/blog-posts/BlogPostsBlock';

// 组件映射表（所有组件均使用命名导出）
const componentMap: Record<string, React.ComponentType<any>> = {
  Heading,
  Paragraph,
  BlankBlock,
  Section,
  ProductLineBlock,
  ProductCollectionsBlock,
  ProductDetailsBlock,
  FullwidthSlider,
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
  Accordion,
  BlogBlock,
  BlogCollectionBlock,
  DocumentLibraryBlock,
  VideoCategoryBlock,
  IndustrialProductLineBlock,
  InquiryBlock,
  PricingBlock,
  ComparisonTableBlock,
  TabbedContentBlock,
  ProductShowcaseBlock,
  ProductCarouselBlock,
  ProductRankingBlock,
  ProductCategoriesBlock,
  BlogPostsBlock, 
  
};

// ✅ 需要从 runtime 注入 locale 的组件名单（模块级常量，只创建一次）
const NEEDS_LOCALE = [
  'ProductShowcaseBlock',
  'ProductCarouselBlock',
  // 未来新增的产品类组件也加进来
  // 'ProductRanking',
  // 'ProductMasonry',
  // 'ProductCategories',
  // 其他依赖 locale 的组件
  'ProductLineBlock',
  'ProductCollectionsBlock',
  'ProductDetailsBlock',
  'IndustrialProductLineBlock',
  'BlogBlock',
  'BlogCollectionBlock',
  'BlogPostsBlock',  
  'VideoCategoryBlock',
  'DocumentLibraryBlock',
  'ProductRankingBlock',
  'ProductCategoriesBlock',
] as const;

interface TemplateRendererProps {
  data: any;
  runtime?: {
    seoTitle?: string;
    locale?: string;
    texts?: Record<string, string>;
  };
}

// 内部渲染函数（使用 memo 缓存每个节点的渲染结果）
const RenderContent = memo(function RenderContent({
  content,
  zones,
  runtime,
  depth = 0,
}: {
  content: any[];
  zones?: any;
  runtime?: any;
  depth?: number;
}) {
  return (
    <>
      {content.map((item, index) => {
        const { type, props } = item;
        const Component = componentMap[type];
        if (!Component) {
          console.warn(`未知组件类型: ${type}`);
          return null;
        }

        // 处理 zones（插槽内容）
        let children = null;
        if (zones && props.id) {
          const zoneKey = `${props.id}:content`;
          const zoneContent = zones[zoneKey];
          if (zoneContent && Array.isArray(zoneContent) && zoneContent.length > 0) {
            children = (
              <div style={{ width: '100%', flex: '1 0 auto' }}>
                <RenderContent
                  content={zoneContent}
                  zones={zones}
                  runtime={runtime}
                  depth={depth + 1}
                />
              </div>
            );
          }
        }

        // ✅ 如果组件需要 locale 且 props 里没有，从 runtime 注入
        const localeOverride =
          (NEEDS_LOCALE as readonly string[]).includes(type) && props.locale === undefined
            ? { locale: runtime?.locale ?? 'zh' }
            : {};

        const componentProps = {
          ...props,
          ...localeOverride,
          __runtime: runtime,
        };

        // Section 特殊处理
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
              __runtime={runtime}
            >
              {children}
            </Section>
          );

          // 顶层 Section 自动包裹 container
          if (depth === 0) {
            return (
              <div key={props.id || index} className="container mx-auto">
                {sectionElement}
              </div>
            );
          }
          return sectionElement;
        }

        // 普通组件
        return (
          <Component key={props.id || index} {...componentProps}>
            {children}
          </Component>
        );
      })}
    </>
  );
});

// 主渲染器（使用 memo 缓存整体结果）
export const TemplateRenderer = memo(function TemplateRenderer({
  data,
  runtime,
}: TemplateRendererProps) {
  const renderedContent = useMemo(() => {
    if (!data?.content || !Array.isArray(data.content)) return null;
    return (
      <RenderContent
        content={data.content}
        zones={data.zones}
        runtime={runtime}
        depth={0}
      />
    );
  }, [data, runtime]);

  return <div style={{ width: '100%' }}>{renderedContent}</div>;
});