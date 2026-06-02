// components/ui/PriceTiersInput.tsx
'use client';

import { useState } from 'react';

interface Tier {
  minQty: number;
  maxQty: number | null;
  price: number;
}

interface Props {
  value: Tier[];
  onChange: (tiers: Tier[]) => void;
  currency: string;
}

export function PriceTiersInput({ value, onChange, currency }: Props) {
  const addTier = () => {
    const newTier = { minQty: 1, maxQty: null, price: 0 };
    onChange([...value, newTier]);
  };

  const removeTier = (index: number) => {
    const newTiers = value.filter((_, i) => i !== index);
    onChange(newTiers);
  };

  const updateTier = (index: number, field: keyof Tier, val: any) => {
    const newTiers = [...value];
    newTiers[index] = { ...newTiers[index], [field]: val === '' ? null : val };
    // 自动排序
    newTiers.sort((a, b) => a.minQty - b.minQty);
    onChange(newTiers);
  };

  return (
    <div className="space-y-2">
      {value.map((tier, idx) => (
        <div key={idx} className="flex gap-2 items-end border-b pb-2">
          <div>
            <label className="block text-sm">起始数量</label>
            <input
              type="number"
              value={tier.minQty}
              onChange={e => updateTier(idx, 'minQty', parseInt(e.target.value) || 0)}
              className="border rounded p-1 w-24"
            />
          </div>
          <div>
            <label className="block text-sm">结束数量</label>
            <input
              type="number"
              value={tier.maxQty === null ? '' : tier.maxQty}
              onChange={e => updateTier(idx, 'maxQty', e.target.value === '' ? null : parseInt(e.target.value))}
              className="border rounded p-1 w-24"
              placeholder="无上限"
            />
          </div>
          <div>
            <label className="block text-sm">单价 ({currency})</label>
            <input
              type="number"
              step="0.01"
              value={tier.price}
              onChange={e => updateTier(idx, 'price', parseFloat(e.target.value) || 0)}
              className="border rounded p-1 w-24"
            />
          </div>
          <button type="button" onClick={() => removeTier(idx)} className="text-red-500">删除</button>
        </div>
      ))}
      <button type="button" onClick={addTier} className="text-blue-600 text-sm">+ 添加阶梯</button>
    </div>
  );
}