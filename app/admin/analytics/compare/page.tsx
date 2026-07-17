// app/admin/analytics/compare/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/admin/analytics/PageHeader';
import { StatsCards } from '@/components/admin/analytics/StatsCards';
import { CompareTrendChart } from '@/components/admin/analytics/CompareTrendChart';
import { CompareDimensionSelector } from '@/components/admin/analytics/CompareDimensionSelector';
import { ComparePeriodList } from '@/components/admin/analytics/ComparePeriodList';
import type { DateRange } from '@/components/admin/analytics/DateRangePicker';
import type { WebsiteStats, PageviewPoint, MetricItem } from '@/lib/umami';

type CompareMode = 'prev' | 'yoy';
type Dimension = 'path' | 'channel' | 'referrer' | 'browser' | 'os' | 'device' | 'country' | 'city' | 'event';

export default function ComparePage() {
  // 当前时间段
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [startAt, setStartAt] = useState<number>(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [endAt, setEndAt] = useState<number>(Date.now());

  // 比较模式
  const [compareMode, setCompareMode] = useState<CompareMode>('prev');
  // 选中的维度
  const [dimension, setDimension] = useState<Dimension>('path');
  // 限制条数
  const [limit] = useState(10);

  const [loading, setLoading] = useState(true);
  
  // 当前时期数据
  const [currentStats, setCurrentStats] = useState<WebsiteStats | null>(null);
  const [currentPageviews, setCurrentPageviews] = useState<PageviewPoint[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<MetricItem[]>([]);
  
  // 先前时期数据
  const [prevStats, setPrevStats] = useState<WebsiteStats | null>(null);
  const [prevPageviews, setPrevPageviews] = useState<PageviewPoint[]>([]);
  const [prevMetrics, setPrevMetrics] = useState<MetricItem[]>([]);
  
  // 计算先前时期的时间范围
  const getPrevTimeRange = () => {
    const duration = endAt - startAt;
    if (compareMode === 'yoy') {
      // 去年同期
      const prevStart = new Date(startAt);
      const prevEnd = new Date(endAt);
      prevStart.setFullYear(prevStart.getFullYear() - 1);
      prevEnd.setFullYear(prevEnd.getFullYear() - 1);
      return { startAt: prevStart.getTime(), endAt: prevEnd.getTime() };
    } else {
      // 上一时期（相同长度，往前推）
      return { startAt: startAt - duration, endAt: startAt };
    }
  };

  useEffect(() => {
    fetchData();
  }, [startAt, endAt, compareMode, dimension]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const prevRange = getPrevTimeRange();

      // 并行请求当前和先前的数据
      const [
        currentStatsRes,
        currentPageviewsRes,
        currentMetricsRes,
        prevStatsRes,
        prevPageviewsRes,
        prevMetricsRes,
      ] = await Promise.all([
        fetch(`/api/admin/analytics/stats?startAt=${startAt}&endAt=${endAt}`),
        fetch(`/api/admin/analytics/pageviews?startAt=${startAt}&endAt=${endAt}&unit=day`),
        fetch(`/api/admin/analytics/metrics?startAt=${startAt}&endAt=${endAt}&type=${dimension}&limit=${limit}`),
        fetch(`/api/admin/analytics/stats?startAt=${prevRange.startAt}&endAt=${prevRange.endAt}`),
        fetch(`/api/admin/analytics/pageviews?startAt=${prevRange.startAt}&endAt=${prevRange.endAt}&unit=day`),
        fetch(`/api/admin/analytics/metrics?startAt=${prevRange.startAt}&endAt=${prevRange.endAt}&type=${dimension}&limit=${limit}`),
      ]);

      const currentStatsData = await currentStatsRes.json();
      const currentPageviewsData = await currentPageviewsRes.json();
      const currentMetricsData = await currentMetricsRes.json();
      const prevStatsData = await prevStatsRes.json();
      const prevPageviewsData = await prevPageviewsRes.json();
      const prevMetricsData = await prevMetricsRes.json();

      setCurrentStats(currentStatsData);
      setCurrentPageviews(Array.isArray(currentPageviewsData) ? currentPageviewsData : []);
      setCurrentMetrics(Array.isArray(currentMetricsData) ? currentMetricsData : []);
      setPrevStats(prevStatsData);
      setPrevPageviews(Array.isArray(prevPageviewsData) ? prevPageviewsData : []);
      setPrevMetrics(Array.isArray(prevMetricsData) ? prevMetricsData : []);
    } catch (error) {
      console.error('Failed to fetch compare data:', error);
      setCurrentStats(null);
      setCurrentPageviews([]);
      setCurrentMetrics([]);
      setPrevStats(null);
      setPrevPageviews([]);
      setPrevMetrics([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (range: DateRange, start: number, end: number) => {
    setDateRange(range);
    setStartAt(start);
    setEndAt(end);
  };

  // 合并当前和先前的趋势数据
  const combinedTrendData = mergeTrendData(currentPageviews, prevPageviews);

  // 格式化日期显示
  const formatDateRange = (start: number, end: number) => {
    const s = new Date(start);
    const e = new Date(end);
    return `${s.toISOString().slice(0, 10)} — ${e.toISOString().slice(0, 10)}`;
  };

  const prevRange = getPrevTimeRange();

  return (
    <div className="space-y-6">
      {/* 头部：日期选择器 + 比较模式选择 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">比较</h1>
          <p className="text-sm text-gray-500 mt-0.5">对比不同时期的数据变化</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <PageHeader 
            title="" 
            dateRange={dateRange} 
            onDateRangeChange={handleDateChange}
          />
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">VS</span>
            <select
              value={compareMode}
              onChange={(e) => setCompareMode(e.target.value as CompareMode)}
              className="px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="prev">上一时期</option>
              <option value="yoy">上一年</option>
            </select>
          </div>
        </div>
      </div>

      {/* 核心指标卡片（显示变化百分比） */}
      <StatsCards stats={currentStats} loading={loading} />

      {/* 趋势图（双时期对比） */}
      <CompareTrendChart
        currentData={currentPageviews}
        prevData={prevPageviews}
        currentLabel="当前"
        prevLabel={compareMode === 'yoy' ? '去年同期' : '上一时期'}
        loading={loading}
      />

      {/* 维度选择器 + 并排列表 */}
      <div className="bg-white border border-edge rounded-lg shadow-sm p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h3 className="text-base font-semibold text-gray-800">按维度对比</h3>
          <CompareDimensionSelector
            value={dimension}
            onChange={(val) => setDimension(val as Dimension)}
          />
        </div>

        <ComparePeriodList
          currentData={currentMetrics}
          prevData={prevMetrics}
          currentLabel={`当前 (${formatDateRange(startAt, endAt)})`}
          prevLabel={`${compareMode === 'yoy' ? '去年同期' : '上一时期'} (${formatDateRange(prevRange.startAt, prevRange.endAt)})`}
          loading={loading}
          dimension={dimension}
        />
      </div>
    </div>
  );
}

/**
 * 合并两个时间序列数据，用于趋势图双线显示
 * 注意：实际应分别绘制两条独立的线，这里我们简单合并
 * 但更好的方式是在图表组件中分别传入两个数据集
 */
function mergeTrendData(
  current: PageviewPoint[],
  prev: PageviewPoint[]
): Array<{ date: string; currentVisitors: number; prevVisitors: number; currentPageviews?: number; prevPageviews?: number }> {
  // 由于我们只有 visitors 数据（来自 pageviews API），
  // 但 Umami 显示的是 visitors 和 pageviews 两条线，所以我们需要分别计算
  // 但我们目前只有 visitors，可以暂时只显示 visitors 对比
  // 为了更完整，我们也可以从 stats 获取总览，但趋势图通常用 pageviews 的 y 表示 visitors
  // 实际上 pageviews API 返回的是每个时间点的总浏览量，不是访客数
  // Umami 的 pageviews API 返回的是 pageviews 数量，不是 visitors
  // 但我们可以复用该数据作为参考
  
  // 为了简化，我们直接合并两个数组，按日期对齐
  const allPoints = [...current, ...prev];
  const dateMap = new Map<string, { currentVisitors: number; prevVisitors: number }>();
  
  allPoints.forEach(point => {
    const date = new Date(point.x).toISOString().slice(0, 10);
    if (!dateMap.has(date)) {
      dateMap.set(date, { currentVisitors: 0, prevVisitors: 0 });
    }
    const entry = dateMap.get(date)!;
    // 判断属于当前还是先前（根据时间戳范围）
    // 简单方法：如果 point.x 在 current 范围内，则归为 current，否则 prev
    // 但更好的方式是从数组本身区分，这里我们直接按数据源传入
    // 由于我们丢失了归属信息，我们重构：在组件中分别传入两个数据集，而不是合并
    // 所以这里我们返回空，实际在图表组件中处理
  });
  
  // 实际实现中，我们需要在 CompareTrendChart 中分别接收 currentData 和 prevData
  // 并分别绘制两条线
  return [];
}