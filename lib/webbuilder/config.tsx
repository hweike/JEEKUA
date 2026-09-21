// lib/webbuilder/config.tsx
import type { Config } from '@puckeditor/core';
import { NextIntlClientProvider } from 'next-intl';
import zhMessages from '@/messages/zh.json';
import type { Components } from './types';
import components from './components.aggregate';
import { customFieldTypes } from './field-types';
import { getAvailableComponents } from './template-component-map';

if (process.env.NODE_ENV === 'development') {
  console.log('[WebBuilder Config] Registered component keys:', Object.keys(components));
}

// ✅ 只取组件用到的 namespace
const editorMessages = {
  Components: (zhMessages as any).Components,
  Shared: (zhMessages as any).Shared,
  Inquiry: (zhMessages as any).Inquiry,
  Blog: (zhMessages as any).Blog,
};

/**
 * 基础分类定义（所有分类默认展开）
 */
const BASE_CATEGORIES = {
  layout: {
    components: ['BlankBlock', 'Section'],
    title: '布局容器',
    defaultExpanded: false,
  },
  basic: {
    components: ['Heading', 'Paragraph', 'Button', 'List', 'DividingLine'],
    title: '基础内容',
    defaultExpanded: true,
  },
  media: {
    components: ['ImageBanner', 'Video', 'FullwidthSlider', 'PicwithText', 'TabbedContentBlock'],
    title: '媒体与图文',
    defaultExpanded: true,
  },
  advanced: {
    components: [
      'Richtext',
      'Accordion',
      'Collapsible',
      'Multicolumn',
      'Multirow',
      'PricingBlock',
      'ComparisonTableBlock',
    ],
    title: '高级布局',
    defaultExpanded: true,
  },
  product: {
    components: [
      'ProductLineBlock',
      'IndustrialProductLineBlock',
      'ProductCollectionsBlock',
      'ProductDetailsBlock',
      'DocumentLibraryBlock',
      'BlogBlock',
      'BlogCollectionBlock',
      'VideoCategoryBlock',
      'InquiryBlock',
      'ProductShowcaseBlock',
      'ProductCarouselBlock',
      'ProductRankingBlock',
      'ProductCategoriesBlock',
      'BlogPostsBlock',
    ],
    title: '产品与内容',
    defaultExpanded: true,
  },
  other: {
    title: '其他',
    visible: false,
  },
};

/**
 * 根据模板类型过滤组件
 */
function filterComponents(category?: string): Record<string, any> {
  const availableKeys = getAvailableComponents(category);
  const keySet = new Set<string>(availableKeys as string[]);

  const filtered: Record<string, any> = {};
  for (const [key, value] of Object.entries(components)) {
    if (keySet.has(key)) {
      filtered[key] = value;
    }
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(
      `[WebBuilder Config] category=${category || '(all)'}, available components:`,
      Object.keys(filtered)
    );
  }

  return filtered;
}

/**
 * 根据过滤后的组件，过滤分类
 */
function filterCategories(filteredComponentKeys: string[]): Record<string, any> {
  const keySet = new Set(filteredComponentKeys);

  const filteredCategories: Record<string, any> = {};
  for (const [catKey, cat] of Object.entries(BASE_CATEGORIES)) {
    const allowedComponents = ((cat as any).components || []).filter(
      (c: string) => keySet.has(c)
    );

    // 有组件 或 是"其他"特殊分类 → 保留
    if (allowedComponents.length > 0 || catKey === 'other') {
      filteredCategories[catKey] = {
        ...cat,
        components: allowedComponents,
      };
    }
  }

  return filteredCategories;
}

/**
 * 创建 Puck Config（根据模板类型）
 */
export function createConfig(category?: string): Config<Components> {
  const filteredComponents = filterComponents(category);
  const filteredCategories = filterCategories(Object.keys(filteredComponents));

  const config: Config<Components> = {
    components: filteredComponents as any,
    fieldTypes: customFieldTypes,
    categories: filteredCategories as any,
    root: {
      render: ({ children }) => (
        <NextIntlClientProvider locale="zh" messages={editorMessages}>
          {children}
        </NextIntlClientProvider>
      ),
    },
  };

  return config;
}

// ✅ 默认导出（不传 category → 只显示公共组件）
export const config = createConfig();

export default config;