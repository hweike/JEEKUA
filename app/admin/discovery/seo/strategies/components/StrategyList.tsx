// app/admin/discovery/seo/strategies/components/StrategyList.tsx

'use client';

import { FileText, Check } from 'lucide-react';
import { PAGE_TYPES } from '../constants';

interface StrategyListProps {
  selectedType: string;
  strategies: { page_type: string }[];
  onSelect: (type: string) => void;
}

export function StrategyList({ selectedType, strategies, onSelect }: StrategyListProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-3 border-b border-gray-200 bg-gray-50">
        <h2 className="text-sm font-medium text-gray-700">页面类型</h2>
      </div>
      <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
        {PAGE_TYPES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${
              selectedType === key
                ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-600'
                : 'hover:bg-gray-50 text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {label}
            </span>
            {strategies.some((s) => s.page_type === key) && (
              <Check className="w-4 h-4 text-green-600" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}