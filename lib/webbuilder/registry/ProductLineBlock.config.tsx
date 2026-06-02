// lib/webbuilder/registry/ProductLineBlock.config.tsx
import { ProductLineBlock } from '@/components/webbuilder/blocks/product-line/ProductLineBlock';
import type { ComponentConfig } from '@puckeditor/core';
import type { Components } from '../types';

export const config: ComponentConfig<Components['ProductLineBlock']> = {
  label: '产品线展示',
  category: 'Product',
  defaultProps: {
    showSidebar: true,
    productsPerRow: 3,
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
    productsPerRow: {
      label: '每行产品数',
      type: 'number',
      min: 1,
      max: 4,
      suffix: '个',
    },
  },
  render: ({ puck, ...props }) => <ProductLineBlock puck={puck} {...props} />,
};