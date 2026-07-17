// components/admin/analytics/RealtimeMetricsCard.tsx

'use client';

import { LucideIcon } from 'lucide-react';

interface RealtimeMetricsCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  color: string;
  bg: string;
}

export function RealtimeMetricsCard({
  icon: Icon,
  label,
  value,
  color,
  bg,
}: RealtimeMetricsCardProps) {
  return (
    <div className="bg-white p-4 rounded-lg shadow border">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${bg}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}