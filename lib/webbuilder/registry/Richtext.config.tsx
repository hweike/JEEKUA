import type { ComponentConfig } from '@measured/puck';
import { Richtext } from '@/components/webbuilder/blocks/Advanced/Richtext';
import { ColorPickerField } from '@/components/webbuilder/fields/ColorPickerField';
import { RichtextTextField } from '@/components/webbuilder/fields/RichtextTextField';
import { LanguageSwitcherField } from '@/components/webbuilder/fields/LanguageSwitcherField';
import type { RichtextProps } from '@/lib/webbuilder/types';

export const config: ComponentConfig<RichtextProps> = {
  label: '富文本横幅',
  category: 'Media/Banner',
  defaultProps: {
    bannerType: 'standard',
    title: { zh: '标题', en: 'Title', textId: '' },
    titleFontSize: 48,
    titleColor: '#000000',
    text: { zh: '文本内容', en: 'Text content', textId: '' },
    textFontSize: 24,
    textColor: '#000000',
    button1Text: { zh: '按钮', en: 'Button', textId: '' },
    button1Color: '#000000',
    button1Link: '',
    button2Text: { zh: '按钮', en: 'Button', textId: '' },
    button2Color: '#000000',
    button2Link: '',
    backgroundColor: '#ffffff',      // 新增背景色默认值
    contentPosition: 'center',
    textAlign: 'center',
    containerPaddingTop: 32,
    containerPaddingBottom: 32,
  },
  fields: {
    bannerType: {
      label: '通栏类型',
      type: 'radio',
      options: [
        { label: '标准通栏', value: 'standard' },
        { label: '全屏通栏', value: 'fullwidth' },
      ],
    },
    languageSwitcher: {
      label: '',
      type: 'language-switcher',
    },
    // 新增背景色字段
    backgroundColor: {
      label: '背景色',
      type: 'custom',
      render: ({ value, onChange }) => <ColorPickerField field={{}} value={value || '#ffffff'} onChange={onChange} />,
    },
    title: { label: '标题', type: 'richtext-title' },
    titleFontSize: { label: '标题大小 (px)', type: 'number', min: 20, max: 120, step: 1 },
    titleColor: {
      label: '标题颜色',
      type: 'custom',
      render: ({ value, onChange }) => <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />,
    },
    text: { label: '文本', type: 'richtext-text' },
    textFontSize: { label: '文本大小 (px)', type: 'number', min: 20, max: 120, step: 1 },
    textColor: {
      label: '文本颜色',
      type: 'custom',
      render: ({ value, onChange }) => <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />,
    },
    button1Text: { label: '按钮 1 文字', type: 'richtext-button1' },
    button1Color: {
      label: '按钮 1 颜色',
      type: 'custom',
      render: ({ value, onChange }) => <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />,
    },
    button1Link: { label: '按钮 1 链接', type: 'text' },
    button2Text: { label: '按钮 2 文字', type: 'richtext-button2' },
    button2Color: {
      label: '按钮 2 颜色',
      type: 'custom',
      render: ({ value, onChange }) => <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />,
    },
    button2Link: { label: '按钮 2 链接', type: 'text' },
    contentPosition: {
      label: '内容位置',
      type: 'select',
      options: [
        { label: '左', value: 'left' },
        { label: '中', value: 'center' },
        { label: '右', value: 'right' },
      ],
    },
    textAlign: {
      label: '对齐方式',
      type: 'radio',
      options: [
        { label: '左', value: 'left' },
        { label: '中', value: 'center' },
        { label: '右', value: 'right' },
      ],
    },
    containerPaddingTop: {
      label: '顶部填充 (px)',
      type: 'number',
      min: 0,
      max: 100,
      step: 1,
    },
    containerPaddingBottom: {
      label: '底部填充 (px)',
      type: 'number',
      min: 0,
      max: 100,
      step: 1,
    },
  },
  render: ({ puck, ...props }) => <Richtext puck={puck} {...props} />,
};