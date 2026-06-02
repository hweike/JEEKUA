// components/webbuilder/blocks/Table.tsx
'use client';

export interface TableProps {
  headers: string[];
  rows: string[][];
}

export function Table({ headers, rows }: TableProps) {
  return (
    <div className="relative w-full overflow-x-auto my-4">
      <table className="w-full caption-bottom text-sm">
        <thead className="[&_tr]:border-b">
          <tr className="border-b transition-colors hover:bg-muted/50">
            {headers.map((header, idx) => (
              <th key={idx} className="h-10 px-2 text-left align-middle font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr key={rowIdx} className="border-b transition-colors hover:bg-muted/50">
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} className="p-2 align-middle">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const TableConfig = {
  fields: {
    headers: {
      type: 'array',
      arrayFields: { type: 'text' },
    },
    rows: {
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
  render: ({ headers, rows }: TableProps) => <Table headers={headers} rows={rows} />,
};