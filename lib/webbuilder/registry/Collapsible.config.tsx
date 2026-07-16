import type { ComponentConfig } from '@measured/puck';
import { Collapsible } from '@/components/webbuilder/blocks/Advanced/Collapsible';
import { ColorPickerField } from '@/components/webbuilder/fields/ColorPickerField';
import ImageUpload from '@/components/ImageUpload';
import { DEFAULT_COLLAPSIBLE } from '@/lib/webbuilder/defaults/Collapsible';
import type { CollapsibleProps } from '@/lib/webbuilder/types';

// 电商/商业相关图标选项（精简）
const ICON_OPTIONS = [
  { label: '无', value: 'none' },
  { label: '购物车', value: 'shopping_cart' },
  { label: '标签', value: 'tag' },
  { label: '锁', value: 'lock' },
  { label: '心形', value: 'heart' },
  { label: '星星', value: 'star' },
  { label: '卡车（物流）', value: 'truck' },
  { label: '火焰（热门）', value: 'flame' },
  { label: '叶子（天然）', value: 'leaf' },
  { label: '闪电（快速）', value: 'zap' },
  { label: '飞机（运输）', value: 'plane' },
  { label: '地图标记（位置）', value: 'map_pin' },
  { label: '问号（帮助）', value: 'help_circle' },
  { label: '对勾（认证）', value: 'check' },
  { label: '剪贴板（列表）', value: 'clipboard' },
  { label: '眼睛（查看）', value: 'eye' },
  { label: '用户（个人）', value: 'user' },
  { label: '衬衫（服装）', value: 'shirt' },
  // 已移除 'shoe'
  { label: '盒子（包装）', value: 'box' },
  { label: '价格标签', value: 'price_tag' },
  { label: '回收（环保）', value: 'recycle' },
  { label: '返回', value: 'undo' },
  { label: '尺子（尺寸）', value: 'ruler' },
  { label: '餐具（食品）', value: 'utensils' },
  { label: '雪花（冷链）', value: 'snowflake' },
  { label: '秒表（时效）', value: 'timer' },
];

export const config: ComponentConfig<CollapsibleProps> = {
  label: '可折叠',
  category: 'Media/Banner',
  defaultProps: {
    bannerGroup: { ...DEFAULT_COLLAPSIBLE.bannerGroup },
    titleGroup: { ...DEFAULT_COLLAPSIBLE.titleGroup },
    imageGroup: { ...DEFAULT_COLLAPSIBLE.imageGroup },
    contentGroup: { ...DEFAULT_COLLAPSIBLE.contentGroup },
    containerGroup: { ...DEFAULT_COLLAPSIBLE.containerGroup },
    paddingGroup: { ...DEFAULT_COLLAPSIBLE.paddingGroup },
    spacingGroup: { ...DEFAULT_COLLAPSIBLE.spacingGroup },
    items: DEFAULT_COLLAPSIBLE.items,
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

    // ===== 大分组：折叠栏设置 =====
    titleGroup: {
        type: 'object',
        label: '折叠栏设置',
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
          globalTitleAlign: {
            label: '标题对齐方式',
            type: 'select',
            options: [
              { label: '左', value: 'left' },
              { label: '中', value: 'center' },
              { label: '右', value: 'right' },
            ],
          },
          // ✅ 新增：折叠栏背景色
          rowBackgroundColor: {
            label: '折叠栏背景色',
            type: 'custom',
            render: ({ value, onChange }) => (
              <ColorPickerField field={{}} value={value || '#f9fafb'} onChange={onChange} />
            ),
          },
        },
      },

    // ===== 大分组：图片设置 =====
    imageGroup: {
      type: 'object',
      label: '图片设置',
      objectFields: {
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
          label: '图片位置',
          type: 'select',
          options: [
            { label: '左边', value: 'left' },
            { label: '右边', value: 'right' },
          ],
        },
      },
    },

    // ===== 大分组：内容列表设置 =====
    contentGroup: {
      type: 'object',
      label: '内容列表设置',
      objectFields: {
        rowTitleFontSize: { label: '标题大小 (px)', type: 'number', min: 8, max: 120, step: 1 },
        rowTitleColor: {
          label: '标题颜色',
          type: 'custom',
          render: ({ value, onChange }) => (
            <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />
          ),
        },
        // 小分组分隔线
        _sep1: {
          label: '',
          type: 'custom',
          render: () => <div className="h-2 border-b border-gray-200 my-2" />,
        },
        rowContentFontSize: { label: '文本大小 (px)', type: 'number', min: 8, max: 120, step: 1 },
        rowContentColor: {
          label: '文本颜色',
          type: 'custom',
          render: ({ value, onChange }) => (
            <ColorPickerField field={{}} value={value || '#666666'} onChange={onChange} />
          ),
        },
      },
    },

    // ===== 大分组：内容容器 =====
    containerGroup: {
      type: 'object',
      label: '内容容器',
      objectFields: {
        containerType: {
          label: '容器类型',
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
          render: ({ value, onChange }) => (
            <ColorPickerField field={{}} value={value || 'transparent'} onChange={onChange} />
          ),
        },
      },
    },

    // ===== 可折叠项目管理（标准 array） =====
    items: {
      label: '可折叠项目列表',
      type: 'array',
      itemLabel: 'Item #{index}',
      arrayFields: {
        title: { label: '标题', type: 'text' },
        _sep2: {
          label: '',
          type: 'custom',
          render: () => <div className="h-2 border-b border-gray-200 my-2" />,
        },
        icon: {
          label: '图标',
          type: 'select',
          options: ICON_OPTIONS,
        },
        _sep3: {
          label: '',
          type: 'custom',
          render: () => <div className="h-2 border-b border-gray-200 my-2" />,
        },
        content: { label: '内容', type: 'textarea' },
      },
      defaultItem: () => ({
        id: `collapsible-item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: '新问题',
        icon: 'help_circle',
        content: '在此输入答案...',
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
  render: ({ puck, ...props }) => <Collapsible puck={puck} {...props} />,
};