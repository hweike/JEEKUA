import { ProductDetailsBlock } from '@/components/webbuilder/blocks/product-details/ProductDetailsBlock';
import type { ComponentConfig } from '@puckeditor/core';
import type { Components } from '../types';

export const config: ComponentConfig<Components['ProductDetailsBlock']> = {
  label: '产品详情展示',
  category: 'Product',
  defaultProps: {
    layout: 'left-right',
    imageSize: 'medium',
  },
  fields: {
    layout: {
      label: '布局方向',
      type: 'radio',
      options: [
        { label: '左右布局', value: 'left-right' },
        { label: '上下布局', value: 'top-bottom' },
      ],
    },
    imageSize: {
      label: '图片尺寸',
      type: 'radio',
      options: [
        { label: '小', value: 'small' },
        { label: '中', value: 'medium' },
        { label: '大', value: 'large' },
      ],
    },
  },
  render: ({ puck, ...props }) => <ProductDetailsBlock puck={puck} {...props} />,
};