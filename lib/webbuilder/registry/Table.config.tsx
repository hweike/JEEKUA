// lib/webbuilder/registry/Table.config.ts
import { Table } from '@/components/webbuilder/blocks/Table';
import type { ComponentConfig } from '@puckeditor/core';
import type { Components } from '../types';

export const config: ComponentConfig<Components['Table']> = {
  label: '表格',
  fields: {
    headers: {
      label: '表头',
      type: 'array',
      arrayFields: { type: 'text' },
    },
    rows: {
      label: '行数据',
      type: 'array',
      arrayFields: {
        type: 'array',
        arrayFields: { type: 'text' },
      },
    },
  },
  defaultProps: {
    headers: ['列1', '列2', '列3'],
    rows: [
      ['数据1', '数据2', '数据3'],
      ['数据4', '数据5', '数据6'],
    ],
  },
  render: ({ headers, rows }) => <Table headers={headers} rows={rows} />,
};