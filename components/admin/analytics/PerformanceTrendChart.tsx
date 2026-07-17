// components/admin/analytics/PerformanceTrendChart.tsx

'use client';

import { useState } from 'react';
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
import { ChevronDown } from 'lucide-react';
import type { Percentile, PerformanceDataPoint } from '@/app/admin/analytics/performance/page';

interface PerformanceTrendChartProps {
  data: PerformanceDataPoint[];
  metricLabel: string;
  percentile: Percentile;
  onPercentileChange: (value: Percentile) => void;
  sampleCount?: number;
  loading?: boolean;
  height?: number;
}

const PERCENTILE_OPTIONS: { value: Percentile; label: string }[] = [
  { value: 'p50', label: 'p50 — Median' },
  { value: 'p75', label: 'p75 — 75th Percentile' },
  { value: 'p95', label: 'p95 — 95th Percentile' },
];

const PERCENTILE_COLORS = {
  p50: 'rgba(38, 128, 235, 0.8)',
  p75: 'rgba(146, 86, 217, 0.8)',
  p95: 'rgba(68, 181, 86, 0.8)',
};

export function PerformanceTrendChart({
  data,
  metricLabel,
  percentile,
  onPercentileChange,
  sampleCount = 0,
  loading,
  height = 400,
}: PerformanceTrendChartProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (loading) {
    return (
      <div className="bg-white p-4 rounded-lg shadow border animate-pulse">
        <div className="h-[400px] bg-gray-100 rounded"></div>
      </div>
    );
  }

  const currentOption = PERCENTILE_OPTIONS.find(opt => opt.value === percentile) || PERCENTILE_OPTIONS[0];

  // 转换数据格式
  const chartData = data.map(point => ({
    date: new Date(point.x).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    p50: point.p50,
    p75: point.p75,
    p95: point.p95,
    timestamp: point.x,
  }));

  const hasData = data.length > 0;

  return (
    <div className="bg-white border border-edge rounded-lg shadow-sm p-4 md:p-6">
      {/* 头部：标题 + Percentile 选择器 + 样本量 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-bold text-gray-800">{metricLabel}</h3>
          {sampleCount > 0 && (
            <span className="text-sm text-gray-400">样本量: {sampleCount}</span>
          )}
        </div>

        {/* Percentile 下拉选择器 */}
        <div className="relative min-w-[200px]">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center justify-between w-full px-4 py-2 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors"
          >
            <span>{currentOption.label}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
          {isOpen && (
            <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
              {PERCENTILE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => {
                    onPercentileChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                    percentile === opt.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 趋势图 */}
      {!hasData ? (
        <div className="flex items-center justify-center h-[400px] text-gray-400">
          暂无数据
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData}>
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
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '8px 12px',
              }}
              labelStyle={{ fontWeight: 'medium' }}
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = {
                  p50: 'p50 (中位数)',
                  p75: 'p75 (75分位)',
                  p95: 'p95 (95分位)',
                };
                return [`${value} ms`, labels[name] || name];
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value: string) => {
                const labels: Record<string, string> = {
                  p50: 'p50 (中位数)',
                  p75: 'p75 (75分位)',
                  p95: 'p95 (95分位)',
                };
                return labels[value] || value;
              }}
            />
            <Line
              type="monotone"
              dataKey="p50"
              stroke={PERCENTILE_COLORS.p50}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="p75"
              stroke={PERCENTILE_COLORS.p75}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="p95"
              stroke={PERCENTILE_COLORS.p95}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* 图例（备用，在 ResponsiveContainer 外部） */}
      {hasData && (
        <div className="flex flex-wrap justify-center gap-6 mt-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: PERCENTILE_COLORS.p50 }}></span>
            <span>p50 (中位数)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: PERCENTILE_COLORS.p75 }}></span>
            <span>p75 (75分位)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: PERCENTILE_COLORS.p95 }}></span>
            <span>p95 (95分位)</span>
          </div>
        </div>
      )}
    </div>
  );
}