import { FullwidthSlider } from '@/components/webbuilder/blocks/media/FullwidthSlider';
import type { ComponentConfig } from '@puckeditor/core';
import type { Components } from '../types';

export const config: ComponentConfig<Components['FullwidthSlider']> = {
  label: '全屏通栏幻灯片',
  category: 'Media/Slider',
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
      type: 'slide-list',
    },
  },
  render: ({ puck, ...props }) => <FullwidthSlider puck={puck} {...props} />,
  // 多语言字段声明
  i18nFields: [
    { path: 'images[].title', textIdKey: 'textId', valueKey: 'title' },
    { path: 'images[].subtitle', textIdKey: 'textId', valueKey: 'subtitle' },
    { path: 'images[].buttonText', textIdKey: 'textId', valueKey: 'buttonText' }
  ]
};