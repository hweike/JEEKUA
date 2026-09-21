import type { ComponentConfig } from '@measured/puck';
import { IndustrialProductLineBlock } from '@/components/webbuilder/blocks/product-line/IndustrialProductLineBlock';
import type { IndustrialProductLineBlockProps } from '@/components/webbuilder/blocks/product-line/IndustrialProductLineBlock';

export const config: ComponentConfig<IndustrialProductLineBlockProps> = {
  label: '工业品产品线落地页（表格）',
  category: 'Product',
  defaultProps: {
    showSidebar: true,
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
  },
  render: ({ puck, ...props }) => (
    <IndustrialProductLineBlock puck={puck} {...props} /> // ✅ 传递 puck
  ),
};