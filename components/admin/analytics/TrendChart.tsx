// components/admin/analytics/TrendChart.tsx

'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { PageviewPoint } from '@/lib/umami';

interface TrendChartProps {
  data: PageviewPoint[];
  loading?: boolean;
  height?: number;
}

export function TrendChart({ data, loading, height = 300 }: TrendChartProps) {
  if (loading) {
    return (
      <div className="bg-white p-4 rounded-lg shadow border animate-pulse">
        <div className="h-[300px] bg-gray-100 rounded"></div>
      </div>
    );
  }

  // ✅ 关键：确保 data 是数组且长度 > 0
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow border flex items-center justify-center h-[300px] text-gray-400">
        暂无数据
      </div>
    );
  }

  const chartData = data.map(item => ({
    date: new Date(item.x).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
    visitors: item.y,
    timestamp: item.x,
  }));

  return (
    <div className="bg-white p-4 rounded-lg shadow border">
      <h3 className="text-sm font-medium mb-4 text-gray-700">访问趋势</h3>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            tickMargin={8}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickMargin={8}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '8px 12px',
            }}
            labelStyle={{ fontWeight: 'medium' }}
            formatter={(value: number) => [value, '访客数']}
          />
          <Area
            type="monotone"
            dataKey="visitors"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#colorVisitors)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}