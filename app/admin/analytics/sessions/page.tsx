// app/admin/analytics/sessions/page.tsx

'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, LayoutGrid, List, X } from 'lucide-react';
import { PageHeader } from '@/components/admin/analytics/PageHeader';
import { SessionsTable } from '@/components/admin/analytics/SessionsTable';
import { MetricsChart } from '@/components/admin/analytics/MetricsChart';
import type { DateRange } from '@/components/admin/analytics/DateRangePicker';
import type { MetricItem } from '@/lib/umami';

type TabType = 'activity' | 'properties';

export default function SessionsPage() {
  const [dateRange, setDateRange] = useState<DateRange>('24hour');
  const [startAt, setStartAt] = useState<number>(Date.now() - 24 * 60 * 60 * 1000);
  const [endAt, setEndAt] = useState<number>(Date.now());
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  
  // 选项卡状态
  const [activeTab, setActiveTab] = useState<TabType>('activity');
  
  // 搜索状态
  const [searchQuery, setSearchQuery] = useState('');
  
  // 视图模式: 'list' | 'grid'
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  
  // 属性数据（用于"属性"选项卡）
  const [browserData, setBrowserData] = useState<MetricItem[]>([]);
  const [osData, setOsData] = useState<MetricItem[]>([]);
  const [deviceData, setDeviceData] = useState<MetricItem[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);

  const handleDateChange = (range: DateRange, start: number, end: number) => {
    setDateRange(range);
    setStartAt(start);
    setEndAt(end);
    setPage(1);
  };

  // 加载属性数据（切换到"属性"选项卡时加载）
  useEffect(() => {
    if (activeTab === 'properties') {
      fetchPropertiesData();
    }
  }, [activeTab, startAt, endAt]);

  const fetchPropertiesData = async () => {
    setLoadingProperties(true);
    try {
      const [browserRes, osRes, deviceRes] = await Promise.all([
        fetch(`/api/admin/analytics/metrics?startAt=${startAt}&endAt=${endAt}&type=browser&limit=8`),
        fetch(`/api/admin/analytics/metrics?startAt=${startAt}&endAt=${endAt}&type=os&limit=6`),
        fetch(`/api/admin/analytics/metrics?startAt=${startAt}&endAt=${endAt}&type=device&limit=5`),
      ]);

      setBrowserData(await browserRes.json());
      setOsData(await osRes.json());
      setDeviceData(await deviceRes.json());
    } catch (error) {
      console.error('Failed to fetch properties data:', error);
      setBrowserData([]);
      setOsData([]);
      setDeviceData([]);
    } finally {
      setLoadingProperties(false);
    }
  };

  // 过滤会话（搜索功能由 SessionsTable 内部处理，但我们可以传递搜索参数）
  // 由于 SessionsTable 目前不支持搜索，我们通过 key 强制刷新

  return (
    <div className="space-y-6">
      {/* 页面头部（含日期选择器） */}
      <PageHeader 
        title="会话" 
        dateRange={dateRange} 
        onDateRangeChange={handleDateChange}
      />

      {/* 会话内容区域 */}
      <div className="bg-white border border-edge rounded-lg shadow-sm overflow-hidden">
        {/* 选项卡导航 */}
        <div className="flex items-center border-b border-gray-200 px-4 md:px-6 gap-6">
          <button
            onClick={() => setActiveTab('activity')}
            className={`text-sm font-medium py-3 border-b-2 -mb-[1px] transition-colors ${
              activeTab === 'activity'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            活动日志
          </button>
          <button
            onClick={() => setActiveTab('properties')}
            className={`text-sm font-medium py-3 border-b-2 -mb-[1px] transition-colors ${
              activeTab === 'properties'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            属性
          </button>
        </div>

        {/* 内容区域 */}
        <div className="p-4 md:p-6">
          {activeTab === 'activity' ? (
            // === 活动日志选项卡 ===
            <div className="flex flex-col gap-4">
              {/* 工具栏：搜索 + 视图切换 */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="搜索"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded transition-colors ${
                      viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'
                    }`}
                    title="列表视图"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded transition-colors ${
                      viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'
                    }`}
                    title="网格视图"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 会话列表 */}
              <SessionsTable 
                startAt={startAt} 
                endAt={endAt} 
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                searchQuery={searchQuery}
              />
            </div>
          ) : (
            // === 属性选项卡 ===
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <MetricsChart 
                  data={browserData} 
                  title="浏览器分布" 
                  loading={loadingProperties} 
                />
                <MetricsChart 
                  data={osData} 
                  title="操作系统分布" 
                  loading={loadingProperties} 
                />
                <MetricsChart 
                  data={deviceData} 
                  title="设备分布" 
                  loading={loadingProperties} 
                />
              </div>
              {!loadingProperties && browserData.length === 0 && osData.length === 0 && deviceData.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  暂无数据
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}