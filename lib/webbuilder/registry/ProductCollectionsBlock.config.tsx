import { ProductCollectionsBlock } from '@/components/webbuilder/blocks/product-collections/ProductCollectionsBlock';
import type { ComponentConfig } from '@puckeditor/core';
import type { Components } from '../types';

export const config: ComponentConfig<Components['ProductCollectionsBlock']> = {
  label: '产品集合展示',
  category: 'Product',
  defaultProps: {
    productsPerRow: 3,
  },
  fields: {
    productsPerRow: {
      label: '每行产品数',
      type: 'number',
      min: 1,
      max: 4,
      suffix: '个',
    },
  },
  render: ({ puck, ...props }) => <ProductCollectionsBlock puck={puck} {...props} />,
};