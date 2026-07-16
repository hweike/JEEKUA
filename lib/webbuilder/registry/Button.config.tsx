// lib/webbuilder/registry/Button.config.tsx

import type { ComponentConfig } from '@measured/puck';
import { Button } from '@/components/webbuilder/blocks/basic/Button';
import { ColorPickerField } from '@/components/webbuilder/fields/ColorPickerField';
import { DEFAULT_BUTTON } from '@/lib/webbuilder/defaults/Button';
import type { ButtonProps } from '@/lib/webbuilder/types';

export const config: ComponentConfig<ButtonProps> = {
  label: '按钮',
  category: 'Basic',
  defaultProps: {
    text: DEFAULT_BUTTON.text,
    buttonColor: DEFAULT_BUTTON.buttonColor,
    textColor: DEFAULT_BUTTON.textColor,
    fontSize: DEFAULT_BUTTON.fontSize,
    bold: DEFAULT_BUTTON.bold,
    italic: DEFAULT_BUTTON.italic,
    underline: DEFAULT_BUTTON.underline,
    // textAlign 在 defaultProps 中保留或移除均可，不影响属性面板
    textAlign: DEFAULT_BUTTON.textAlign,  // 可保留，也可删除
    buttonAlign: DEFAULT_BUTTON.buttonAlign,
    link: DEFAULT_BUTTON.link,
    borderRadius: DEFAULT_BUTTON.borderRadius,
    paddingX: DEFAULT_BUTTON.paddingX,
    paddingY: DEFAULT_BUTTON.paddingY,
    spacingGroup: { ...DEFAULT_BUTTON.spacingGroup },
  },
  fields: {
    text: { label: '按钮文字', type: 'text' },
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
    // ✅ 移除 textAlign 字段（属性面板不再显示）
    // textAlign: { ... },
    buttonAlign: {
      label: '按钮对齐',
      type: 'radio',
      options: [
        { label: '左对齐', value: 'left' },
        { label: '居中', value: 'center' },
        { label: '右对齐', value: 'right' },
      ],
    },
    link: { label: '链接地址', type: 'text' },
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
    paddingX: { label: '左右边距 (px)', type: 'number', min: 0, max: 200, step: 1 },
    paddingY: { label: '上下边距 (px)', type: 'number', min: 0, max: 100, step: 1 },
  },
  render: ({ puck, ...props }) => <Button puck={puck} {...props} />,
};