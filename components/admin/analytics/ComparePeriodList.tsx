// components/admin/analytics/ComparePeriodList.tsx

'use client';

import { EmptyState } from './EmptyState';
import type { MetricItem } from '@/lib/umami';

interface ComparePeriodListProps {
  currentData: MetricItem[];
  prevData: MetricItem[];
  currentLabel: string;
  prevLabel: string;
  loading?: boolean;
  dimension: string;
}

export function ComparePeriodList({
  currentData,
  prevData,
  currentLabel,
  prevLabel,
  loading,
  dimension,
}: ComparePeriodListProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex justify-between">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-10"></div>
              </div>
            ))}
          </div>
        </div>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex justify-between">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-10"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const renderList = (data: MetricItem[], label: string) => {
    const sorted = [...data].sort((a, b) => b.y - a.y);
    if (sorted.length === 0) {
      return (
        <div className="py-8">
          <EmptyState message="暂无数据" />
        </div>
      );
    }
    return (
      <div className="divide-y divide-gray-100">
        {sorted.map((item, index) => (
          <div key={index} className="flex justify-between py-2 px-1 hover:bg-gray-50 rounded">
            <span className="text-sm text-gray-700 truncate flex-1 mr-4" title={item.x}>
              {item.x || '未知'}
            </span>
            <span className="text-sm font-medium text-gray-900">{item.y}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 先前时期 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h4 className="text-sm font-semibold text-gray-700">先前</h4>
          <span className="text-xs text-gray-400">{prevLabel}</span>
        </div>
        {renderList(prevData, prevLabel)}
      </div>
      {/* 当前时期 */}
      <div className="lg:border-l lg:border-gray-200 lg:pl-6">
        <div className="flex items-center gap-2 mb-3">
          <h4 className="text-sm font-semibold text-gray-700">当前</h4>
          <span className="text-xs text-gray-400">{currentLabel}</span>
        </div>
        {renderList(currentData, currentLabel)}
      </div>
    </div>
  );
}