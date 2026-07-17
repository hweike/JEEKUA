// components/admin/analytics/CompareDimensionSelector.tsx

'use client';

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

type DimensionOption = {
  value: string;
  label: string;
};

const DIMENSIONS: DimensionOption[] = [
  { value: 'path', label: '路径' },
  { value: 'channel', label: '渠道' },
  { value: 'referrer', label: '来源域名' },
  { value: 'browser', label: '浏览器' },
  { value: 'os', label: '操作系统' },
  { value: 'device', label: '设备' },
  { value: 'country', label: '国家/地区' },
  { value: 'city', label: '市/县' },
  { value: 'language', label: '语言' },
  { value: 'event', label: '行为类别' },
];

interface CompareDimensionSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function CompareDimensionSelector({
  value,
  onChange,
}: CompareDimensionSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentLabel = DIMENSIONS.find(d => d.value === value)?.label || '路径';

  return (
    <div className="relative min-w-[180px]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-2 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium">比较: {currentLabel}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
          {DIMENSIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                value === opt.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}