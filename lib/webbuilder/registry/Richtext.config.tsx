import type { ComponentConfig } from '@measured/puck';
import { Richtext } from '@/components/webbuilder/blocks/Advanced/Richtext';
import { ColorPickerField } from '@/components/webbuilder/fields/ColorPickerField';
import { DEFAULT_RICHTEXT } from '@/lib/webbuilder/defaults/Richtext';
import type { RichtextProps } from '@/lib/webbuilder/types';

export const config: ComponentConfig<RichtextProps> = {
  label: '富文本横幅',
  category: 'Media/Banner',
  defaultProps: {
    bannerType: DEFAULT_RICHTEXT.bannerType,
    backgroundColor: DEFAULT_RICHTEXT.backgroundColor,
    titleGroup: { ...DEFAULT_RICHTEXT.titleGroup },
    textGroup: { ...DEFAULT_RICHTEXT.textGroup },
    button1Group: { ...DEFAULT_RICHTEXT.button1Group },
    button2Group: { ...DEFAULT_RICHTEXT.button2Group },
    buttonStyleGroup: { ...DEFAULT_RICHTEXT.buttonStyleGroup },
    layoutGroup: { ...DEFAULT_RICHTEXT.layoutGroup },
    paddingGroup: { ...DEFAULT_RICHTEXT.paddingGroup },
    spacingGroup: { ...DEFAULT_RICHTEXT.spacingGroup },
  },
  fields: {
    // ===== 通栏设置（顶层） =====
    bannerType: {
      label: '通栏类型',
      type: 'radio',
      options: [
        { label: '标准通栏', value: 'standard' },
        { label: '全屏通栏', value: 'fullwidth' },
      ],
    },
    backgroundColor: {
      label: '背景色',
      type: 'custom',
      render: ({ value, onChange }) => (
        <ColorPickerField field={{}} value={value || '#ffffff'} onChange={onChange} />
      ),
    },

    // ===== 标题设置（大分组） =====
    titleGroup: {
      type: 'object',
      label: '标题设置',
      objectFields: {
        title: { label: '标题', type: 'text' },
        titleFontSize: { label: '标题大小 (px)', type: 'number', min: 8, max: 200, step: 1 },
        titleColor: {
          label: '标题颜色',
          type: 'custom',
          render: ({ value, onChange }) => (
            <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />
          ),
        },
      },
    },

    // ===== 文本设置（大分组） =====
    textGroup: {
      type: 'object',
      label: '文本设置',
      objectFields: {
        text: { label: '文本', type: 'textarea' },
        textFontSize: { label: '文本大小 (px)', type: 'number', min: 8, max: 200, step: 1 },
        textColor: {
          label: '文本颜色',
          type: 'custom',
          render: ({ value, onChange }) => (
            <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />
          ),
        },
      },
    },

    // ===== 按钮1 设置（大分组） =====
    button1Group: {
      type: 'object',
      label: '按钮 1 设置',
      objectFields: {
        button1Text: { label: '按钮 1 文字', type: 'text' },
        button1FontSize: { label: '按钮 1 字体大小 (px)', type: 'number', min: 8, max: 200, step: 1 },
        _sep1: {
          label: '',
          type: 'custom',
          render: () => <div className="h-2 border-b border-gray-200 my-2" />,
        },
        button1Color: {
          label: '按钮 1 颜色',
          type: 'custom',
          render: ({ value, onChange }) => (
            <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />
          ),
        },
        button1Link: { label: '按钮 1 链接', type: 'text' },
      },
    },

    // ===== 按钮2 设置（大分组） =====
    button2Group: {
      type: 'object',
      label: '按钮 2 设置',
      objectFields: {
        button2Text: { label: '按钮 2 文字', type: 'text' },
        button2FontSize: { label: '按钮 2 字体大小 (px)', type: 'number', min: 8, max: 200, step: 1 },
        _sep2: {
          label: '',
          type: 'custom',
          render: () => <div className="h-2 border-b border-gray-200 my-2" />,
        },
        button2Color: {
          label: '按钮 2 颜色',
          type: 'custom',
          render: ({ value, onChange }) => (
            <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />
          ),
        },
        button2Link: { label: '按钮 2 链接', type: 'text' },
      },
    },

    // ===== 按钮样式（大分组） =====
    buttonStyleGroup: {
      type: 'object',
      label: '按钮样式',
      objectFields: {
        buttonPaddingX: { label: '按钮水平内边距 (px)', type: 'number', min: 0, max: 100, step: 1 },
        buttonPaddingY: { label: '按钮垂直内边距 (px)', type: 'number', min: 0, max: 50, step: 1 },
        buttonBorderRadius: { label: '按钮圆角 (px)', type: 'number', min: 0, max: 50, step: 1 },
      },
    },

    // ===== 布局设置（大分组） =====
    layoutGroup: {
      type: 'object',
      label: '布局设置',
      objectFields: {
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
      },
    },

    // ===== 填充设置（大分组） =====
    paddingGroup: {
      type: 'object',
      label: '填充设置',
      objectFields: {
        containerPaddingTop: { label: '顶部填充 (px)', type: 'number', min: 0, max: 100, step: 1 },
        containerPaddingBottom: { label: '底部填充 (px)', type: 'number', min: 0, max: 100, step: 1 },
      },
    },

    // ===== 间距设置（大分组） =====
    spacingGroup: {
      type: 'object',
      label: '间距设置',
      objectFields: {
        titleMarginBottom: { label: '标题底部间距 (px)', type: 'number', min: 0, max: 100, step: 1 },
        textMarginBottom: { label: '文本底部间距 (px)', type: 'number', min: 0, max: 100, step: 1 },
        buttonGap: { label: '按钮间距 (px)', type: 'number', min: 0, max: 50, step: 1 },
        mobileScaleFactor: { label: '移动端缩放比例', type: 'number', min: 0.1, max: 1, step: 0.05 },
      },
    },
  },
  render: ({ puck, ...props }) => {
    // 直接透传所有分组，组件内部从分组读取
    return <Richtext puck={puck} {...props} />;
  },
};