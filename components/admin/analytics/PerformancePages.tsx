// components/admin/analytics/PerformancePages.tsx

'use client';

import { useState } from 'react';
import { EmptyState } from './EmptyState';

interface PagePerformance {
  path: string;
  title?: string;
  lcp: number;
  inp?: number;
  cls?: number;
  fcp?: number;
  ttfb?: number;
}

interface PerformancePagesProps {
  data: PagePerformance[];
  metricKey: string;
  metricLabel: string;
  loading?: boolean;
}

export function PerformancePages({
  data,
  metricKey,
  metricLabel,
  loading,
}: PerformancePagesProps) {
  const [activeTab, setActiveTab] = useState<'path' | 'title'>('path');

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow border p-4 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex justify-between">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-12"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const displayData = data.slice(0, 10);

  return (
    <div className="bg-white border border-edge rounded-lg shadow-sm p-4 md:p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">网页</h2>

      {/* 选项卡: 路径 / 标题 */}
      <div className="flex items-center border-b border-gray-200 gap-6 mb-4">
        <button
          onClick={() => setActiveTab('path')}
          className={`text-sm font-medium py-2 border-b-2 -mb-[1px] transition-colors ${
            activeTab === 'path'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          路径
        </button>
        <button
          onClick={() => setActiveTab('title')}
          className={`text-sm font-medium py-2 border-b-2 -mb-[1px] transition-colors ${
            activeTab === 'title'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          标题
        </button>
      </div>

      {/* 列表头 */}
      <div className="flex justify-between items-center px-2 py-1 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
        <span>{activeTab === 'path' ? '路径' : '标题'}</span>
        <span>{metricLabel}</span>
      </div>

      {/* 数据列表 */}
      {displayData.length === 0 ? (
        <div className="py-8">
          <EmptyState message="暂无数据" />
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {displayData.map((item, index) => {
            const value = item[metricKey as keyof PagePerformance] as number || 0;
            return (
              <div key={index} className="flex justify-between items-center py-2 px-2 hover:bg-gray-50 rounded transition-colors">
                <span className="text-sm text-gray-700 truncate flex-1 mr-4">
                  {activeTab === 'path' ? item.path : (item.title || item.path)}
                </span>
                <span className="text-sm font-medium text-gray-900 whitespace-nowrap">
                  {value === 0 ? '-' : `${value} ms`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}