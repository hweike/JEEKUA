// app/admin/analytics/behavior/page.tsx

'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Repeat,
  MousePointerClick,
  Activity,
  ListFilter,
} from 'lucide-react';
import { PageHeader } from '@/components/admin/analytics/PageHeader';
import { StatsCards } from '@/components/admin/analytics/StatsCards';
import { TrendChart } from '@/components/admin/analytics/TrendChart';
import { EmptyState } from '@/components/admin/analytics/EmptyState';
import type { DateRange } from '@/components/admin/analytics/DateRangePicker';
import type { WebsiteStats, PageviewPoint } from '@/lib/umami';

// 行为类别统计类型
interface BehaviorStats extends WebsiteStats {
  events: number; // 独立事件数
}

// 4个核心指标卡片配置
const METRIC_CARDS = [
  { key: 'visitors', label: '访客', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
  { key: 'visits', label: '访问次数', icon: Repeat, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { key: 'events', label: '行为类别', icon: MousePointerClick, color: 'text-orange-600', bg: 'bg-orange-50' },
  { key: 'uniqueEvents', label: '独立事件', icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50' },
];

type TabKey = 'chart' | 'activity' | 'properties';

export default function BehaviorPage() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [startAt, setStartAt] = useState<number>(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [endAt, setEndAt] = useState<number>(Date.now());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('chart');

  // 数据状态
  const [stats, setStats] = useState<BehaviorStats | null>(null);
  const [pageviews, setPageviews] = useState<PageviewPoint[]>([]);

  // 活动日志数据（模拟，实际应从 events API 获取）
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [startAt, endAt]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, pageviewsRes] = await Promise.all([
        fetch(`/api/admin/analytics/stats?startAt=${startAt}&endAt=${endAt}`),
        fetch(`/api/admin/analytics/pageviews?startAt=${startAt}&endAt=${endAt}&unit=day`),
      ]);

      const statsData = await statsRes.json();
      const pageviewsData = await pageviewsRes.json();

      // 模拟行为类别数据（真实数据应从 events API 获取）
      setStats({
        ...statsData,
        events: statsData?.visits || 0,
        uniqueEvents: statsData?.visitors || 0,
      });
      setPageviews(Array.isArray(pageviewsData) ? pageviewsData : []);
    } catch (error) {
      console.error('Failed to fetch behavior data:', error);
      setStats(null);
      setPageviews([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (range: DateRange, start: number, end: number) => {
    setDateRange(range);
    setStartAt(start);
    setEndAt(end);
  };

  // 渲染指标卡片
  const renderMetricCards = () => {
    const cards = [
      { label: '访客', value: stats?.visitors ?? 0, change: 0 },
      { label: '访问次数', value: stats?.visits ?? 0, change: 0 },
      { label: '行为类别', value: stats?.events ?? 0, change: 0 },
      { label: '独立事件', value: stats?.uniqueEvents ?? 0, change: 0 },
    ];

    const icons = [Users, Repeat, MousePointerClick, Activity];
    const colors = ['text-blue-600 bg-blue-50', 'text-indigo-600 bg-indigo-50', 'text-orange-600 bg-orange-50', 'text-purple-600 bg-purple-50'];

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card, index) => {
          const Icon = icons[index];
          const colorClass = colors[index];
          return (
            <div key={index} className="bg-white p-4 rounded-lg shadow border">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg ${colorClass.split(' ')[1]}`}>
                  <Icon className={`w-5 h-5 ${colorClass.split(' ')[0]}`} />
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600">
                  +0%
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-semibold text-gray-900">
                  {card.value.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500">{card.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <PageHeader title="行为类别" dateRange={dateRange} onDateRangeChange={handleDateChange} />

      {/* 4个核心指标卡片 */}
      {renderMetricCards()}

      {/* 选项卡 */}
      <div className="bg-white border border-edge rounded-lg shadow-sm overflow-hidden">
        <div className="px-3 md:px-6 py-2 border-b border-edge flex items-center gap-6">
          <button
            onClick={() => setActiveTab('chart')}
            className={`text-sm font-medium py-2 border-b-2 -mb-[1px] transition-colors ${
              activeTab === 'chart'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            图表
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`text-sm font-medium py-2 border-b-2 -mb-[1px] transition-colors ${
              activeTab === 'activity'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            活动日志
          </button>
          <button
            onClick={() => setActiveTab('properties')}
            className={`text-sm font-medium py-2 border-b-2 -mb-[1px] transition-colors ${
              activeTab === 'properties'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            属性
          </button>
        </div>

        {/* 内容区 */}
        <div className="p-3 md:p-6">
          {loading ? (
            <div className="h-[400px] bg-gray-100 rounded animate-pulse"></div>
          ) : (
            <>
              {/* 图表选项卡 */}
              {activeTab === 'chart' && (
                <div className="space-y-6">
                  <TrendChart data={pageviews} loading={loading} height={400} />
                  <EmptyState message="暂无事件数据。" />
                </div>
              )}

              {/* 活动日志选项卡 */}
              {activeTab === 'activity' && (
                <div className="text-gray-400 text-center py-12">
                  暂无活动数据。
                </div>
              )}

              {/* 属性选项卡 */}
              {activeTab === 'properties' && (
                <div className="text-gray-400 text-center py-12">
                  暂无属性数据。
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}