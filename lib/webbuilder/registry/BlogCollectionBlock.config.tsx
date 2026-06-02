import { BlogCollectionBlock } from '@/components/webbuilder/blocks/blog-collection/BlogCollectionBlock';
import type { ComponentConfig } from '@puckeditor/core';
import type { Components } from '../types';

export const config: ComponentConfig<Components['BlogCollectionBlock']> = {
  label: '博客分类文章列表',
  category: 'Blog',
  defaultProps: {
    showSidebar: false,
    postsPerRow: 1,
  },
  fields: {
    showSidebar: {
      label: '显示侧边栏',
      type: 'radio',
      options: [
        { label: '是', value: true },
        { label: '否', value: false },
      ],
    },
    postsPerRow: {
      label: '每行文章数',
      type: 'number',
      min: 1,
      max: 3,
      suffix: '列',
    },
  },
  render: ({ puck, ...props }) => <BlogCollectionBlock puck={puck} {...props} />,
};