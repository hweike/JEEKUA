// components/admin/analytics/PerformanceMetrics.tsx

'use client';

import { cn } from '@/lib/utils';

export interface PerformanceMetric {
  key: string;
  label: string;
  unit: string;
  value: number;
  status: 'good' | 'needsImprovement' | 'poor';
}

interface PerformanceMetricsProps {
  metrics: PerformanceMetric[];
  selectedMetric: string;
  onMetricSelect: (key: string) => void;
  loading?: boolean;
}

const STATUS_CONFIG = {
  good: { label: '良好', className: 'bg-green-50 text-green-700 border-green-200' },
  needsImprovement: { label: '需改进', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  poor: { label: '较差', className: 'bg-red-50 text-red-700 border-red-200' },
};

const STATUS_DOT = {
  good: 'bg-green-500',
  needsImprovement: 'bg-yellow-500',
  poor: 'bg-red-500',
};

export function PerformanceMetrics({
  metrics,
  selectedMetric,
  onMetricSelect,
  loading,
}: PerformanceMetricsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="bg-white p-4 rounded-lg shadow border animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    );
  }

  const formatValue = (metric: PerformanceMetric) => {
    if (metric.key === 'cls') {
      return metric.value.toFixed(3);
    }
    return `${metric.value} ${metric.unit}`;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {metrics.map((metric) => {
        const isSelected = selectedMetric === metric.key;
        const statusInfo = STATUS_CONFIG[metric.status] || STATUS_CONFIG.good;
        const dotColor = STATUS_DOT[metric.status] || STATUS_DOT.good;

        return (
          <div
            key={metric.key}
            onClick={() => onMetricSelect(metric.key)}
            className={cn(
              'bg-white p-4 rounded-lg shadow border cursor-pointer transition-all hover:shadow-md',
              isSelected ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200'
            )}
          >
            <div className="flex justify-between items-start">
              <span className="text-sm font-medium text-gray-500">{metric.label}</span>
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full border flex items-center gap-1',
                statusInfo.className
              )}>
                <span className={cn('w-1.5 h-1.5 rounded-full', dotColor)}></span>
                {statusInfo.label}
              </span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-gray-900">
                {formatValue(metric)}
              </span>
            </div>
            {metric.sampleCount !== undefined && (
              <div className="mt-1 text-xs text-gray-400">
                样本量: {metric.sampleCount}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}