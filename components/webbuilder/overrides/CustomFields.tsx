'use client';

import { AutoField } from '@puckeditor/core';
import { CollapsibleGroup } from '@/components/webbuilder/fields/CollapsibleGroup';

interface CustomFieldsProps {
  fields: Record<string, any>;
  data: any;
  onChange: (data: any) => void;
  readOnly?: boolean;
}

export function CustomFields({ fields, data, onChange, readOnly = false }: CustomFieldsProps) {
  if (!fields || Object.keys(fields).length === 0) {
    return (
      <div className="p-4 text-center text-gray-400 text-sm">
        暂无配置项
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {Object.entries(fields).map(([fieldName, field]: [string, any]) => {
        // 分组字段
        if (field.type === 'group') {
          return (
            <CollapsibleGroup
              key={fieldName}
              field={field}
              name={fieldName}
              value={data?.[fieldName]}
              onChange={(val) => onChange({ ...data, [fieldName]: val })}
              readOnly={readOnly}
            />
          );
        }

        // 普通字段（包括 slot 字段）
        return (
          <div key={fieldName} className="py-2 first:pt-0 last:pb-0 space-y-1">
            <AutoField
              field={field}
              name={fieldName}
              value={data?.[fieldName]}
              onChange={(val) => onChange({ ...data, [fieldName]: val })}
              readOnly={readOnly}
            />
            {field.description && (
              <p className="text-xs text-gray-500 mt-1">{field.description}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}