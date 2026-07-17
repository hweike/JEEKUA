// components/admin/analytics/PageHeader.tsx

'use client';

import { ReactNode } from 'react';
import { DateRangePicker, DateRange } from './DateRangePicker';

interface PageHeaderProps {
  title: string;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange, startAt: number, endAt: number) => void;
  children?: ReactNode;
}

export function PageHeader({ title, dateRange, onDateRangeChange, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500 mt-0.5">数据分析与洞察</p>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <DateRangePicker value={dateRange} onChange={onDateRangeChange} />
        {children}
      </div>
    </div>
  );
}