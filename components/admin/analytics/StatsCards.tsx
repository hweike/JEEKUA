// components/admin/analytics/StatsCards.tsx

'use client';

import { Eye, Users, MousePointerClick, Clock, Repeat } from 'lucide-react';
import type { WebsiteStats } from '@/lib/umami';

interface StatsCardsProps {
  stats: WebsiteStats | null;
  loading?: boolean;
}

export function StatsCards({ stats, loading }: StatsCardsProps) {
  const cards = [
    {
      label: '访客 (UV)',
      value: stats?.visitors ?? 0,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      format: (v: number) => v.toLocaleString(),
      change: 0, // 空数据时显示0%
    },
    {
      label: '访问次数',
      value: stats?.visits ?? 0,
      icon: Repeat,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      format: (v: number) => v.toLocaleString(),
      change: 0,
    },
    {
      label: '浏览量 (PV)',
      value: stats?.pageviews ?? 0,
      icon: Eye,
      color: 'text-green-600',
      bg: 'bg-green-50',
      format: (v: number) => v.toLocaleString(),
      change: 0,
    },
    {
      label: '跳出率',
      value: stats?.bounceRate ?? 0,
      icon: MousePointerClick,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      format: (v: number) => `${(v * 100).toFixed(1)}%`,
      change: 0,
      isInverse: true, // 跳出率下降是好的
    },
    {
      label: '平均停留时长',
      value: stats?.totalTime ?? 0,
      icon: Clock,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      format: (v: number) => formatDuration(v),
      change: 0,
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="bg-white p-4 rounded-lg shadow border animate-pulse">
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        const isChangePositive = card.isInverse ? card.change <= 0 : card.change >= 0;
        const changeColor = isChangePositive ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50';
        
        return (
          <div key={index} className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
              {/* 变化率指示器（空数据时显示0%） */}
              <span className={`text-xs px-2 py-0.5 rounded-full ${changeColor}`}>
                {card.change >= 0 ? '+' : ''}{card.change}%
              </span>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-semibold text-gray-900">
                {card.format(card.value)}
              </p>
              <p className="text-sm text-gray-500">{card.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}