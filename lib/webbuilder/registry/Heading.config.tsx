import { Heading } from '@/components/webbuilder/blocks/basic/Heading';
import { HeadingTextField } from '@/components/webbuilder/fields/HeadingTextField';
import type { ComponentConfig } from '@puckeditor/core';
import type { Components } from '../types';
import { nanoid } from 'nanoid';

export const config: ComponentConfig<Components['Heading']> = {
  label: '标题',
  category: 'Basic',
  defaultProps: {
    level: 1,
    title: { zh: '', en: '', textId: nanoid() },   // 生成初始 textId
    textAlign: 'left',
    bold: false,
    italic: false,
    underline: false,
    fontSize: '2xl',
  },
  fields: {
   
    title: {
      label: '标题文本',
      type: 'heading-text',  // 自定义字段类型
    },
    textAlign: {
      label: '文本对齐',
      type: 'radio',
      options: [
        { label: '左对齐', value: 'left' },
        { label: '居中', value: 'center' },
        { label: '右对齐', value: 'right' },
      ],
    },
    bold: {
      label: '加粗',
      type: 'radio',
      options: [
        { label: '是', value: true },
        { label: '否', value: false },
      ],
    },
    italic: {
      label: '斜体',
      type: 'radio',
      options: [
        { label: '是', value: true },
        { label: '否', value: false },
      ],
    },
    underline: {
      label: '下划线',
      type: 'radio',
      options: [
        { label: '是', value: true },
        { label: '否', value: false },
      ],
    },
    fontSize: {
      label: '标题大小',
      type: 'select',
      options: [
        { label: '小', value: 'sm' },
        { label: '中', value: 'base' },
        { label: '大', value: 'lg' },
        { label: '特大', value: 'xl' },
        { label: '特大号', value: '2xl' },
        { label: '3xl', value: '3xl' },
        { label: '4xl', value: '4xl' },
        { label: '5xl', value: '5xl' },
      ],
    },
    link: {
      label: '链接地址',
      type: 'text',
    },
  },

  render: ({ puck, ...props }) => <Heading puck={puck} {...props} />,
};