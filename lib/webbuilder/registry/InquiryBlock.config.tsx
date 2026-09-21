import { InquiryBlock } from '@/components/webbuilder/blocks/inquiry/InquiryBlock';
import type { ComponentConfig } from '@puckeditor/core';
import type { Components } from '../types';

export const config: ComponentConfig<Components['InquiryBlock']> = {
  label: '询盘表单',
  category: 'product',  // 与 config.tsx 中 product 分类对应
  defaultProps: {},
  fields: {},
  render: ({ puck, ...props }) => <InquiryBlock puck={puck} {...props} />,
};