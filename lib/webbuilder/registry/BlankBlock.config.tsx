import { BlankBlock } from '@/components/webbuilder/blocks/containers/BlankBlock';
import type { ComponentConfig } from '@puckeditor/core';
import type { Components } from '../types';

export const config: ComponentConfig<Components['BlankBlock']> = {
  label: '1栏布局',
  // 移除了 category 属性（新版不支持）
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
      type: 'slot', // Puck 的插槽类型
    },
  },
  render: ({ puck, content, ...props }) => {
    // 运行时类型兼容，使用类型断言绕过 TypeScript 检查
    return <BlankBlock puck={puck as any} content={content as any} {...props} />;
  },
};