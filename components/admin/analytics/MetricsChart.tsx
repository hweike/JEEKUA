// components/admin/analytics/MetricsChart.tsx

'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { MetricItem } from '@/lib/umami';

interface MetricsChartProps {
  data: MetricItem[];
  title: string;
  loading?: boolean;
  height?: number;
  colors?: string[];
}

const DEFAULT_COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#e0e7ff'];

export function MetricsChart({
  data,
  title,
  loading,
  height = 200,
  colors = DEFAULT_COLORS,
}: MetricsChartProps) {
  if (loading) {
    return (
      <div className="bg-white p-4 rounded-lg shadow border animate-pulse">
        <div className="h-[200px] bg-gray-100 rounded"></div>
      </div>
    );
  }

  // ✅ 关键：确保 data 是数组且长度 > 0
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow border flex items-center justify-center h-[200px] text-gray-400">
        暂无数据
      </div>
    );
  }

  const chartData = data.map(item => ({
    name: item.x || '未知',
    value: item.y,
  }));

  const displayData = chartData.slice(0, 10);

  return (
    <div className="bg-white p-4 rounded-lg shadow border">
      <h3 className="text-sm font-medium mb-3 text-gray-700">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={displayData} layout="vertical" margin={{ left: 80, right: 20, top: 5, bottom: 5 }}>
          <XAxis type="number" tick={{ fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12 }}
            width={70}
            interval={0}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '8px 12px',
            }}
            formatter={(value: number) => [value, '访问量']}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {displayData.map((_, index) => (
              <Cell key={index} fill={colors[index % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}