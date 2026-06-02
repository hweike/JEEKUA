'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface AttributesInputProps {
  value: Record<string, string>;
  onChange: (attrs: Record<string, string>) => void;
  presets?: Array<{ name: string; values: string[] }>;
}

export function AttributesInput({ value, onChange, presets = [] }: AttributesInputProps) {
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

  const applyPreset = (presetName: string) => {
    const preset = presets.find(p => p.name === presetName);
    if (preset && preset.values.length > 0) {
      const newAttr = { key: presetName, value: preset.values[0] };
      updateAttrs([...localAttrs, newAttr]);
    }
  };

  return (
    <div className="space-y-2">
      {presets.length > 0 && (
        <div className="flex gap-2 mb-2">
          <select
            onChange={(e) => { if (e.target.value) applyPreset(e.target.value); e.target.value = ''; }}
            className="border rounded p-1 text-sm"
            value=""
          >
            <option value="">快速添加预设属性</option>
            {presets.map(p => (
              <option key={p.name} value={p.name}>{p.name}</option>
            ))}
          </select>
        </div>
      )}
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
          <button type="button" onClick={() => removeRow(idx)} className="text-red-500">
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <button type="button" onClick={addRow} className="text-blue-600 text-sm inline-flex items-center gap-1">
        <Plus size={14} /> 添加属性
      </button>
    </div>
  );
}