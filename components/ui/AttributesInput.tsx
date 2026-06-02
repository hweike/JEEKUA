// components/ui/AttributesInput.tsx
'use client';

import { useState } from 'react';

interface Props {
  value: Record<string, string>;
  onChange: (attrs: Record<string, string>) => void;
}

export function AttributesInput({ value, onChange }: Props) {
  const [localAttrs, setLocalAttrs] = useState<Array<{ key: string; value: string }>>(
    Object.entries(value).map(([k, v]) => ({ key: k, value: v }))
  );

  const updateAttrs = (newAttrs: Array<{ key: string; value: string }>) => {
    setLocalAttrs(newAttrs);
    const obj: Record<string, string> = {};
    newAttrs.forEach(({ key, value }) => {
      if (key.trim()) obj[key.trim()] = value;
    });
    onChange(obj);
  };

  const addRow = () => {
    updateAttrs([...localAttrs, { key: '', value: '' }]);
  };

  const removeRow = (idx: number) => {
    updateAttrs(localAttrs.filter((_, i) => i !== idx));
  };

  const updateRow = (idx: number, field: 'key' | 'value', val: string) => {
    const newAttrs = [...localAttrs];
    newAttrs[idx][field] = val;
    updateAttrs(newAttrs);
  };

  return (
    <div className="space-y-2">
      {localAttrs.map((attr, idx) => (
        <div key={idx} className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="属性名"
            value={attr.key}
            onChange={e => updateRow(idx, 'key', e.target.value)}
            className="border rounded p-1 w-1/3"
          />
          <input
            type="text"
            placeholder="属性值"
            value={attr.value}
            onChange={e => updateRow(idx, 'value', e.target.value)}
            className="border rounded p-1 w-1/2"
          />
          <button type="button" onClick={() => removeRow(idx)} className="text-red-500">删除</button>
        </div>
      ))}
      <button type="button" onClick={addRow} className="text-blue-600 text-sm">+ 添加属性</button>
    </div>
  );
}