import type { ComponentConfig } from '@measured/puck';
import { ComparisonTableBlock } from '@/components/webbuilder/blocks/comparison-table/ComparisonTableBlock';
import { ColorPickerField } from '@/components/webbuilder/fields/ColorPickerField';
import type { ComparisonTableBlockProps } from '@/lib/webbuilder/types';

function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function generateDefaultGroups() {
  return [
    {
      id: generateId('group'),
      title: '用量',
      rows: [
        { id: generateId('row'), label: '文稿数', values: ['100 篇/月', '无限', '无限'] },
        { id: generateId('row'), label: '知识库数', values: ['20000', '20000', '20000'] },
        { id: generateId('row'), label: '人员数', values: ['10 人', '根据购买人数', '根据购买人数'] },
      ],
    },
    {
      id: generateId('group'),
      title: '功能',
      rows: [
        { id: generateId('row'), label: '文档功能', values: ['✓', '✓', '✓'] },
        { id: generateId('row'), label: '导入导出', values: ['✓', '✓', '✓'] },
        { id: generateId('row'), label: '知识库统计功能', values: ['-', '✓', '✓'] },
      ],
    },
  ];
}

export const config: ComponentConfig<ComparisonTableBlockProps> = {
  label: '详细对比表格',
  category: 'Product',
  defaultProps: {
    bannerType: 'standard',
    backgroundColor: '#ffffff',
    columns: 3,
    columnTitles: ['标准版', '专业版', '旗舰版'],
    groups: generateDefaultGroups(),
    headerBgColor: '#f9fafb',
    headerTextColor: '#000000',
    groupBgColor: '#f3f4f6',
    groupTextColor: '#000000',
    rowBgColor: '#ffffff',
    rowAltBgColor: '#f9fafb',
    rowTextColor: '#333333',
    borderColor: '#e5e7eb',
    checkIconColor: '#22c55e',
    crossIconColor: '#d1d5db',
    cellFontSize: 14,
    labelFontSize: 14,
    labelColumnWidth: 200,
    tableTitle: '权益详细对比',
    tableTitleColor: '#000000',
    tableTitleFontSize: 32,
    tableTitleAlign: 'center',
    paddingTop: 48,
    paddingBottom: 48,
  },
  fields: {
    // ===== 通栏设置 =====
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

    // ===== 表格标题 =====
    tableTitle: { label: '表格标题', type: 'text' },
    tableTitleColor: {
      label: '标题颜色',
      type: 'custom',
      render: ({ value, onChange }) => (
        <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />
      ),
    },
    tableTitleFontSize: { label: '标题大小 (px)', type: 'number', min: 16, max: 80, step: 1 },
    tableTitleAlign: {
      label: '标题对齐',
      type: 'radio',
      options: [
        { label: '左', value: 'left' },
        { label: '中', value: 'center' },
        { label: '右', value: 'right' },
      ],
    },

    // ===== 列设置 =====
    columns: {
      label: '版本列数',
      type: 'select',
      options: [
        { label: '2 列', value: 2 },
        { label: '3 列', value: 3 },
        { label: '4 列', value: 4 },
      ],
    },
    columnTitles: {
      label: '版本名称',
      type: 'array',
      arrayFields: {
        title: { label: '名称', type: 'text' },
      },
      defaultItem: () => ({ title: '新版本' }),
    },
    labelColumnWidth: { label: '首列宽度 (px)', type: 'number', min: 100, max: 400, step: 10 },

    // ===== 样式设置 =====
    headerBgColor: {
      label: '表头背景色',
      type: 'custom',
      render: ({ value, onChange }) => (
        <ColorPickerField field={{}} value={value || '#f9fafb'} onChange={onChange} />
      ),
    },
    headerTextColor: {
      label: '表头文字色',
      type: 'custom',
      render: ({ value, onChange }) => (
        <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />
      ),
    },
    groupBgColor: {
      label: '分组标题背景色',
      type: 'custom',
      render: ({ value, onChange }) => (
        <ColorPickerField field={{}} value={value || '#f3f4f6'} onChange={onChange} />
      ),
    },
    groupTextColor: {
      label: '分组标题文字色',
      type: 'custom',
      render: ({ value, onChange }) => (
        <ColorPickerField field={{}} value={value || '#000000'} onChange={onChange} />
      ),
    },
    rowBgColor: {
      label: '行背景色',
      type: 'custom',
      render: ({ value, onChange }) => (
        <ColorPickerField field={{}} value={value || '#ffffff'} onChange={onChange} />
      ),
    },
    rowAltBgColor: {
      label: '交替行背景色',
      type: 'custom',
      render: ({ value, onChange }) => (
        <ColorPickerField field={{}} value={value || '#f9fafb'} onChange={onChange} />
      ),
    },
    rowTextColor: {
      label: '行文字色',
      type: 'custom',
      render: ({ value, onChange }) => (
        <ColorPickerField field={{}} value={value || '#333333'} onChange={onChange} />
      ),
    },
    borderColor: {
      label: '边框色',
      type: 'custom',
      render: ({ value, onChange }) => (
        <ColorPickerField field={{}} value={value || '#e5e7eb'} onChange={onChange} />
      ),
    },
    checkIconColor: {
      label: '✓ 图标颜色',
      type: 'custom',
      render: ({ value, onChange }) => (
        <ColorPickerField field={{}} value={value || '#22c55e'} onChange={onChange} />
      ),
    },
    crossIconColor: {
      label: '✗ 图标颜色',
      type: 'custom',
      render: ({ value, onChange }) => (
        <ColorPickerField field={{}} value={value || '#d1d5db'} onChange={onChange} />
      ),
    },
    cellFontSize: { label: '单元格字体大小 (px)', type: 'number', min: 10, max: 24, step: 1 },
    labelFontSize: { label: '首列字体大小 (px)', type: 'number', min: 10, max: 24, step: 1 },

    // ===== 填充 =====
    paddingTop: { label: '顶部填充 (px)', type: 'number', min: 0, max: 200, step: 4 },
    paddingBottom: { label: '底部填充 (px)', type: 'number', min: 0, max: 200, step: 4 },

    // ===== 分组数据 =====
    groups: {
      label: '对比分组',
      type: 'array',
      arrayFields: {
        title: { label: '分组标题', type: 'text' },
        rows: {
          label: '对比行',
          type: 'array',
          arrayFields: {
            label: { label: '功能名称', type: 'text' },
            values: {
              label: '各版本的值（用逗号分隔）',
              type: 'text',
            },
          },
          defaultItem: () => ({
            id: generateId('row'),
            label: '新功能',
            values: ['-', '-', '-'],
          }),
        },
      },
      defaultItem: () => ({
        id: generateId('group'),
        title: '新分组',
        rows: [],
      }),
    },
  },
  render: ({ puck, ...props }) => <ComparisonTableBlock puck={puck} {...props} />,
};