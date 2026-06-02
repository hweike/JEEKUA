import type { ComponentConfig } from '@measured/puck';
import { Collapsible } from '@/components/webbuilder/blocks/Advanced/Collapsible';
import { ColorPickerField } from '@/components/webbuilder/fields/ColorPickerField';
import { CollapsibleListField } from '@/components/webbuilder/fields/CollapsibleListField';
import { LanguageSwitcherField } from '@/components/webbuilder/fields/LanguageSwitcherField';
import ImageUpload from '@/components/ImageUpload';  // ✅ 补充导入
import type { CollapsibleProps } from '@/lib/webbuilder/types';

export const config: ComponentConfig<CollapsibleProps> = {
  label: '可折叠',
  category: 'Media/Banner',
  defaultProps: {
    bannerType: 'standard',
    backgroundColor: '#ffffff',
    globalTitle: { zh: '常见问题', en: 'FAQ', textId: '' },
    globalTitleFontSize: 40,
    globalTitleColor: '#000000',
    globalTitleAlign: 'center',
    imageUrl: '',
    imageRatio: 'adapt',
    imagePlacement: 'left',
    rowTitleColor: '#000000',
    rowTitleFontSize: 18,
    rowContentColor: '#666666',
    rowContentFontSize: 16,
    containerType: 'none',
    containerBgColor: 'transparent',
    paddingTop: 32,
    paddingBottom: 32,
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
      },
    },

    titleGroup: {
      label: '全局标题设置',
      type: 'object',
      objectFields: {
        globalTitle: { label: '标题', type: 'collapsible-title' },
        globalTitleFontSize: { label: '标题大小 (px)', type: 'number', min: 20, max: 120, step: 1 },
        globalTitleColor: {
          label: '标题颜色',
          type: 'custom',
          render: ({ value, onChange }) => <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />,
        },
        globalTitleAlign: {
          label: '标题对齐方式',
          type: 'select',
          options: [
            { label: '左', value: 'left' },
            { label: '中', value: 'center' },
            { label: '右', value: 'right' },
          ],
        },
      },
    },

    imageGroup: {
      label: '图片设置',
      type: 'object',
      objectFields: {
        imageUrl: {
          label: '图片',
          type: 'custom',
          render: ({ value, onChange }) => <ImageUpload value={value || ''} onChange={onChange} maxCount={1} label="" hint="支持上传本地图片或输入网络图片地址" previewAspectRatio="16:9" />,
        },
        imageRatio: {
          label: '图片比例',
          type: 'select',
          options: [
            { label: '适应图片', value: 'adapt' },
            { label: '小', value: 'small' },
            { label: '大', value: 'large' },
          ],
        },
        imagePlacement: {
          label: '放置',
          type: 'select',
          options: [
            { label: '左边', value: 'left' },
            { label: '右边', value: 'right' },
          ],
        },
      },
    },

    rowGroup: {
      label: '可折叠行设置',
      type: 'object',
      objectFields: {
        rowTitleColor: {
          label: '标题颜色',
          type: 'custom',
          render: ({ value, onChange }) => <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />,
        },
        rowTitleFontSize: { label: '标题大小 (px)', type: 'number', min: 20, max: 120, step: 1 },
        rowContentColor: {
          label: '行内容颜色',
          type: 'custom',
          render: ({ value, onChange }) => <ColorPickerField field={{}} value={value || '#666666'} onChange={onChange} />,
        },
        rowContentFontSize: { label: '内容文本大小 (px)', type: 'number', min: 20, max: 120, step: 1 },
      },
    },

    layoutGroup: {
      label: '布局设置',
      type: 'object',
      objectFields: {
        containerType: {
          label: '容器',
          type: 'select',
          options: [
            { label: '无', value: 'none' },
            { label: '行容器', value: 'row' },
            { label: '分区容器', value: 'section' },
          ],
        },
        containerBgColor: {
          label: '容器背景色',
          type: 'custom',
          render: ({ value, onChange }) => <ColorPickerField field={{}} value={value || 'transparent'} onChange={onChange} />,
        },
      },
    },

    paddingGroup: {
      label: '填充设置',
      type: 'object',
      objectFields: {
        paddingTop: { label: '顶部填充 (px)', type: 'number', min: 0, max: 100, step: 1 },
        paddingBottom: { label: '底部填充 (px)', type: 'number', min: 0, max: 100, step: 1 },
      },
    },

    items: {
      label: '可折叠行管理',
      type: 'custom',
      render: ({ value, onChange }) => <CollapsibleListField value={value} onChange={onChange} />,
    },
  },
  render: ({ puck, ...props }) => <Collapsible puck={puck} {...props} />,
};