// components/admin/analytics/CompareTrendChart.tsx

'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { PageviewPoint } from '@/lib/umami';

interface CompareTrendChartProps {
  currentData: PageviewPoint[];
  prevData: PageviewPoint[];
  currentLabel: string;
  prevLabel: string;
  loading?: boolean;
  height?: number;
}

export function CompareTrendChart({
  currentData,
  prevData,
  currentLabel,
  prevLabel,
  loading,
  height = 400,
}: CompareTrendChartProps) {
  if (loading) {
    return (
      <div className="bg-white p-4 rounded-lg shadow border animate-pulse">
        <div className="h-[400px] bg-gray-100 rounded"></div>
      </div>
    );
  }

  // 合并数据，按日期对齐
  const allPoints = [...currentData, ...prevData];
  const dateMap = new Map<string, {
    date: string;
    currentVisitors: number;
    prevVisitors: number;
    currentPageviews: number;
    prevPageviews: number;
  }>();

  // 对当前数据
  currentData.forEach(point => {
    const date = new Date(point.x).toISOString().slice(0, 10);
    if (!dateMap.has(date)) {
      dateMap.set(date, {
        date,
        currentVisitors: 0,
        prevVisitors: 0,
        currentPageviews: 0,
        prevPageviews: 0,
      });
    }
    const entry = dateMap.get(date)!;
    // 注意：PageviewPoint 的 y 表示的是浏览量还是访客数？在 Umami 中，pageviews 返回的是浏览量
    // 但我们也可能想显示访客数，但 pageviews API 没有区分，所以我们这里用 y 作为浏览量
    // 为了显示访客数，我们需要另一个 API，但这里我们只显示浏览量对比（与 Umami 一致）
    // Umami 的比较趋势图显示的是 "浏览量 (先前)" 和 "浏览量"，以及 "访客 (先前)" 和 "访客"
    // 但我们只有 pageviews 的 y，所以我们只显示浏览量对比
    // 实际项目中，如果需要访客数，可以调用 visitors 相关 API
    entry.currentPageviews += point.y;
  });

  prevData.forEach(point => {
    const date = new Date(point.x).toISOString().slice(0, 10);
    if (!dateMap.has(date)) {
      dateMap.set(date, {
        date,
        currentVisitors: 0,
        prevVisitors: 0,
        currentPageviews: 0,
        prevPageviews: 0,
      });
    }
    const entry = dateMap.get(date)!;
    entry.prevPageviews += point.y;
  });

  // 转为数组并按日期排序
  const chartData = Array.from(dateMap.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(item => ({
      ...item,
      date: new Date(item.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
    }));

  if (chartData.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow border flex items-center justify-center h-[400px] text-gray-400">
        暂无数据
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow border">
      <h3 className="text-sm font-medium text-gray-700 mb-4">趋势对比</h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} tickMargin={8} />
          <YAxis tick={{ fontSize: 12 }} tickMargin={8} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '8px 12px',
            }}
            labelStyle={{ fontWeight: 'medium' }}
          />
          <Legend />
          {/* 当前浏览量 */}
          <Line
            type="monotone"
            dataKey="currentPageviews"
            name={`浏览量 (${currentLabel})`}
            stroke="#2680eb"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6 }}
          />
          {/* 先前浏览量 */}
          <Line
            type="monotone"
            dataKey="prevPageviews"
            name={`浏览量 (${prevLabel})`}
            stroke="#8601b0"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}