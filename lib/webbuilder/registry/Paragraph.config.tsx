import type { ComponentConfig } from '@measured/puck';
import { Paragraph } from '@/components/webbuilder/blocks/basic/Paragraph';
import { ParagraphField } from '@/components/webbuilder/fields/ParagraphField';
import { ColorPickerField } from '@/components/webbuilder/fields/ColorPickerField';
import type { ParagraphProps } from '@/lib/webbuilder/types';

export const config: ComponentConfig<ParagraphProps> = {
  label: '段落',
  category: 'Basic',
  defaultProps: {
    text: { zh: '', en: '', textId: '' },
    fontSize: 16,
    textAlign: 'left',
    bold: false,
    italic: false,
    underline: false,
    color: '#333333',
    link: '',
  },
  fields: {
    text: {
      label: '段落文本',
      type: 'custom',
      render: ({ value, onChange }) => <ParagraphField value={value} onChange={onChange} />,
    },
    fontSize: {
      label: '文字大小 (px)',
      type: 'number',
      min: 8,
      max: 80,
      step: 1,
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
    color: {
      label: '文字颜色',
      type: 'custom',
      render: ({ value, onChange }) => (
        <ColorPickerField field={{}} value={value || '#333333'} onChange={onChange} />
      ),
    },
    link: {
      label: '链接地址',
      type: 'text',
    },
  },
  render: ({ puck, ...props }) => <Paragraph puck={puck} {...props} />,
};