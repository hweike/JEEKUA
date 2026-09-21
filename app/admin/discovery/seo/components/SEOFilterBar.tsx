'use client';

import { Search, Filter } from 'lucide-react';
import { STATUS_OPTIONS, type GenerationStatus } from '../../components/StatusBadge';
import { PAGE_TYPE_LABELS } from '../types';

interface SEOFilterBarProps {
  filterStatus: GenerationStatus | 'all';
  onStatusChange: (status: GenerationStatus | 'all') => void;
  filterType: string;
  typeOptions: { key: string; label: string }[];
  onTypeChange: (type: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function SEOFilterBar({
  filterStatus,
  onStatusChange,
  filterType,
  typeOptions,
  onTypeChange,
  searchQuery,
  onSearchChange,
}: SEOFilterBarProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex flex-wrap items-center gap-4">
        {/* 状态 */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600">状态：</span>
          <select
            value={filterStatus}
            onChange={(e) => onStatusChange(e.target.value as GenerationStatus | 'all')}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* 类型 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">类型：</span>
          <select
            value={filterType}
            onChange={(e) => onTypeChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="all">全部类型</option>
            {typeOptions.map(({ key }) => (
              <option key={key} value={key}>
                {PAGE_TYPE_LABELS[key] || key}
              </option>
            ))}
          </select>
        </div>

        {/* 搜索框 */}
        <div className="flex-1 min-w-[150px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="搜索页面名称..."
              className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}