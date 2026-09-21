import type { ComponentConfig } from '@measured/puck';
import { Heading } from '@/components/webbuilder/blocks/basic/Heading';
import { ColorPickerField } from '@/components/webbuilder/fields/ColorPickerField';
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
    link: DEFAULT_HEADING.link,
    color: DEFAULT_HEADING.color,
    fontSize: DEFAULT_HEADING.fontSize,
    spacingGroup: { ...DEFAULT_HEADING.spacingGroup },
  },
  fields: {
    level: {
      label: '标题级别',
      type: 'select',
      options: [
        { label: '标题 1 (H1)', value: 1 },
        { label: '标题 2 (H2)', value: 2 },
        { label: '标题 3 (H3)', value: 3 },
        { label: '标题 4 (H4)', value: 4 },
        { label: '标题 5 (H5)', value: 5 },
        { label: '标题 6 (H6)', value: 6 },
      ],
    },
    title: {
      label: '标题文本',
      type: 'text',
    },
    fontSize: {
      label: '字号',
      type: 'select',
      options: [
        { label: '小 (sm)', value: 'sm' },
        { label: '基础 (base)', value: 'base' },
        { label: '大 (lg)', value: 'lg' },
        { label: '特大 (xl)', value: 'xl' },
        { label: '2 倍 (2xl)', value: '2xl' },
        { label: '3 倍 (3xl)', value: '3xl' },
        { label: '4 倍 (4xl)', value: '4xl' },
        { label: '5 倍 (5xl)', value: '5xl' },
      ],
    },
    textAlign: {
      label: '对齐方式',
      type: 'radio',
      options: [
        { label: '左对齐', value: 'left' },
        { label: '居中', value: 'center' },
        { label: '右对齐', value: 'right' },
      ],
    },
    color: {
      label: '文字颜色',
      type: 'custom',
      render: ({ value, onChange }) => (
        <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />
      ),
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
    link: {
      label: '链接地址',
      type: 'text',
    },
  },
  render: ({ puck, ...props }) => <Heading puck={puck} {...props} />,
};