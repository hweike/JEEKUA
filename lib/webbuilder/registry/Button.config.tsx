import type { ComponentConfig } from '@measured/puck';
import { Button } from '@/components/webbuilder/blocks/basic/Button';
import { ButtonTextField } from '@/components/webbuilder/fields/ButtonTextField';
import { ColorPickerField } from '@/components/webbuilder/fields/ColorPickerField';
import type { ButtonProps } from '@/lib/webbuilder/types';

export const config: ComponentConfig<ButtonProps> = {
  label: '按钮',
  category: 'Basic',
  defaultProps: {
    text: { zh: '', en: '', textId: '' },
    buttonColor: '#000000',
    textColor: '#ffffff',
    fontSize: 16,
    bold: false,
    italic: false,
    underline: false,
    textAlign: 'center',
    buttonAlign: 'center',
    link: '',
    borderRadius: '0.5rem',   // 默认中圆角
  },
  fields: {
    text: {
      label: '按钮文字',
      type: 'custom',
      render: ({ value, onChange }) => <ButtonTextField value={value} onChange={onChange} />,
    },
    buttonColor: {
      label: '按钮颜色',
      type: 'custom',
      render: ({ value, onChange }) => (
        <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />
      ),
    },
    textColor: {
      label: '文字颜色',
      type: 'custom',
      render: ({ value, onChange }) => (
        <ColorPickerField field={{}} value={value || '#ffffff'} onChange={onChange} />
      ),
    },
    fontSize: {
      label: '文字大小 (px)',
      type: 'number',
      min: 8,
      max: 50,
      step: 1,
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
    textAlign: {
      label: '文字对齐',
      type: 'radio',
      options: [
        { label: '左对齐', value: 'left' },
        { label: '居中', value: 'center' },
        { label: '右对齐', value: 'right' },
      ],
    },
    buttonAlign: {
      label: '按钮对齐',
      type: 'radio',
      options: [
        { label: '左对齐', value: 'left' },
        { label: '居中', value: 'center' },
        { label: '右对齐', value: 'right' },
      ],
    },
    link: {
      label: '链接地址',
      type: 'text',
    },
    borderRadius: {
      label: '圆角',
      type: 'select',
      options: [
        { label: '无', value: '0' },
        { label: '小 (10px)', value: '10px' },
        { label: '中 (15px)', value: '15px' },
        { label: '大 (20px)', value: '20px' },
        { label: '圆形', value: '9999px' },
      ],
    },
  },
  render: ({ puck, ...props }) => <Button puck={puck} {...props} />,
};