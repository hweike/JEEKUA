// lib/webbuilder/template-component-map.ts
import type { Components } from './types';

/**
 * 公共组件：所有模板都能使用
 */
export const COMMON_COMPONENTS: (keyof Components)[] = [
  // ===== 基础内容 =====
  'Heading',
  'Paragraph',
  'Button',
  'List',
  'DividingLine',

  // ===== 布局容器 =====
  'BlankBlock',
  'Section',

  // ===== 媒体与图文 =====
  'ImageBanner',
  'Video',
  'FullwidthSlider',
  'PicwithText',
  'TabbedContentBlock',

  // ===== 高级布局 =====
  'Richtext',
  'Accordion',
  'Collapsible',
  'Multicolumn',
  'Multirow',
  'PricingBlock',
  'ComparisonTableBlock',

  // ===== 通用转化 =====
  'InquiryBlock',

  // ===== 通用展示（跨模板可用） =====
  'ProductShowcaseBlock',
  'ProductCarouselBlock',
  'ProductRankingBlock',
  'ProductCategoriesBlock',
  'BlogPostsBlock',
];

/**
 * 专有组件：按模板类型
 * 
 * 最终可用组件 = COMMON_COMPONENTS + EXCLUSIVE_COMPONENTS[category]
 */
export const EXCLUSIVE_COMPONENTS: Record<string, (keyof Components)[]> = {
  // 通用页面 / 落地页 → 无专有
  page: [],

  // 产品详情
  product: ['ProductDetailsBlock'],

  // 产品合集
  product_category: ['ProductCollectionsBlock'],

  // 产品线
  product_line: ['ProductLineBlock', 'IndustrialProductLineBlock'],

  // 文档
  document: ['DocumentLibraryBlock'],

  // 文档库
  document_library: ['DocumentLibraryBlock'],

  // 博客列表
  blog: ['BlogBlock', 'BlogCollectionBlock'],

  // 博客文章
  blog_post: [],

  // 视频合集
  video_category: ['VideoCategoryBlock'],

  // 视频详情
  video: [],
};

/**
 * 获取指定模板类型的可用组件列表
 */
export function getAvailableComponents(category?: string): (keyof Components)[] {
  if (!category) {
    // 无 category → 只返回公共组件（保守策略）
    return [...COMMON_COMPONENTS];
  }

  const exclusive = EXCLUSIVE_COMPONENTS[category] || [];
  return [...COMMON_COMPONENTS, ...exclusive];
}

/**
 * 判断某组件是否对指定模板可用
 */
export function isComponentAvailable(componentKey: string, category?: string): boolean {
  return getAvailableComponents(category).includes(componentKey as keyof Components);
}