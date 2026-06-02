import type { ComponentConfig } from '@measured/puck';
import { List } from '@/components/webbuilder/blocks/basic/List';
import { ListField } from '@/components/webbuilder/fields/ListField';
import { ColorPickerField } from '@/components/webbuilder/fields/ColorPickerField';
import type { ListProps } from '@/lib/webbuilder/types';

export const config: ComponentConfig<ListProps> = {
  label: '列表',
  category: 'Basic',
  defaultProps: {
    items: [],
    iconType: 'none',
  },
  fields: {
    items: {
      label: '列表项',
      type: 'custom',
      render: ({ value, onChange }) => <ListField value={value} onChange={onChange} />,
    },
    iconType: {
      label: '列表图标',
      type: 'select',
      options: [
        { label: '无', value: 'none' },
        { label: '圆点', value: 'dot' },
        { label: '数字', value: 'number' },
        { label: '星星', value: 'star' },
      ],
    },
    // 全局文本颜色（可选，若需要整体覆盖可开启，但当前每个列表项独立，故不加）
    // 以下样式由每个列表项独立控制，无需在组件级别添加
  },
  render: ({ puck, ...props }) => <List puck={puck} {...props} />,
};