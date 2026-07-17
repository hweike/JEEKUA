// app/admin/analytics/audience/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/admin/analytics/PageHeader';
import { MetricsChart } from '@/components/admin/analytics/MetricsChart';
import type { DateRange } from '@/components/admin/analytics/DateRangePicker';
import type { MetricItem } from '@/lib/umami';

export default function AudiencePage() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [startAt, setStartAt] = useState<number>(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [endAt, setEndAt] = useState<number>(Date.now());
  
  const [countryData, setCountryData] = useState<MetricItem[]>([]);
  const [cityData, setCityData] = useState<MetricItem[]>([]);
  const [languageData, setLanguageData] = useState<MetricItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [startAt, endAt]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [countryRes, cityRes, languageRes] = await Promise.all([
        fetch(`/api/admin/analytics/metrics?startAt=${startAt}&endAt=${endAt}&type=country&limit=10`),
        fetch(`/api/admin/analytics/metrics?startAt=${startAt}&endAt=${endAt}&type=city&limit=10`),
        fetch(`/api/admin/analytics/metrics?startAt=${startAt}&endAt=${endAt}&type=language&limit=8`),
      ]);

      // 安全解析 JSON，如果失败则使用空数组
      let countries: MetricItem[] = [];
      let cities: MetricItem[] = [];
      let languages: MetricItem[] = [];

      try {
        countries = await countryRes.json();
      } catch {
        // ignore
      }
      try {
        cities = await cityRes.json();
      } catch {
        // ignore
      }
      try {
        languages = await languageRes.json();
      } catch {
        // ignore
      }

      // 确保是数组
      setCountryData(Array.isArray(countries) ? countries : []);
      setCityData(Array.isArray(cities) ? cities : []);
      setLanguageData(Array.isArray(languages) ? languages : []);
    } catch (error) {
      console.error('Failed to fetch audience data:', error);
      // 出错时全部置为空数组
      setCountryData([]);
      setCityData([]);
      setLanguageData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (range: DateRange, start: number, end: number) => {
    setDateRange(range);
    setStartAt(start);
    setEndAt(end);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="受众 - 细分" dateRange={dateRange} onDateRangeChange={handleDateChange} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MetricsChart data={countryData} title="国家/地区分布" loading={loading} />
        <MetricsChart data={cityData} title="城市分布" loading={loading} />
        <MetricsChart data={languageData} title="语言分布" loading={loading} />
      </div>
    </div>
  );
}