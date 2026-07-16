'use client';

import { Search, Filter, Play, Loader2 } from 'lucide-react';
import { STATUS_OPTIONS, type GenerationStatus } from '../../components/StatusBadge';
import type { Language } from '../types';
import { PAGE_TYPE_LABELS } from '../types'; // ✅ 导入类型中文映射

interface SEOFilterBarProps {
  selectedLocale: string;
  languages: Language[];
  onLocaleChange: (locale: string) => void;
  filterStatus: GenerationStatus | 'all';
  onStatusChange: (status: GenerationStatus | 'all') => void;
  filterType: string;
  typeOptions: { key: string; label: string }[];
  onTypeChange: (type: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCount: number;
  totalCount: number;
  isBatchRunning: boolean;
  onBatchGenerate: () => void;
  onBatchAll: () => void;
}

export function SEOFilterBar({
  selectedLocale,
  languages,
  onLocaleChange,
  filterStatus,
  onStatusChange,
  filterType,
  typeOptions,
  onTypeChange,
  searchQuery,
  onSearchChange,
  selectedCount,
  totalCount,
  isBatchRunning,
  onBatchGenerate,
  onBatchAll,
}: SEOFilterBarProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex items-center gap-3 overflow-x-auto">
        {/* 语言下拉 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-sm text-gray-600 whitespace-nowrap">语言:</span>
          <select
            value={selectedLocale}
            onChange={(e) => onLocaleChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
          >
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.zhName || lang.nativeName} ({lang.code})
              </option>
            ))}
          </select>
        </div>

        {/* 状态 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600 whitespace-nowrap">状态:</span>
          <select
            value={filterStatus}
            onChange={(e) => onStatusChange(e.target.value as GenerationStatus | 'all')}
            className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* 类型 - 使用中文标签 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-sm text-gray-600 whitespace-nowrap">类型:</span>
          <select
            value={filterType}
            onChange={(e) => onTypeChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
          >
            <option value="all">全部</option>
            {typeOptions.map(({ key }) => (
              <option key={key} value={key}>
                {PAGE_TYPE_LABELS[key] || key}
              </option>
            ))}
          </select>
        </div>

        {/* 搜索框 */}
        <div className="flex-1 min-w-[120px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="搜索页面..."
              className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>

        {/* 按钮组 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onBatchGenerate}
            disabled={isBatchRunning || selectedCount === 0}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1 whitespace-nowrap"
          >
            {isBatchRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            批量生成（{selectedCount}）
          </button>
          <button
            onClick={onBatchAll}
            disabled={isBatchRunning || totalCount === 0}
            className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1 whitespace-nowrap"
          >
            {isBatchRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            一键全部生成
          </button>
        </div>
      </div>
    </div>
  );
}