'use client';

import { Clock, Search, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';

export type GenerationStatus = 'pending' | 'analyzed' | 'ai_generated' | 'approved';

interface StatusBadgeProps {
  status: GenerationStatus;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

const STATUS_CONFIG: Record<
  GenerationStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  pending: {
    label: '待处理',
    color: 'bg-gray-100 text-gray-600 border-gray-200',
    icon: <Clock className="w-3 h-3" />,
  },
  analyzed: {
    label: '已分析',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: <Search className="w-3 h-3" />,
  },
  ai_generated: {
    label: 'AI已生成',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    icon: <Sparkles className="w-3 h-3" />,
  },
  approved: {
    label: '已确认',
    color: 'bg-green-100 text-green-700 border-green-200',
    icon: <CheckCircle className="w-3 h-3" />,
  },
};

export function StatusBadge({ status, size = 'md', showLabel = true }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  if (!config) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
        <AlertCircle className="w-3 h-3" />
        未知
      </span>
    );
  }

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium border ${sizeClasses[size]} ${config.color}`}
    >
      {config.icon}
      {showLabel && config.label}
    </span>
  );
}

// 获取状态标签（用于筛选下拉）
export function getStatusLabel(status: GenerationStatus | 'all'): string {
  if (status === 'all') return '全部';
  return STATUS_CONFIG[status]?.label || status;
}

// 获取所有状态选项
export const STATUS_OPTIONS: { value: GenerationStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待处理' },
  { value: 'analyzed', label: '已分析' },
  { value: 'ai_generated', label: 'AI已生成' },
  { value: 'approved', label: '已确认' },
];