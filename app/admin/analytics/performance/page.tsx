// app/admin/analytics/performance/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/admin/analytics/PageHeader';
import { PerformanceMetrics } from '@/components/admin/analytics/PerformanceMetrics';
import { PerformanceTrendChart } from '@/components/admin/analytics/PerformanceTrendChart';
import { PerformancePages } from '@/components/admin/analytics/PerformancePages';
import { PerformanceEnvironment } from '@/components/admin/analytics/PerformanceEnvironment';
import type { DateRange } from '@/components/admin/analytics/DateRangePicker';
import type { PageviewPoint } from '@/lib/umami';

// 性能数据类型
export interface PerformanceDataPoint {
  x: number; // 时间戳
  p50: number;
  p75: number;
  p95: number;
}

export interface PerformanceMetric {
  key: 'lcp' | 'inp' | 'cls' | 'fcp' | 'ttfb';
  label: string;
  unit: string;
  value: number;
  status: 'good' | 'needsImprovement' | 'poor';
  sampleCount?: number;
}

export type Percentile = 'p50' | 'p75' | 'p95';

export default function PerformancePage() {
  const [dateRange, setDateRange] = useState<DateRange>('24hour');
  const [startAt, setStartAt] = useState<number>(Date.now() - 24 * 60 * 60 * 1000);
  const [endAt, setEndAt] = useState<number>(Date.now());
  
  // 分位数选择
  const [percentile, setPercentile] = useState<Percentile>('p75');
  
  // 当前选中的指标 (默认 LCP)
  const [selectedMetric, setSelectedMetric] = useState<string>('lcp');
  
  // 数据状态
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([
    { key: 'lcp', label: 'LCP', unit: 'ms', value: 0, status: 'good' },
    { key: 'inp', label: 'INP', unit: 'ms', value: 0, status: 'good' },
    { key: 'cls', label: 'CLS', unit: '', value: 0, status: 'good' },
    { key: 'fcp', label: 'FCP', unit: 'ms', value: 0, status: 'good' },
    { key: 'ttfb', label: 'TTFB', unit: 'ms', value: 0, status: 'good' },
  ]);
  const [trendData, setTrendData] = useState<PerformanceDataPoint[]>([]);
  const [pageData, setPageData] = useState<any[]>([]);
  const [environmentData, setEnvironmentData] = useState<any[]>([]);
  const [sampleCount, setSampleCount] = useState(0);

  useEffect(() => {
    fetchPerformanceData();
  }, [startAt, endAt, selectedMetric]);

  const fetchPerformanceData = async () => {
    setLoading(true);
    try {
      // 注意：Umami 的 Web Vitals 数据需要通过追踪脚本的 data-collect-vitals 属性收集
      // 这里调用 Umami API 获取性能数据 (需要 Umami 实例支持)
      // 由于 Umami API 可能没有直接的 Web Vitals 端点，这里使用模拟数据展示空状态
      
      // 实际项目中，你需要调用 Umami 的性能 API
      // 示例: fetch(`/api/admin/analytics/performance?startAt=${startAt}&endAt=${endAt}&metric=${selectedMetric}`)
      
      // 模拟空数据 (与 Umami 空数据行为一致)
      setMetrics([
        { key: 'lcp', label: 'LCP', unit: 'ms', value: 0, status: 'good' },
        { key: 'inp', label: 'INP', unit: 'ms', value: 0, status: 'good' },
        { key: 'cls', label: 'CLS', unit: '', value: 0, status: 'good' },
        { key: 'fcp', label: 'FCP', unit: 'ms', value: 0, status: 'good' },
        { key: 'ttfb', label: 'TTFB', unit: 'ms', value: 0, status: 'good' },
      ]);
      setTrendData([]);
      setPageData([]);
      setEnvironmentData([]);
      setSampleCount(0);
    } catch (error) {
      console.error('Failed to fetch performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (range: DateRange, start: number, end: number) => {
    setDateRange(range);
    setStartAt(start);
    setEndAt(end);
  };

  const handleMetricSelect = (metricKey: string) => {
    setSelectedMetric(metricKey);
  };

  const handlePercentileChange = (value: Percentile) => {
    setPercentile(value);
  };

  const selectedMetricLabel = metrics.find(m => m.key === selectedMetric)?.label || 'LCP';

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <PageHeader title="性能" dateRange={dateRange} onDateRangeChange={handleDateChange} />

      {/* 性能指标卡片 (5个 Core Web Vitals) */}
      <PerformanceMetrics
        metrics={metrics}
        selectedMetric={selectedMetric}
        onMetricSelect={handleMetricSelect}
        loading={loading}
      />

      {/* Percentile 选择器 + 趋势图 */}
      <PerformanceTrendChart
        data={trendData}
        metricLabel={selectedMetricLabel}
        percentile={percentile}
        onPercentileChange={handlePercentileChange}
        sampleCount={sampleCount}
        loading={loading}
      />

      {/* 网页列表 + 环境列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PerformancePages
          data={pageData}
          metricKey={selectedMetric}
          metricLabel={selectedMetricLabel}
          loading={loading}
        />
        <PerformanceEnvironment
          data={environmentData}
          metricKey={selectedMetric}
          metricLabel={selectedMetricLabel}
          loading={loading}
        />
      </div>
    </div>
  );
}