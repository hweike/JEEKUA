// components/admin/analytics/RealtimeChart.tsx

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

interface RealtimeChartProps {
  data: PageviewPoint[];
  loading?: boolean;
  height?: number;
}

export function RealtimeChart({ data, loading, height = 300 }: RealtimeChartProps) {
  if (loading) {
    return (
      <div className="bg-white p-4 rounded-lg shadow border animate-pulse">
        <div className="h-[300px] bg-gray-100 rounded"></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow border flex items-center justify-center h-[300px] text-gray-400">
        暂无实时数据
      </div>
    );
  }

  const chartData = data.map(item => ({
    time: new Date(item.x).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    visitors: item.y,
    timestamp: item.x,
  }));

  return (
    <div className="bg-white p-4 rounded-lg shadow border">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium text-gray-700">实时访问趋势</h3>
        <span className="text-xs text-gray-400">最近30分钟</span>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="realtimeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="time" tick={{ fontSize: 12 }} tickMargin={8} />
          <YAxis tick={{ fontSize: 12 }} tickMargin={8} allowDecimals={false} />
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
            fill="url(#realtimeGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex justify-center mt-3">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="inline-block w-3 h-3 bg-blue-500 rounded-full"></span>
          <span>访客</span>
        </div>
      </div>
    </div>
  );
}