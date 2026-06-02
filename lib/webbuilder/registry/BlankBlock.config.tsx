// lib/webbuilder/registry/BlankBlock.config.tsx
import { BlankBlock } from '@/components/webbuilder/blocks/containers/BlankBlock';
import type { ComponentConfig } from '@puckeditor/core';
import type { Components } from '../types';

export const config: ComponentConfig<Components['BlankBlock']> = {
  label: '1栏布局',
  category: 'Containers/Layout',
  defaultProps: {
    gap: 12,
    padding: 16,
    content: [],
  },
  fields: {
    padding: {
      label: '内边距',
      type: 'select',
      options: [
        { label: '无', value: 0 },
        { label: '小', value: 8 },
        { label: '中', value: 16 },
        { label: '大', value: 24 },
        { label: '特大', value: 32 },
      ],
    },
    gap: {
      label: '垂直间距',
      type: 'select',
      options: [
        { label: '无', value: 0 },
        { label: '小', value: 8 },
        { label: '中', value: 12 },
        { label: '大', value: 16 },
        { label: '特大', value: 24 },
      ],
    },
    content: {
      label: '内容',
      type: 'slot', // 🔥 关键字段类型
    },
  },
  render: ({ puck, content, ...props }) => {
    // 将 puck 和经过 Puck 处理后的 content 组件一并传入
    return <BlankBlock puck={puck} content={content} {...props} />;
  },
};