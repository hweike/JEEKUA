import type { ComponentConfig } from '@measured/puck';
import { DividingLine } from '@/components/webbuilder/blocks/basic/DividingLine';
import { ColorPickerField } from '@/components/webbuilder/fields/ColorPickerField';
import { DEFAULT_DIVIDING_LINE } from '@/lib/webbuilder/defaults/DividingLine';
import type { DividingLineProps } from '@/lib/webbuilder/types';

export const config: ComponentConfig<DividingLineProps> = {
  label: '分割线',
  category: 'Basic',
  defaultProps: {
    lineType: DEFAULT_DIVIDING_LINE.lineType,
    thickness: DEFAULT_DIVIDING_LINE.thickness,
    color: DEFAULT_DIVIDING_LINE.color,
    widthType: DEFAULT_DIVIDING_LINE.widthType,
    align: DEFAULT_DIVIDING_LINE.align,
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
      step: 1,
    },
    color: {
      label: '线条颜色',
      type: 'custom',
      render: ({ value, onChange }) => (
        <ColorPickerField field={{}} value={value || '#e5e7eb'} onChange={onChange} />
      ),
    },
    widthType: {
      label: '长度',
      type: 'select',
      options: [
        { label: '全宽', value: 'full' },
        { label: '90% 宽', value: '90' },
        { label: '80% 宽', value: '80' },
        { label: '50% 宽', value: '50' },
      ],
    },
    align: {
      label: '对齐方式',
      type: 'radio',
      options: [
        { label: '居左', value: 'left' },
        { label: '居中', value: 'center' },
        { label: '居右', value: 'right' },
      ],
    },
  },
  render: ({ puck, ...props }) => <DividingLine puck={puck} {...props} />,
};