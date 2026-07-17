// app/admin/analytics/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/admin/analytics/PageHeader';
import { StatsCards } from '@/components/admin/analytics/StatsCards';
import { TrendChart } from '@/components/admin/analytics/TrendChart';
import { MetricsTabs } from '@/components/admin/analytics/MetricsTabs';
import { LocationCard } from '@/components/admin/analytics/LocationCard';
import { Heatmap } from '@/components/admin/analytics/Heatmap';
import type { DateRange } from '@/components/admin/analytics/DateRangePicker';
import type { WebsiteStats, PageviewPoint, MetricItem } from '@/lib/umami';

export default function AnalyticsOverviewPage() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [startAt, setStartAt] = useState<number>(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [endAt, setEndAt] = useState<number>(Date.now());
  
  // 核心指标数据
  const [stats, setStats] = useState<WebsiteStats | null>(null);
  const [pageviews, setPageviews] = useState<PageviewPoint[]>([]);
  const [loading, setLoading] = useState(true);

  // 位置数据（用于世界地图和位置列表）
  const [countryData, setCountryData] = useState<MetricItem[]>([]);
  const [cityData, setCityData] = useState<MetricItem[]>([]);
  // Umami 不支持 region，暂时留空
  const [regionData] = useState<MetricItem[]>([]);

  useEffect(() => {
    fetchData();
  }, [startAt, endAt]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 并行请求所有数据
      const [
        statsRes,
        pageviewsRes,
        countryRes,
        cityRes,
      ] = await Promise.all([
        fetch(`/api/admin/analytics/stats?startAt=${startAt}&endAt=${endAt}`),
        fetch(`/api/admin/analytics/pageviews?startAt=${startAt}&endAt=${endAt}&unit=day`),
        fetch(`/api/admin/analytics/metrics?startAt=${startAt}&endAt=${endAt}&type=country&limit=50`),
        fetch(`/api/admin/analytics/metrics?startAt=${startAt}&endAt=${endAt}&type=city&limit=20`),
      ]);

      const statsData = await statsRes.json();
      const pageviewsData = await pageviewsRes.json();
      const countryDataRaw = await countryRes.json();
      const cityDataRaw = await cityRes.json();

      // 安全设置状态
      setStats(statsData);
      setPageviews(Array.isArray(pageviewsData) ? pageviewsData : []);
      setCountryData(Array.isArray(countryDataRaw) ? countryDataRaw : []);
      setCityData(Array.isArray(cityDataRaw) ? cityDataRaw : []);
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
      // 出错时设置为空数据，避免白屏
      setStats(null);
      setPageviews([]);
      setCountryData([]);
      setCityData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (range: DateRange, start: number, end: number) => {
    setDateRange(range);
    setStartAt(start);
    setEndAt(end);
  };

  // 选项卡配置
  const pageTabs = [
    { key: 'path', label: '路径' },
    { key: 'fullPath', label: 'URL' },
    { key: 'entry', label: '入口 URL' },
    { key: 'exit', label: '退出 URL' },
  ];
  const sourceTabs = [
    { key: 'referrer', label: '来源域名' },
    { key: 'channel', label: '渠道' },
  ];
  const environmentTabs = [
    { key: 'browser', label: '浏览器' },
    { key: 'os', label: '操作系统' },
    { key: 'device', label: '设备' },
  ];

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <PageHeader title="概览" dateRange={dateRange} onDateRangeChange={handleDateChange} />

      {/* 核心指标 (5项: 访客、访问次数、浏览量、跳出率、平均时长) */}
      <StatsCards stats={stats} loading={loading} />

      {/* 趋势图（访客 + 浏览量双线） */}
      <TrendChart data={pageviews} loading={loading} />

      {/* 1. 网页分析 + 来源分析 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MetricsTabs title="网页" tabs={pageTabs} loading={loading} />
        <MetricsTabs title="来源" tabs={sourceTabs} loading={loading} />
      </div>

      {/* 2. 环境分析 + 位置分析（含世界地图） */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MetricsTabs title="环境" tabs={environmentTabs} loading={loading} />
        <LocationCard 
          countryData={countryData}
          regionData={regionData}
          cityData={cityData}
          loading={loading}
        />
      </div>

      {/* 3. 流量热图（7天×24小时） */}
      <Heatmap data={pageviews} loading={loading} />
    </div>
  );
}