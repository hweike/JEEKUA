import type { ComponentConfig } from '@measured/puck';
import { Heading } from '@/components/webbuilder/blocks/basic/Heading';
import { DEFAULT_HEADING } from '@/lib/webbuilder/defaults/Heading';
import type { HeadingProps } from '@/lib/webbuilder/types';

export const config: ComponentConfig<HeadingProps> = {
  label: '标题',
  category: 'Basic',
  defaultProps: {
    level: DEFAULT_HEADING.level,
    title: DEFAULT_HEADING.title,
    textAlign: DEFAULT_HEADING.textAlign,
    bold: DEFAULT_HEADING.bold,
    italic: DEFAULT_HEADING.italic,
    underline: DEFAULT_HEADING.underline,
    fontSize: DEFAULT_HEADING.fontSize,
    link: DEFAULT_HEADING.link,
    spacingGroup: { ...DEFAULT_HEADING.spacingGroup },
  },
  fields: {
    title: {
      label: '标题文本',
      type: 'text',
    },
    level: {
      label: '标题级别',
      type: 'select',
      options: [
        { label: 'H1', value: 1 },
        { label: 'H2', value: 2 },
        { label: 'H3', value: 3 },
      ],
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