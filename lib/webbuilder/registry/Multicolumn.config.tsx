import type { ComponentConfig } from '@measured/puck';
import { Multicolumn } from '@/components/webbuilder/blocks/Advanced/Multicolumn';
import { ColorPickerField } from '@/components/webbuilder/fields/ColorPickerField';
import ImageUpload from '@/components/ImageUpload';
import { DEFAULT_MULTICOLUMN } from '@/lib/webbuilder/defaults/Multicolumn';
import type { MulticolumnProps } from '@/lib/webbuilder/types';

export const config: ComponentConfig<MulticolumnProps> = {
  label: '多列',
  category: 'Media/Banner',
  defaultProps: {
    bannerGroup: { ...DEFAULT_MULTICOLUMN.bannerGroup },
    globalGroup: { ...DEFAULT_MULTICOLUMN.globalGroup },
    imageGroup: { ...DEFAULT_MULTICOLUMN.imageGroup },
    buttonGroup: { ...DEFAULT_MULTICOLUMN.buttonGroup },
    layoutGroup: { ...DEFAULT_MULTICOLUMN.layoutGroup },
    styleGroup: { ...DEFAULT_MULTICOLUMN.styleGroup },
    paddingGroup: { ...DEFAULT_MULTICOLUMN.paddingGroup },
    spacingGroup: { ...DEFAULT_MULTICOLUMN.spacingGroup },
    items: DEFAULT_MULTICOLUMN.items,
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

    // ===== 大分组：全局标题 =====
    globalGroup: {
      type: 'object',
      label: '全局标题',
      objectFields: {
        globalTitle: { label: '标题', type: 'text' },
        globalTitleFontSize: { label: '标题大小 (px)', type: 'number', min: 20, max: 120, step: 1 },
        globalTitleColor: {
          label: '标题颜色',
          type: 'custom',
          render: ({ value, onChange }) => (
            <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />
          ),
        },
      },
    },

    // ===== 大分组：图片全局设置 =====
    imageGroup: {
      type: 'object',
      label: '图片全局设置',
      objectFields: {
        imageWidth: {
          label: '图片宽度',
          type: 'select',
          options: [
            { label: '全列宽', value: 'full' },
            { label: '1/2列宽', value: 'half' },
            { label: '1/3列宽', value: 'third' },
          ],
        },
        imageShape: {
          label: '图片比例',
          type: 'select',
          options: [
            { label: '适应图片', value: 'adapt' },
            { label: '纵向', value: 'portrait' },
            { label: '方形', value: 'square' },
            { label: '圆形', value: 'circle' },
          ],
        },
      },
    },

    // ===== 大分组：底部按钮 =====
    buttonGroup: {
      type: 'object',
      label: '底部按钮',
      objectFields: {
        buttonText: { label: '按钮文字', type: 'text' },
        buttonFontSize: { label: '按钮文字大小 (px)', type: 'number', min: 12, max: 60, step: 1 },
        buttonColor: {
          label: '按钮颜色',
          type: 'custom',
          render: ({ value, onChange }) => (
            <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />
          ),
        },
        buttonLink: { label: '按钮链接', type: 'text' },
      },
    },

    // ===== 大分组：布局设置 =====
    layoutGroup: {
      type: 'object',
      label: '布局设置',
      objectFields: {
        columnsDesktop: { label: '列数 (桌面端 1-5)', type: 'number', min: 1, max: 5, step: 1 },
        columnsAlign: {
          label: '列对齐方式',
          type: 'select',
          options: [
            { label: '左对齐', value: 'left' },
            { label: '居中', value: 'center' },
          ],
        },
        _sep1: {
          label: '',
          type: 'custom',
          render: () => <div className="h-2 border-b border-gray-200 my-2" />,
        },
        columnsMobile: { label: '列数 (移动端 1-2)', type: 'number', min: 1, max: 2, step: 1 },
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

    // ===== 大分组：列样式配色 =====
    styleGroup: {
      type: 'object',
      label: '列样式配色',
      objectFields: {
        columnBgColor: {
          label: '列背景色',
          type: 'custom',
          render: ({ value, onChange }) => (
            <ColorPickerField field={{}} value={value || '#f9fafb'} onChange={onChange} />
          ),
        },
        _sep2: {
          label: '',
          type: 'custom',
          render: () => <div className="h-2 border-b border-gray-200 my-2" />,
        },
        columnTitleColor: {
          label: '列标题颜色',
          type: 'custom',
          render: ({ value, onChange }) => (
            <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />
          ),
        },
        columnDescColor: {
          label: '列描述颜色',
          type: 'custom',
          render: ({ value, onChange }) => (
            <ColorPickerField field={{}} value={value || '#666666'} onChange={onChange} />
          ),
        },
      },
    },

    // ===== 可折叠项目管理（标准 array） =====
    // ✅ 改为：内容列表
    items: {
      label: '内容列表',
      type: 'array',
      itemLabel: '列 #{index}',
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
        _sep3: {
          label: '',
          type: 'custom',
          render: () => <div className="h-2 border-b border-gray-200 my-2" />,
        },
        title: { label: '标题', type: 'text' },
        description: { label: '描述', type: 'textarea' },
        _sep4: {
          label: '',
          type: 'custom',
          render: () => <div className="h-2 border-b border-gray-200 my-2" />,
        },
        buttonLabel: { label: '按钮文字', type: 'text' },
        buttonLink: { label: '按钮链接', type: 'text' },
      },
      defaultItem: () => ({
        id: `column-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        imageUrl: '',
        title: '新列标题',
        description: '在此输入描述文字...',
        buttonLabel: '了解详情',
        buttonLink: '#',
      }),
    },

    // ===== ✅ 填充设置：移至最下方 =====
    paddingGroup: {
      type: 'object',
      label: '填充设置',
      objectFields: {
        paddingTop: { label: '顶部填充 (px)', type: 'number', min: 0, max: 100, step: 1 },
        paddingBottom: { label: '底部填充 (px)', type: 'number', min: 0, max: 100, step: 1 },
      },
    },
  },
  render: ({ puck, ...props }) => <Multicolumn puck={puck} {...props} />,
};