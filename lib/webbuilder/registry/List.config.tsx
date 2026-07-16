import type { ComponentConfig } from '@measured/puck';
import { List } from '@/components/webbuilder/blocks/basic/List';
import { ColorPickerField } from '@/components/webbuilder/fields/ColorPickerField';
import { DEFAULT_LIST } from '@/lib/webbuilder/defaults/List';
import type { ListProps } from '@/lib/webbuilder/types';

// 图标选项（与 Collapsible 保持一致，精简到常用）
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
  { label: '盒子（包装）', value: 'box' },
  { label: '回收（环保）', value: 'recycle' },
  { label: '返回', value: 'undo' },
  { label: '尺子（尺寸）', value: 'ruler' },
  { label: '餐具（食品）', value: 'utensils' },
  { label: '雪花（冷链）', value: 'snowflake' },
  { label: '秒表（时效）', value: 'timer' },
];

export const config: ComponentConfig<ListProps> = {
  label: '列表',
  category: 'Basic',
  defaultProps: {
    spacingGroup: { ...DEFAULT_LIST.spacingGroup },
    items: DEFAULT_LIST.items,
  },
  fields: {
    items: {
      label: '列表项',
      type: 'array',
      itemLabel: '项 #{index}',
      arrayFields: {
        icon: {
          label: '图标',
          type: 'select',
          options: ICON_OPTIONS,
        },
        _sep1: {
          label: '',
          type: 'custom',
          render: () => <div className="h-2 border-b border-gray-200 my-2" />,
        },
        text: { label: '文本', type: 'text' },
        _sep2: {
          label: '',
          type: 'custom',
          render: () => <div className="h-2 border-b border-gray-200 my-2" />,
        },
        textColor: {
          label: '文字颜色',
          type: 'custom',
          render: ({ value, onChange }) => (
            <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />
          ),
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
        _sep3: {
          label: '',
          type: 'custom',
          render: () => <div className="h-2 border-b border-gray-200 my-2" />,
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
        _sep4: {
          label: '',
          type: 'custom',
          render: () => <div className="h-2 border-b border-gray-200 my-2" />,
        },
        link: { label: '链接地址', type: 'text' },
      },
      defaultItem: () => ({
        id: `list-item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        icon: 'none',
        text: '新列表项',
        textColor: '#000000',
        fontSize: 16,
        textAlign: 'left',
        bold: false,
        italic: false,
        underline: false,
        link: '',
      }),
    },
  },
  render: ({ puck, ...props }) => <List puck={puck} {...props} />,
};