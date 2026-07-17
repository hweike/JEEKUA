// components/admin/analytics/DateRangePicker.tsx

'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

export type DateRange = 'today' | 'yesterday' | '7d' | '30d' | '90d' | 'custom';

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange, startAt: number, endAt: number) => void;
}

const PRESETS: { label: string; value: DateRange; days: number }[] = [
  { label: '今日', value: 'today', days: 0 },
  { label: '昨日', value: 'yesterday', days: 1 },
  { label: '最近7天', value: '7d', days: 7 },
  { label: '最近30天', value: '30d', days: 30 },
  { label: '最近90天', value: '90d', days: 90 },
];

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (range: DateRange, days: number) => {
    const endAt = Date.now();
    let startAt: number;
    if (range === 'today') {
      const now = new Date();
      startAt = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    } else if (range === 'yesterday') {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      startAt = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()).getTime();
      // endAt 设为昨天结束
      // 但为了统一，保持 endAt 为当前时间，由调用方处理
    } else {
      startAt = endAt - days * 24 * 60 * 60 * 1000;
    }
    onChange(range, startAt, endAt);
    setIsOpen(false);
  };

  const currentLabel = PRESETS.find(p => p.value === value)?.label || '自定义';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm bg-white hover:bg-gray-50 transition-colors"
      >
        <Calendar className="w-4 h-4 text-gray-500" />
        <span className="text-gray-700">{currentLabel}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1 left-0 bg-white border rounded-lg shadow-lg z-50 min-w-[160px] py-1">
          {PRESETS.map(preset => (
            <button
              key={preset.value}
              onClick={() => handleSelect(preset.value, preset.days)}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                value === preset.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}