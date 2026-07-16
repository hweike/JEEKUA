// lib/webbuilder/config.tsx
import type { Config } from '@puckeditor/core';
import type { Components } from './types';
import components from './components.aggregate';
import { customFieldTypes } from './field-types';

if (process.env.NODE_ENV === 'development') {
  console.log('[WebBuilder Config] Registered component keys:', Object.keys(components));
}

export const config: Config<Components> = {
  components: components as any,
  fieldTypes: customFieldTypes,

  categories: {
    layout: {
      components: ['BlankBlock', 'Section'],
      title: '布局容器',
      defaultExpanded: true,
    },
    basic: {
      components: ['Heading', 'Paragraph', 'Button', 'List', 'DividingLine'],
      title: '基础内容',
      defaultExpanded: true,
    },
    media: {
      // 移除了 'WidthSlider'
      components: ['ImageBanner', 'Video', 'FullwidthSlider', 'PicwithText'],
      title: '媒体与图文',
      defaultExpanded: true,
    },
    advanced: {
      components: ['Richtext', 'Accordion', 'Collapsible', 'Multicolumn', 'Multirow'],
      title: '高级布局',
      defaultExpanded: false,
    },
    product: {
      components: [
        'ProductLineBlock',
        'ProductCollectionsBlock',
        'ProductDetailsBlock',
        'DocumentLibraryBlock',
        'BlogBlock',
        'BlogCollectionBlock',
        'VideoCategoryBlock',
      ],
      title: '产品与内容',
      defaultExpanded: false,
    },
    other: {
      title: '其他',
      visible: false,
    },
  },
};

export default config;