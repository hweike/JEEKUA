import { DividingLine } from '@/components/webbuilder/blocks/basic/DividingLine';
import type { ComponentConfig } from '@puckeditor/core';
import type { Components } from '../types';
import { ColorPickerField } from '@/components/webbuilder/fields/ColorPickerField';

export const config: ComponentConfig<Components['DividingLine']> = {
  label: '分割线',
  category: 'Basic',
  defaultProps: {
    lineType: 'solid',
    thickness: 2,
    color: '#e5e7eb',   // tailwind gray-200
  },
  fields: {
    lineType: {
        label: '线条样式',
        type: 'radio',
        options: [
          { label: '实线', value: 'solid' },
          { label: '虚线', value: 'dashed' },
          { label: '点线', value: 'dotted' },
          { label: '双实线', value: 'double' },
        ],
      },
    thickness: {
      label: '线条粗细 (px)',
      type: 'number',
      min: 1,
      max: 20,
      suffix: 'px',
    },
    color: {
      label: '线条颜色',
      type: 'color-picker',
    },
  },
  render: ({ puck, ...props }) => <DividingLine puck={puck} {...props} />,
};