// components/admin/analytics/LocationCard.tsx

'use client';

import { useState } from 'react';
import { WorldMap } from './WorldMap';
import { EmptyState } from './EmptyState';
import type { MetricItem } from '@/lib/umami';

interface LocationCardProps {
  countryData: MetricItem[];
  regionData: MetricItem[];
  cityData: MetricItem[];
  loading?: boolean;
}

type TabKey = 'country' | 'region' | 'city';

export function LocationCard({ countryData, regionData, cityData, loading }: LocationCardProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('country');

  const getCurrentData = () => {
    switch (activeTab) {
      case 'country': return countryData;
      case 'region': return regionData;
      case 'city': return cityData;
      default: return [];
    }
  };

  const currentData = getCurrentData();

  return (
    <div className="bg-white border border-edge rounded-lg px-3 md:px-6 py-6 relative flex flex-col gap-4 shadow-sm">
      <h2 className="font-semibold tracking-tight text-xl text-gray-800">位置</h2>
      
      {/* 选项卡 */}
      <div className="flex items-center border-b border-gray-200 gap-6">
        {[
          { key: 'country', label: '国家/地区' },
          { key: 'region', label: '州/省' },
          { key: 'city', label: '市/县' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as TabKey)}
            className={`text-sm font-medium py-2 border-b-2 -mb-[1px] transition-colors ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      <div className="mt-2">
        {loading ? (
          <div className="h-[400px] bg-gray-100 rounded animate-pulse"></div>
        ) : (
          <>
            {/* 国家/地区显示地图 */}
            {activeTab === 'country' && <WorldMap data={countryData} loading={loading} />}
            {/* 其他选项卡显示列表或空状态 */}
            {(activeTab === 'region' || activeTab === 'city') && (
              <>
                {currentData.length === 0 ? (
                  <EmptyState message="暂无数据。" />
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
                    {currentData.slice(0, 10).map((item, idx) => (
                      <div key={idx} className="flex justify-between py-1 border-b border-gray-100">
                        <span className="text-sm text-gray-700">{item.x || '未知'}</span>
                        <span className="text-sm font-medium text-gray-900">{item.y}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}