// lib/webbuilder/registry/Multicolumn.config.tsx
import type { ComponentConfig } from '@measured/puck';
import { Multicolumn } from '@/components/webbuilder/blocks/Advanced/Multicolumn';
import { ColorPickerField } from '@/components/webbuilder/fields/ColorPickerField';
import { MulticolumnListField } from '@/components/webbuilder/fields/MulticolumnListField';
import { LanguageSwitcherField } from '@/components/webbuilder/fields/LanguageSwitcherField';
import type { MulticolumnProps } from '@/lib/webbuilder/types';

export const config: ComponentConfig<MulticolumnProps> = {
  label: '多列',
  category: 'Media/Banner',
  defaultProps: {
    languageSwitcher: { label: '', type: 'language-switcher' },
    bannerGroup: {
      bannerType: 'standard',
      backgroundColor: '#ffffff',
      paddingTop: 32,
      paddingBottom: 32,
    },
    // 全局设置字段使用 multicolumn 前缀，与存储数据保持一致
    multicolumnTitle: { zh: '我们的服务', en: 'Our Services', textId: '' },
    multicolumnTitleFontSize: 40,
    multicolumnTitleColor: '#000000',
    multicolumnImageWidth: 'third',
    multicolumnImageShape: 'square',
    multicolumnButtonText: { zh: '了解更多', en: 'Learn More', textId: '' },
    multicolumnButtonFontSize: 16,
    multicolumnButtonColor: '#000000',
    multicolumnButtonLink: '',
    layoutGroup: {
      columnsDesktop: 3,
      columnsAlign: 'center',
      columnsMobile: 1,
      mobileCarousel: false,
    },
    styleGroup: {
      columnBgColor: '#f9fafb',
      columnTitleColor: '#000000',
      columnDescColor: '#666666',
    },
    items: [],
  },
  fields: {
    languageSwitcher: { label: '', type: 'language-switcher' },

    bannerGroup: {
      label: '通栏设置',
      type: 'object',
      objectFields: {
        bannerType: {
          label: '通栏类型',
          type: 'radio',
          options: [
            { label: '标准通栏', value: 'standard' },
            { label: '全屏通栏', value: 'fullwidth' },
          ],
        },
        backgroundColor: {
          label: '通栏背景色',
          type: 'custom',
          render: ({ value, onChange }) => <ColorPickerField field={{}} value={value || '#ffffff'} onChange={onChange} />,
        },
        paddingTop: { label: '顶部填充 (px)', type: 'number', min: 0, max: 100, step: 1 },
        paddingBottom: { label: '底部填充 (px)', type: 'number', min: 0, max: 100, step: 1 },
      },
    },

    // 全局设置：使用扁平字段（不嵌套对象），但通过视觉分组
    // 注意：这些字段直接存储在 props 顶层，而不是在一个 object 里
    // 为了让属性面板有分组效果，我们使用一个 object 包装，但为了兼容旧数据，需要在 defaultProps 和渲染中同时支持两种方式
    // 这里我们保持使用 object 包装，但 key 与存储数据一致：globalSettings 对象内包含这些字段
    // 但根据您的要求，希望字段名统一为 multicolumn*，我们可以在 globalSettings 对象内使用这些名字
    globalSettings: {
      label: '全局设置',
      type: 'object',
      objectFields: {
        multicolumnTitle: { label: '全局标题', type: 'multicolumn-title' },
        multicolumnTitleFontSize: { label: '标题大小 (px)', type: 'number', min: 20, max: 120, step: 1 },
        multicolumnTitleColor: {
          label: '标题颜色',
          type: 'custom',
          render: ({ value, onChange }) => <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />,
        },
        _divider1: { label: '', type: 'custom', render: () => <div className="h-4" /> },
        multicolumnImageWidth: {
          label: '图片宽度',
          type: 'select',
          options: [
            { label: '全列宽', value: 'full' },
            { label: '1/2列宽', value: 'half' },
            { label: '1/3列宽', value: 'third' },
          ],
        },
        multicolumnImageShape: {
          label: '图片比例',
          type: 'select',
          options: [
            { label: '适应图片', value: 'adapt' },
            { label: '纵向', value: 'portrait' },
            { label: '方形', value: 'square' },
            { label: '圆形', value: 'circle' },
          ],
        },
        _divider2: { label: '', type: 'custom', render: () => <div className="h-4" /> },
        multicolumnButtonText: { label: '按钮文字', type: 'multicolumn-button' },
        multicolumnButtonFontSize: { label: '按钮文字大小 (px)', type: 'number', min: 20, max: 120, step: 1 },
        multicolumnButtonColor: {
          label: '按钮颜色',
          type: 'custom',
          render: ({ value, onChange }) => <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />,
        },
        multicolumnButtonLink: { label: '按钮链接', type: 'text' },
      },
    },

    layoutGroup: {
      label: '布局设置',
      type: 'object',
      objectFields: {
        columnsDesktop: { label: '列数 (桌面端)', type: 'number', min: 1, max: 5, step: 1 },
        columnsAlign: {
          label: '列对齐方式',
          type: 'radio',
          options: [
            { label: '左对齐', value: 'left' },
            { label: '居中', value: 'center' },
          ],
        },
        columnsMobile: { label: '列数 (移动端)', type: 'number', min: 1, max: 2, step: 1 },
        mobileCarousel: {
          label: '移动端轮播',
          type: 'radio',
          options: [
            { label: '是', value: true },
            { label: '否', value: false },
          ],
        },
      },
    },

    styleGroup: {
      label: '列样式配色',
      type: 'object',
      objectFields: {
        columnBgColor: {
          label: '列背景色',
          type: 'custom',
          render: ({ value, onChange }) => <ColorPickerField field={{}} value={value || '#f9fafb'} onChange={onChange} />,
        },
        columnTitleColor: {
          label: '列标题颜色',
          type: 'custom',
          render: ({ value, onChange }) => <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />,
        },
        columnDescColor: {
          label: '列描述颜色',
          type: 'custom',
          render: ({ value, onChange }) => <ColorPickerField field={{}} value={value || '#666666'} onChange={onChange} />,
        },
      },
    },

    items: {
      label: '内容列管理',
      type: 'custom',
      render: ({ value, onChange }) => <MulticolumnListField value={value} onChange={onChange} />,
    },
  },
  render: ({ puck, ...props }) => <Multicolumn puck={puck} {...props} />,
};