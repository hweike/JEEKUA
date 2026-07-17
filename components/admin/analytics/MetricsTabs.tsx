// components/admin/analytics/MetricsTabs.tsx

'use client';

import { useState } from 'react';
import { EmptyState } from './EmptyState';

interface TabItem {
  key: string;
  label: string;
}

interface MetricsTabsProps {
  title: string;
  tabs: TabItem[];
  loading?: boolean;
}

export function MetricsTabs({ title, tabs, loading }: MetricsTabsProps) {
  const [activeKey, setActiveKey] = useState(tabs[0]?.key || '');

  if (loading) {
    return (
      <div className="bg-white p-4 rounded-lg shadow border animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-[70px] bg-gray-100 rounded"></div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-edge rounded-lg px-3 md:px-6 py-6 relative flex flex-col gap-4 shadow-sm">
      <h2 className="font-semibold tracking-tight text-xl text-gray-800">{title}</h2>
      <div className="flex items-center border-b border-gray-200 gap-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveKey(tab.key)}
            className={`text-sm font-medium py-2 border-b-2 -mb-[1px] transition-colors ${
              activeKey === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {/* 内容区：展示空状态 */}
      <div className="py-4">
        <EmptyState />
      </div>
    </div>
  );
}