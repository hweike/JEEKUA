// lib/webbuilder/registry/BlogBlock.config.tsx
import { BlogBlock } from '@/components/webbuilder/blocks/blog/BlogBlock';
import type { ComponentConfig } from '@puckeditor/core';
import type { Components } from '../types';

export const config: ComponentConfig<Components['BlogBlock']> = {
  label: '博客展示',
  category: 'Blog',
  defaultProps: {
    showSidebar: true,
    postsPerRow: 1,
  },
  fields: {
    showSidebar: {
      label: '显示分类侧边栏',
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
  // 关键修改：确保将所有 props 传递给 BlogBlock
  render: ({ puck, ...props }) => {
    console.log('🔧 Config render props:', props); // 调试
    return <BlogBlock puck={puck} {...props} />;
  },
};