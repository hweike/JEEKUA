import { WidthSlider } from '@/components/webbuilder/blocks/media/WidthSlider';
import type { ComponentConfig } from '@puckeditor/core';
import type { Components } from '../types';
import { SlideListField } from '@/components/webbuilder/fields/SlideListField';

export const config: ComponentConfig<Components['WidthSlider']> = {
  label: '宽度限定幻灯片',
  defaultProps: {
    height: '550',
    autoplay: 'none',
    images: [],
  },
  fields: {
    height: {
      label: '图片高度',
      type: 'radio',
      options: [
        { label: '550px', value: '550' },
        { label: '650px', value: '650' },
      ],
    },
    autoplay: {
      label: '轮播方式',
      type: 'radio',
      options: [
        { label: '不轮播（手动切换）', value: 'none' },
        { label: '每五秒切换', value: '5s' },
        { label: '每十秒切换', value: '10s' },
      ],
    },
    images: {
      label: '幻灯片',
      type: 'custom',
      render: ({ value, onChange }: { value: any; onChange: any }) => (
        <SlideListField value={value} onChange={onChange} />
      ),
    },
  },
  render: ({ puck, ...props }) => <WidthSlider puck={puck} {...props} />,
};