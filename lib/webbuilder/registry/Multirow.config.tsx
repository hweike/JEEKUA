import type { ComponentConfig } from '@measured/puck';
import { Multirow } from '@/components/webbuilder/blocks/Advanced/Multirow';
import { ColorPickerField } from '@/components/webbuilder/fields/ColorPickerField';
import ImageUpload from '@/components/ImageUpload';
import { DEFAULT_MULTIROW } from '@/lib/webbuilder/defaults/Multirow';
import type { MultirowProps } from '@/lib/webbuilder/types';

export const config: ComponentConfig<MultirowProps> = {
  label: '多行',
  category: 'Media/Banner',
  defaultProps: {
    bannerGroup: { ...DEFAULT_MULTIROW.bannerGroup },
    imageGroup: { ...DEFAULT_MULTIROW.imageGroup },
    contentGroup: { ...DEFAULT_MULTIROW.contentGroup },
    paddingGroup: { ...DEFAULT_MULTIROW.paddingGroup },
    spacingGroup: { ...DEFAULT_MULTIROW.spacingGroup },
    items: DEFAULT_MULTIROW.items,
  },
  fields: {
    // ===== 大分组：通栏设置 =====
    bannerGroup: {
      type: 'object',
      label: '通栏设置',
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
          render: ({ value, onChange }) => (
            <ColorPickerField field={{}} value={value || '#ffffff'} onChange={onChange} />
          ),
        },
      },
    },

    // ===== 大分组：图片设置 =====
    imageGroup: {
      type: 'object',
      label: '图片设置',
      objectFields: {
        imageHeight: {
          label: '图片高度',
          type: 'select',
          options: [
            { label: '适应图片', value: 'auto' },
            { label: '小', value: 'small' },
            { label: '中', value: 'medium' },
            { label: '大', value: 'large' },
          ],
        },
        imageWidth: {
          label: '图片宽度',
          type: 'select',
          options: [
            { label: '小', value: 'small' },
            { label: '中', value: 'medium' },
            { label: '大', value: 'large' },
          ],
        },
        imagePlacement: {
          label: '图片放置方式',
          type: 'select',
          options: [
            { label: '从左侧交替', value: 'alternate-left' },
            { label: '从右侧交替', value: 'alternate-right' },
            { label: '左对齐', value: 'left' },
            { label: '右对齐', value: 'right' },
          ],
        },
      },
    },

    // ===== 大分组：内容列设置 =====
    contentGroup: {
      type: 'object',
      label: '内容列设置',
      objectFields: {
        columnBgColor: {
          label: '列背景色',
          type: 'custom',
          render: ({ value, onChange }) => (
            <ColorPickerField field={{}} value={value || '#f9fafb'} onChange={onChange} />
          ),
        },
        _sep1: {
          label: '',
          type: 'custom',
          render: () => <div className="h-2 border-b border-gray-200 my-2" />,
        },
        columnTitleColor: {
          label: '标题颜色',
          type: 'custom',
          render: ({ value, onChange }) => (
            <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />
          ),
        },
        columnTitleFontSize: { label: '标题大小 (px)', type: 'number', min: 12, max: 120, step: 1 },
        _sep2: {
          label: '',
          type: 'custom',
          render: () => <div className="h-2 border-b border-gray-200 my-2" />,
        },
        columnDescColor: {
          label: '描述颜色',
          type: 'custom',
          render: ({ value, onChange }) => (
            <ColorPickerField field={{}} value={value || '#666666'} onChange={onChange} />
          ),
        },
        columnDescFontSize: { label: '描述大小 (px)', type: 'number', min: 12, max: 120, step: 1 },
        _sep3: {
          label: '',
          type: 'custom',
          render: () => <div className="h-2 border-b border-gray-200 my-2" />,
        },
        contentVertical: {
          label: '内容垂直位置',
          type: 'select',
          options: [
            { label: '顶部', value: 'top' },
            { label: '中间', value: 'middle' },
            { label: '底部', value: 'bottom' },
          ],
        },
        textAlign: {
          label: '文本对齐（桌面）',
          type: 'select',
          options: [
            { label: '左', value: 'left' },
            { label: '居中', value: 'center' },
            { label: '右', value: 'right' },
          ],
        },
        mobileTextAlign: {
          label: '文本对齐（移动）',
          type: 'select',
          options: [
            { label: '左', value: 'left' },
            { label: '居中', value: 'center' },
            { label: '右', value: 'right' },
          ],
        },
      },
    },

    // ===== 内容行管理（标准 array） =====
    items: {
      label: '内容行列表',
      type: 'array',
      itemLabel: '行 #{index}',
      arrayFields: {
        imageUrl: {
          label: '图片',
          type: 'custom',
          render: ({ value, onChange }) => (
            <ImageUpload
              value={value || ''}
              onChange={(url) => onChange(typeof url === 'string' ? url : url[0])}
              maxCount={1}
              label=""
              hint="支持上传本地图片或输入网络图片地址"
              previewAspectRatio="16:9"
            />
          ),
        },
        _sep4: {
          label: '',
          type: 'custom',
          render: () => <div className="h-2 border-b border-gray-200 my-2" />,
        },
        title: { label: '标题', type: 'text' },
        description: { label: '描述', type: 'textarea' },
        _sep5: {
          label: '',
          type: 'custom',
          render: () => <div className="h-2 border-b border-gray-200 my-2" />,
        },
        linkLabel: { label: '链接文字', type: 'text' },
        linkUrl: { label: '链接地址', type: 'text' },
      },
      defaultItem: () => ({
        id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        imageUrl: '',
        title: '新行标题',
        description: '在此输入描述文字...',
        linkLabel: '了解更多',
        linkUrl: '#',
      }),
    },

    // ===== 大分组：填充设置（置于最底） =====
    paddingGroup: {
      type: 'object',
      label: '填充设置',
      objectFields: {
        paddingTop: { label: '顶部填充 (px)', type: 'number', min: 0, max: 100, step: 1 },
        paddingBottom: { label: '底部填充 (px)', type: 'number', min: 0, max: 100, step: 1 },
      },
    },
  },
  render: ({ puck, ...props }) => <Multirow puck={puck} {...props} />,
};